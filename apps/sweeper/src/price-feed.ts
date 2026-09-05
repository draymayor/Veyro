const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const CACHE_TTL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 8_000;

// Only the native gas symbols a fee-multiple threshold (see thresholds.ts)
// actually needs priced - not the full coin list apps/api's
// CryptoPriceService covers, since this feed exists solely to convert a
// live EVM gas-fee estimate (paid in native currency) into USD so it can
// be compared against an ERC20 stablecoin balance. Deliberately not shared
// with that service: apps/sweeper never imports from apps/api (coins.ts).
const NATIVE_SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  ETH: "ethereum",
  BNB: "binancecoin",
};

/**
 * Minimal, sweeper-local CoinGecko USD price lookup with a short-lived
 * shared cache - concurrent callers during a refresh get the same in-flight
 * request rather than each firing their own CoinGecko call. On a refresh
 * failure, serves the last known price rather than throwing, so a
 * transient CoinGecko outage degrades to "use yesterday's price" instead
 * of failing every EVM token sweep in the run.
 */
export class PriceFeed {
  private cache: { data: Record<string, number>; expiresAt: number } | null =
    null;
  private pending: Promise<Record<string, number>> | null = null;

  constructor(private readonly apiKey?: string) {}

  async getUsdPrice(nativeSymbol: string): Promise<number> {
    const coinId = NATIVE_SYMBOL_TO_COINGECKO_ID[nativeSymbol];
    if (!coinId) {
      throw new Error(
        `No CoinGecko id mapped for native symbol "${nativeSymbol}"`,
      );
    }

    const prices = await this.getPrices();
    const price = prices[coinId];
    if (price === undefined) {
      throw new Error(`CoinGecko returned no USD price for "${coinId}"`);
    }
    return price;
  }

  private async getPrices(): Promise<Record<string, number>> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.data;
    }

    if (!this.pending) {
      this.pending = this.fetchPrices()
        .then((data) => {
          this.cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
          return data;
        })
        .catch((err: unknown) => {
          console.error(
            "[sweeper] failed to refresh native-coin prices from CoinGecko:",
            err,
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

  private async fetchPrices(): Promise<Record<string, number>> {
    const ids = Object.values(NATIVE_SYMBOL_TO_COINGECKO_ID).join(",");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(
        `${COINGECKO_BASE_URL}/simple/price?ids=${ids}&vs_currencies=usd`,
        {
          headers: this.apiKey ? { "x-cg-demo-api-key": this.apiKey } : {},
          signal: controller.signal,
        },
      );

      if (!res.ok) {
        throw new Error(`CoinGecko simple/price request failed: ${res.status}`);
      }

      const body = (await res.json()) as Record<string, { usd: number }>;
      return Object.fromEntries(
        Object.entries(body).map(([id, { usd }]) => [id, usd]),
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
