import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fee-aware minimum sweep thresholds, sourced from platform_settings
 * (docs/planning-history.md's Sweeper section) rather than hardcoded, so an
 * admin can retune a chain's minimum without a redeploy. Values are the
 * minimum amount (in the swept symbol's own units) worth sweeping - i.e.
 * already chosen to comfortably clear that chain's typical network fee, not
 * a raw fee estimate itself.
 */
export class ThresholdService {
  private cache: Record<string, number> | null = null;

  constructor(private readonly supabase: SupabaseClient) {}

  async getThreshold(key: string): Promise<number> {
    if (!this.cache) {
      const { data, error } = await this.supabase
        .from("platform_settings")
        .select("key, value")
        .like("key", "sweep_min_threshold_%");

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
