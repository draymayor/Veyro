import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Admin-tunable minimum crypto withdrawal amount for one asset symbol, from
 * platform_settings key `withdrawal_min_<symbol>` (lowercase) - same
 * pattern as the sweeper's sweep_min_threshold_* keys
 * (apps/sweeper/src/thresholds.ts), see
 * supabase/migrations/20260923210246_withdrawal_min_thresholds.sql. This is
 * a DISPLAY-ONLY read (surfaces the requirement before submit) - the real
 * enforcement is server-side in WithdrawalsService.create. Falls back to 0
 * (no minimum) if the setting row is missing, rather than blocking
 * withdrawal of an asset an admin hasn't configured yet.
 */
export async function getCryptoWithdrawalMinimum(
  supabase: SupabaseClient,
  symbol: string,
): Promise<number> {
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", `withdrawal_min_${symbol.toLowerCase()}`)
    .maybeSingle();

  return Number(data?.value ?? 0) || 0;
}
