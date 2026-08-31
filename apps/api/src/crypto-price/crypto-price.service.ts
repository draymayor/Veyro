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

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

// Maps the symbols shown across the app (homepage carousel, /crypto rate
// browser) to CoinGecko coin ids. Mirrors the 17 Tier 1/2 coins in
// apps/api/src/crypto-addresses/coins.config.ts and lib/crypto/data.ts on
// the frontend - keep all three in sync if the supported asset list ever
// changes. One entry per SYMBOL (not per network): USDT/USDC/ETH each get
// one price regardless of which of their networks a user picks.
const ASSETS: Record<string, string> = {
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
// NOTE: verify POL/AVAX/FLR/CRO/KAIA/XDC ids against CoinGecko's
// /coins/list before relying on this in production - these newer/rebranded
// listings are the ones most likely to have shifted their id string.

const CACHE_TTL_MS = 60_000;
const HISTORY_DAYS = 7;
const HISTORY_POINTS = 48;
const REQUEST_TIMEOUT_MS = 8_000;

@Injectable()
export class CryptoPriceService {
  private readonly logger = new Logger(CryptoPriceService.name);
  private readonly apiKey?: string;
  private cache: { data: CryptoRatesMap; expiresAt: number } | null = null;
  private pending: Promise<CryptoRatesMap> | null = null;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('COINGECKO_API_KEY');
  }

  // Serves cached rates when fresh, otherwise refreshes from CoinGecko.
  // Concurrent callers during a refresh share the same in-flight request
  // instead of each firing their own CoinGecko call, keeping this well
  // under CoinGecko's rate limits regardless of how many pages/components
  // ask for rates at once.
  async getRates(): Promise<CryptoRatesMap> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.data;
    }

    if (!this.pending) {
      this.pending = this.fetchRates()
        .then((data) => {
          this.cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
          return data;
        })
        .catch((err: unknown) => {
          this.logger.error(
            'Failed to refresh crypto rates from CoinGecko',
            err instanceof Error ? err.stack : undefined,
          );
          if (this.cache) {
            return this.cache.data;
          }
          throw err;
        })
        .finally(() => {
          this.pending = null;
        });
    }

    return this.pending;
  }

  private headers(): Record<string, string> {
    return this.apiKey ? { 'x-cg-demo-api-key': this.apiKey } : {};
  }

  private async fetchRates(): Promise<CryptoRatesMap> {
    const ids = Object.values(ASSETS).join(',');
    const marketsRes = await fetchWithTimeout(
      `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h`,
      { headers: this.headers() },
      REQUEST_TIMEOUT_MS,
    );

    if (!marketsRes.ok) {
      throw new Error(`CoinGecko markets request failed: ${marketsRes.status}`);
    }

    const markets = (await marketsRes.json()) as Array<{
      id: string;
      current_price: number;
      price_change_percentage_24h: number | null;
    }>;
    const marketsById = new Map(markets.map((m) => [m.id, m]));

    const entries = await Promise.all(
      Object.entries(ASSETS).map(async ([symbol, coinId]) => {
        const market = marketsById.get(coinId);
        const history = await this.fetchHistory(coinId);
        const rate: CryptoRate = {
          priceUsd: market?.current_price ?? 0,
          change24h: market?.price_change_percentage_24h ?? 0,
          history,
        };
        return [symbol, rate] as const;
      }),
    );

    return Object.fromEntries(entries);
  }

  private async fetchHistory(coinId: string): Promise<number[]> {
    const res = await fetchWithTimeout(
      `${COINGECKO_BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${HISTORY_DAYS}`,
      { headers: this.headers() },
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
