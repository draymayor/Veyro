import type { SupabaseClient } from "@supabase/supabase-js";

export interface ScoutWithdrawalLockInfo {
  lockedAmount: number;
  approvedDays: number;
  requiredDays: number;
}

/**
 * Mirrors ScoutService.getWithdrawalLock on the API side exactly (same
 * "floor" mechanic, see docs/database-schema.md's Careers / Scout program
 * section): the amount of the current balance that must stay in the
 * wallet until 30 approved scout days exist is the sum of
 * wallet_transactions.amount for every approved day's linked
 * wallet_transaction_id, capped implicitly by the caller subtracting it
 * from the real balance. This is a DISPLAY-ONLY read (RLS scopes
 * scout_days/wallet_transactions to the user's own rows) - the real
 * enforcement is server-side in WithdrawalsService.create, this only
 * powers the proactive "your earnings are locked" message before submit.
 */
export async function getScoutWithdrawalLock(
  supabase: SupabaseClient,
  userId: string,
): Promise<ScoutWithdrawalLockInfo | null> {
  const { data: setting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "scout_required_paid_days")
    .maybeSingle();
  const requiredDays = Number(setting?.value ?? 30) || 30;

  const { data: approvedRows } = await supabase
    .from("scout_days")
    .select("wallet_transaction_id")
    .eq("user_id", userId)
    .eq("status", "approved");

  const approvedDays = approvedRows?.length ?? 0;
  if (approvedDays >= requiredDays) return null;

  const walletTransactionIds = (approvedRows ?? [])
    .map((row) => row.wallet_transaction_id as string | null)
    .filter((id): id is string => !!id);
  if (walletTransactionIds.length === 0) return null;

  const { data: ledgerRows } = await supabase
    .from("wallet_transactions")
    .select("amount")
    .in("id", walletTransactionIds);

  const lockedAmount = (ledgerRows ?? []).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );
  if (lockedAmount <= 0) return null;

  return { lockedAmount, approvedDays, requiredDays };
}
