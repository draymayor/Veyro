import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sweep-worthiness settings, sourced from platform_settings
 * (docs/planning-history.md's Sweeper section) rather than hardcoded, so an
 * admin can retune a chain's minimum without a redeploy. Two key families,
 * distinguished by prefix:
 *  - `sweep_min_threshold_*` - a static minimum amount (in the swept
 *    symbol's own units) worth sweeping, for chains/symbols whose fee is
 *    denominated in that same symbol and doesn't swing wildly enough to
 *    need live pricing (BTC, LTC, DOGE, native EVM coins, TRX, TRC20 USDT).
 *  - `sweep_fee_multiple_*` - a multiplier ("sweep only if the deposit
 *    exceeds N times the current live-estimated network fee") for symbols
 *    where a fixed amount would go stale, e.g. ERC20 stablecoins: the token
 *    balance is ~1 USD/unit but gas is paid in the chain's native currency,
 *    so only a fee-relative rule stays correct as gas prices move. Applied
 *    live inside the relevant ChainAdapter (see EvmAdapter.sweepToken),
 *    not as a pre-filter here.
 */
export class ThresholdService {
  private cache: Record<string, number> | null = null;

  constructor(private readonly supabase: SupabaseClient) {}

  async getThreshold(key: string): Promise<number> {
    if (!this.cache) {
      const { data, error } = await this.supabase
        .from("platform_settings")
        .select("key, value")
        .like("key", "sweep_%");

      if (error) {
        throw new Error(`Failed to load sweep thresholds: ${error.message}`);
      }

      this.cache = Object.fromEntries(
        (data ?? []).map((row) => [row.key as string, Number(row.value)]),
      );
    }

    const value = this.cache[key];
    if (value === undefined) {
      throw new Error(`Missing platform_settings threshold for key "${key}"`);
    }
    return value;
  }
}
