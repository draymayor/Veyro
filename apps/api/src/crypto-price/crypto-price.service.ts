import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithTimeout } from '../common/fetch-with-timeout';

export interface CryptoRate {
  priceUsd: number;
  change24h: number;
  /** Price points over the last 7 days, chronological, downsampled for a sparkline. */
  history: number[];
}

type CryptoRatesMap = Record<string, CryptoRate>;

interface SpotPrice {
  priceUsd: number;
  change24h: number;
}

type SpotPricesMap = Record<string, SpotPrice>;

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const COINPAPRIKA_BASE_URL = 'https://api.coinpaprika.com/v1';
const COINMARKETCAP_BASE_URL = 'https://pro-api.coinmarketcap.com/v1';

// The 17 Tier 1/2 symbols Veyro prices (docs/planning-history.md's Sweeper
// section) - mirrors apps/api/src/crypto-addresses/coins.config.ts. Priced
// regardless of crypto_assets.is_active: a deactivated coin/network can
// still leave a user holding a real balance (deposits made before
// deactivation aren't clawed back), and admin's wallet-balance-to-USD views
// (AdminDashboardService) still need a live price for it.
const SYMBOLS = [
  'BTC',
  'ETH',
  'USDT',
  'BNB',
  'DOGE',
  'POL',
  'AVAX',
  'CELO',
  'FLR',
  'FTM',
  'CRO',
  'ETC',
  'KAIA',
  'XDC',
  'LTC',
  'USDC',
  'TRX',
] as const;

// Primary provider: CoinGecko coin ids.
// NOTE: verify POL/AVAX/FLR/CRO/KAIA/XDC ids against CoinGecko's
// /coins/list before relying on this in production - these newer/rebranded
// listings are the ones most likely to have shifted their id string.
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  BNB: 'binancecoin',
  DOGE: 'dogecoin',
  POL: 'polygon-ecosystem-token',
  AVAX: 'avalanche-2',
  CELO: 'celo',
  FLR: 'flare-networks',
  FTM: 'fantom',
  CRO: 'crypto-com-chain',
  ETC: 'ethereum-classic',
  KAIA: 'kaia',
  XDC: 'xdce-crowd-sale',
  LTC: 'litecoin',
  USDC: 'usd-coin',
  TRX: 'tron',
};

// First fallback: CoinPaprika coin ids. Confirmed live against
// GET /v1/tickers?quotes=USD (2026-09-08) - every id below is the real
// `id` field CoinPaprika returned for that ticker symbol at the time, not
// guessed. CoinPaprika's free tier needs no API key at all for this
// endpoint (also confirmed live) and explicitly permits commercial use,
// which is why it's the first fallback rather than CoinMarketCap.
const COINPAPRIKA_IDS: Record<string, string> = {
  BTC: 'btc-bitcoin',
  ETH: 'eth-ethereum',
  USDT: 'usdt-tether',
  BNB: 'bnb-binance-coin',
  DOGE: 'doge-dogecoin',
  POL: 'pol-polygon-ecosystem-token',
  AVAX: 'avax-avalanche',
  CELO: 'celo-celo',
  // Two live tickers share the FLR symbol on CoinPaprika: flr-flare-network
  // (rank 105) and flr-flare (rank 252). Picked the higher-ranked/larger-
  // market-cap one; re-verify if Flare's price from this provider ever
  // looks visibly wrong.
  FLR: 'flr-flare-network',
  FTM: 'ftm-fantom',
  CRO: 'cro-cryptocom-chain',
  ETC: 'etc-ethereum-classic',
  KAIA: 'kaia-kaia',
  XDC: 'xdc-xdc-network',
  LTC: 'ltc-litecoin',
  USDC: 'usdc-usd-coin',
  TRX: 'trx-tron',
};

// Last-resort fallback: CoinMarketCap. Queried by ticker symbol directly
// (confirmed live, 2026-09-08: their quotes/latest endpoint resolves
// SYMBOLS to the right coin - e.g. FLR correctly resolves to Flare, not a
// different coin sharing that ticker), so no separate id map is needed
// here the way CoinGecko/CoinPaprika each require one. Requires
// COINMARKETCAP_API_KEY (their API has no keyless tier); only reached if
// both CoinGecko and CoinPaprika have already failed.
const CACHE_TTL_MS = 60_000;
// History (7-day sparkline) is cached far longer and fully decoupled from
// the 60s price cache above - this is the real fix for the "one price
// refresh secretly costs 18 CoinGecko calls" bug (fetchHistory used to run
// inside the same 60s cycle as the price fetch, once per asset, uncached
// on its own). A 7-day chart doesn't meaningfully change minute to minute,
// so an hourly cache is more than fresh enough.
const HISTORY_CACHE_TTL_MS = 60 * 60_000;
const HISTORY_DAYS = 7;
const HISTORY_POINTS = 48;
const REQUEST_TIMEOUT_MS = 8_000;

@Injectable()
export class CryptoPriceService {
  private readonly logger = new Logger(CryptoPriceService.name);
  private readonly coingeckoApiKey?: string;
  private readonly coinpaprikaApiKey?: string;
  private readonly coinmarketcapApiKey?: string;

  private priceCache: { data: SpotPricesMap; expiresAt: number } | null = null;
  private pricePending: Promise<SpotPricesMap> | null = null;

  // One cache entry per CoinGecko coin id, each with its own TTL/in-flight
  // guard - a stale/missing entry for one coin never blocks or invalidates
  // another's.
  private readonly historyCache = new Map<
    string,
    { data: number[]; expiresAt: number }
  >();
  private readonly historyPending = new Map<string, Promise<number[]>>();

  constructor(private readonly configService: ConfigService) {
    this.coingeckoApiKey = this.configService.get<string>('COINGECKO_API_KEY');
    this.coinpaprikaApiKey = this.configService.get<string>(
      'COINPAPRIKA_API_KEY',
    );
    this.coinmarketcapApiKey = this.configService.get<string>(
      'COINMARKETCAP_API_KEY',
    );
  }

  // Serves cached rates when fresh, otherwise refreshes. Concurrent callers
  // during a refresh share the same in-flight request instead of each
  // firing their own provider call.
  async getRates(): Promise<CryptoRatesMap> {
    const [prices, historyBySymbol] = await Promise.all([
      this.getSpotPrices(),
      this.getAllHistory(),
    ]);

    const entries = SYMBOLS.map((symbol) => {
      const rate: CryptoRate = {
        priceUsd: prices[symbol]?.priceUsd ?? 0,
        change24h: prices[symbol]?.change24h ?? 0,
        history: historyBySymbol[symbol] ?? [],
      };
      return [symbol, rate] as const;
    });

    return Object.fromEntries(entries);
  }

  private async getSpotPrices(): Promise<SpotPricesMap> {
    if (this.priceCache && this.priceCache.expiresAt > Date.now()) {
      return this.priceCache.data;
    }

    if (!this.pricePending) {
      this.pricePending = this.fetchSpotPricesWithFallback()
        .then((data) => {
          this.priceCache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
          return data;
        })
        .catch((err: unknown) => {
          this.logger.error(
            'All crypto price providers failed (CoinGecko, CoinPaprika, CoinMarketCap)',
            err instanceof Error ? err.stack : undefined,
          );
          if (this.priceCache) {
            return this.priceCache.data;
          }
          throw err;
        })
        .finally(() => {
          this.pricePending = null;
        });
    }

    return this.pricePending;
  }

  // Primary-then-fallback chain, not a rotation: CoinGecko is tried first
  // on every single refresh (it's already proven, and stays primary), and
  // the next provider is only reached when the current one genuinely fails
  // - a thrown network/timeout error or a non-2xx response (429/quota-
  // exhausted included, since fetchCoinGeckoPrices throws on any !res.ok).
  private async fetchSpotPricesWithFallback(): Promise<SpotPricesMap> {
    const providers: Array<[string, () => Promise<SpotPricesMap>]> = [
      ['CoinGecko', () => this.fetchCoinGeckoPrices()],
      ['CoinPaprika', () => this.fetchCoinPaprikaPrices()],
      ['CoinMarketCap', () => this.fetchCoinMarketCapPrices()],
    ];

    let lastErr: unknown;
    for (const [name, fetchPrices] of providers) {
      try {
        const prices = await fetchPrices();
        if (name !== 'CoinGecko') {
          this.logger.warn(
            `Served crypto rates from fallback provider ${name} (CoinGecko unavailable)`,
          );
        }
        return prices;
      } catch (err) {
        lastErr = err;
        this.logger.warn(
          `${name} price fetch failed, trying next provider: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    throw lastErr instanceof Error
      ? lastErr
      : new Error('All crypto price providers failed');
  }

  private async fetchCoinGeckoPrices(): Promise<SpotPricesMap> {
    const ids = Object.values(COINGECKO_IDS).join(',');
    const res = await fetchWithTimeout(
      `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h`,
      {
        headers: this.coingeckoApiKey
          ? { 'x-cg-demo-api-key': this.coingeckoApiKey }
          : {},
      },
      REQUEST_TIMEOUT_MS,
    );

    if (!res.ok) {
      throw new Error(`CoinGecko markets request failed: ${res.status}`);
    }

    const markets = (await res.json()) as Array<{
      id: string;
      current_price: number;
      price_change_percentage_24h: number | null;
    }>;
    const marketsById = new Map(markets.map((m) => [m.id, m]));

    const result: SpotPricesMap = {};
    for (const [symbol, coinId] of Object.entries(COINGECKO_IDS)) {
      const market = marketsById.get(coinId);
      result[symbol] = {
        priceUsd: market?.current_price ?? 0,
        change24h: market?.price_change_percentage_24h ?? 0,
      };
    }
    return result;
  }

  private async fetchCoinPaprikaPrices(): Promise<SpotPricesMap> {
    const res = await fetchWithTimeout(
      `${COINPAPRIKA_BASE_URL}/tickers?quotes=USD`,
      {
        headers: this.coinpaprikaApiKey
          ? { Authorization: this.coinpaprikaApiKey }
          : {},
      },
      REQUEST_TIMEOUT_MS,
    );

    if (!res.ok) {
      throw new Error(`CoinPaprika tickers request failed: ${res.status}`);
    }

    const tickers = (await res.json()) as Array<{
      id: string;
      quotes?: { USD?: { price: number; percent_change_24h: number } };
    }>;
    const tickersById = new Map(tickers.map((t) => [t.id, t]));

    const result: SpotPricesMap = {};
    for (const [symbol, coinId] of Object.entries(COINPAPRIKA_IDS)) {
      const usd = tickersById.get(coinId)?.quotes?.USD;
      result[symbol] = {
        priceUsd: usd?.price ?? 0,
        change24h: usd?.percent_change_24h ?? 0,
      };
    }
    return result;
  }

  private async fetchCoinMarketCapPrices(): Promise<SpotPricesMap> {
    if (!this.coinmarketcapApiKey) {
      throw new Error('COINMARKETCAP_API_KEY is not configured');
    }

    const res = await fetchWithTimeout(
      `${COINMARKETCAP_BASE_URL}/cryptocurrency/quotes/latest?symbol=${SYMBOLS.join(',')}`,
      { headers: { 'X-CMC_PRO_API_KEY': this.coinmarketcapApiKey } },
      REQUEST_TIMEOUT_MS,
    );

    if (!res.ok) {
      throw new Error(`CoinMarketCap quotes request failed: ${res.status}`);
    }

    type CmcQuote = {
      quote?: {
        USD?: { price: number | null; percent_change_24h: number | null };
      };
    };
    const body = (await res.json()) as {
      data?: Record<string, CmcQuote | CmcQuote[]>;
    };

    const result: SpotPricesMap = {};
    for (const symbol of SYMBOLS) {
      const entry = body.data?.[symbol];
      // CMC's quotes/latest can return either one object or an array per
      // symbol depending on whether multiple coins share that ticker -
      // confirmed live all 17 of ours resolve to a single object, but
      // handling the array shape defensively costs nothing.
      const single = Array.isArray(entry) ? entry[0] : entry;
      const usd = single?.quote?.USD;
      result[symbol] = {
        priceUsd: usd?.price ?? 0,
        change24h: usd?.percent_change_24h ?? 0,
      };
    }
    return result;
  }

  // History stays CoinGecko-only - CoinPaprika/CoinMarketCap fallback only
  // covers spot price. A history fetch failure (including CoinGecko being
  // down) just serves the last cached sparkline, or an empty one if none
  // has ever succeeded yet, rather than blocking price refresh or
  // escalating to another provider for it.
  private async getAllHistory(): Promise<Record<string, number[]>> {
    const entries = await Promise.all(
      Object.entries(COINGECKO_IDS).map(
        async ([symbol, coinId]) =>
          [symbol, await this.getHistoryFor(coinId)] as const,
      ),
    );
    return Object.fromEntries(entries);
  }

  private async getHistoryFor(coinId: string): Promise<number[]> {
    const cached = this.historyCache.get(coinId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    let pending = this.historyPending.get(coinId);
    if (!pending) {
      pending = this.fetchHistory(coinId)
        .then((data) => {
          this.historyCache.set(coinId, {
            data,
            expiresAt: Date.now() + HISTORY_CACHE_TTL_MS,
          });
          return data;
        })
        .catch((err: unknown) => {
          this.logger.warn(
            `Failed to refresh ${coinId} history from CoinGecko: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
          return cached?.data ?? [];
        })
        .finally(() => {
          this.historyPending.delete(coinId);
        });
      this.historyPending.set(coinId, pending);
    }

    return pending;
  }

  private async fetchHistory(coinId: string): Promise<number[]> {
    const res = await fetchWithTimeout(
      `${COINGECKO_BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${HISTORY_DAYS}`,
      {
        headers: this.coingeckoApiKey
          ? { 'x-cg-demo-api-key': this.coingeckoApiKey }
          : {},
      },
      REQUEST_TIMEOUT_MS,
    );

    if (!res.ok) {
      throw new Error(
        `CoinGecko market_chart request failed for ${coinId}: ${res.status}`,
      );
    }

    const data = (await res.json()) as { prices: [number, number][] };
    return downsample(
      data.prices.map(([, price]) => price),
      HISTORY_POINTS,
    );
  }
}

function downsample(values: number[], targetLength: number): number[] {
  if (values.length <= targetLength) return values;
  const step = values.length / targetLength;
  const result: number[] = [];
  for (let i = 0; i < targetLength; i++) {
    result.push(values[Math.floor(i * step)]);
  }
  return result;
}
