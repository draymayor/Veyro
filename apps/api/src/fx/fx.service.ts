import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithTimeout } from '../common/fetch-with-timeout';

export type FxRatesMap = Record<string, number>;

const FREECURRENCYAPI_URL = 'https://api.freecurrencyapi.com/v1/latest';
const CURRENCYFREAKS_URL = 'https://api.currencyfreaks.com/v2.0/rates/latest';

// FX rates move far slower than crypto prices, no need for CoinGecko's
// 60 second cache window here. 4 hours sits in the middle of the 3-6 hour
// range this data is allowed to go stale for.
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8_000;

@Injectable()
export class FxRateService {
  private readonly logger = new Logger(FxRateService.name);
  private cache: { data: FxRatesMap; expiresAt: number } | null = null;
  private pending: Promise<FxRatesMap> | null = null;
  private fallbackCache: { data: FxRatesMap; expiresAt: number } | null = null;
  private fallbackPending: Promise<FxRatesMap> | null = null;
  private consecutiveFailures = 0;

  constructor(private readonly configService: ConfigService) {}

  /** USD-based rate for one currency (units of `currency` per 1 USD). */
  async getRate(currency: string): Promise<number> {
    const code = currency.toUpperCase();
    if (code === 'USD') return 1;

    const rates = await this.getUsdRates();
    if (rates[code] !== undefined) return rates[code];

    // The primary request can succeed while its plan simply omits a
    // currency instead of erroring (freecurrencyapi's free tier does this
    // for NGN, for example), which looks like success but leaves that one
    // currency unconvertable. Treat a missing currency the same as a
    // primary failure and consult the fallback provider for it
    // specifically, rather than only falling back on an outright request
    // failure.
    this.logger.warn(
      `Primary FX data has no rate for "${code}", falling back to CurrencyFreaks for it.`,
    );

    const fallbackRates = await this.getFallbackUsdRates();
    const fallbackRate = fallbackRates[code];
    if (fallbackRate === undefined) {
      throw new Error(
        `No FX rate available for currency "${code}" from either provider`,
      );
    }

    // Fold the top-up into the main cache so this currency doesn't need a
    // fallback round trip again until the cache expires.
    if (this.cache) {
      this.cache.data[code] = fallbackRate;
    }
    return fallbackRate;
  }

  async getUsdRates(): Promise<FxRatesMap> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.data;
    }

    if (!this.pending) {
      this.pending = this.refresh().finally(() => {
        this.pending = null;
      });
    }

    return this.pending;
  }

  // Primary first, automatic fallback to CurrencyFreaks on any primary
  // failure (bad response, network error, exhausted quota). If both fail,
  // serve the last successfully cached rates rather than blocking the
  // request, logging clearly (and more loudly on repeat failures, since
  // one failed refresh is unremarkable but several in a row means a
  // provider is actually down or a key has stopped working).
  private async refresh(): Promise<FxRatesMap> {
    try {
      const data = await this.fetchFromPrimary();
      this.onRefreshSucceeded(data);
      return data;
    } catch (primaryErr) {
      this.logger.warn(
        `freecurrencyapi request failed, falling back to CurrencyFreaks: ${errorMessage(primaryErr)}`,
      );

      try {
        const data = await this.getFallbackUsdRates();
        this.onRefreshSucceeded(data);
        return data;
      } catch (fallbackErr) {
        this.consecutiveFailures += 1;
        const summary = `Both FX providers failed (freecurrencyapi and CurrencyFreaks); consecutive failures: ${this.consecutiveFailures}`;

        if (this.consecutiveFailures > 1) {
          this.logger.error(
            `${summary}. This is a repeated failure, check provider status and API key/quota.`,
          );
        } else {
          this.logger.error(summary, errorStack(fallbackErr));
        }

        if (this.cache) {
          this.logger.warn(
            'Serving the last successfully cached FX rates while both providers are down.',
          );
          return this.cache.data;
        }

        throw fallbackErr instanceof Error
          ? fallbackErr
          : new Error(errorMessage(fallbackErr));
      }
    }
  }

  private onRefreshSucceeded(data: FxRatesMap) {
    this.consecutiveFailures = 0;
    this.cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  }

  // Cached separately from the primary/main cache, since this can be
  // populated either by a full primary-failure fallback (refresh()) or by
  // a per-currency top-up (getRate()), and either path should reuse the
  // same in-flight request instead of hitting CurrencyFreaks twice.
  private async getFallbackUsdRates(): Promise<FxRatesMap> {
    if (this.fallbackCache && this.fallbackCache.expiresAt > Date.now()) {
      return this.fallbackCache.data;
    }

    if (!this.fallbackPending) {
      this.fallbackPending = this.fetchFromFallback()
        .then((data) => {
          this.fallbackCache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
          return data;
        })
        .finally(() => {
          this.fallbackPending = null;
        });
    }

    return this.fallbackPending;
  }

  private async fetchFromPrimary(): Promise<FxRatesMap> {
    const apiKey = this.configService.getOrThrow<string>('FCA_API_KEY');
    // A timeout here throws the same as any other network failure, which
    // refresh()'s try/catch already treats identically to a bad response -
    // so a timeout falls through to the CurrencyFreaks fallback exactly
    // like an HTTP error does, not just outright network errors.
    const res = await fetchWithTimeout(
      `${FREECURRENCYAPI_URL}?apikey=${apiKey}`,
      {},
      REQUEST_TIMEOUT_MS,
    );
    if (!res.ok) {
      throw new Error(`freecurrencyapi request failed: ${res.status}`);
    }

    const body = (await res.json()) as { data?: Record<string, number> };
    if (!body.data) {
      throw new Error('freecurrencyapi response missing "data"');
    }

    return { ...body.data, USD: 1 };
  }

  private async fetchFromFallback(): Promise<FxRatesMap> {
    const apiKey = this.configService.getOrThrow<string>(
      'CURRENCYFREAKS_API_KEY',
    );
    const res = await fetchWithTimeout(
      `${CURRENCYFREAKS_URL}?apikey=${apiKey}`,
      {},
      REQUEST_TIMEOUT_MS,
    );
    if (!res.ok) {
      throw new Error(`CurrencyFreaks request failed: ${res.status}`);
    }

    const body = (await res.json()) as { rates?: Record<string, string> };
    if (!body.rates) {
      throw new Error('CurrencyFreaks response missing "rates"');
    }

    const data: FxRatesMap = { USD: 1 };
    for (const [code, value] of Object.entries(body.rates)) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) data[code] = parsed;
    }
    return data;
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function errorStack(err: unknown): string | undefined {
  return err instanceof Error ? err.stack : undefined;
}
