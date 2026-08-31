import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Real replacement for the WALLET_SNAPSHOT.balance placeholder. Reads the
 * user's own wallets row directly (RLS: "wallets select own",
 * supabase/migrations/20260812233403_rls_policies.sql), the cached balance
 * that's reconciled from wallet_transactions on every credit/debit
 * (docs/database-schema.md). Returns 0 for a user with no wallet row yet
 * (nothing credited or debited so far), not an error.
 */
export async function getWalletBalance(
  supabase: SupabaseClient,
  userId: string,
  currency: string,
): Promise<number> {
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", userId)
    .eq("currency", currency)
    .maybeSingle();

  return Number(wallet?.balance ?? 0);
}
