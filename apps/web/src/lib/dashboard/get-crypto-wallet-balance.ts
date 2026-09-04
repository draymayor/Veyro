import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Real held crypto balance for one symbol (docs/database-schema.md's
 * crypto_wallets, product-rules.md rules 6a/16) - a genuinely separate
 * ledger from the fiat wallet, credited by a confirmed deposit, debited by
 * a sell conversion or a crypto withdrawal. Reads directly via RLS
 * ("crypto_wallets select own", supabase/migrations/20260827193035_crypto_wallets_and_ledger.sql).
 * Returns 0 for a user with no balance in that symbol yet, not an error.
 */
export async function getCryptoWalletBalance(
  supabase: SupabaseClient,
  userId: string,
  symbol: string,
): Promise<number> {
  const { data } = await supabase
    .from("crypto_wallets")
    .select("balance")
    .eq("user_id", userId)
    .eq("symbol", symbol)
    .maybeSingle();

  return Number(data?.balance ?? 0);
}

/** Every crypto_wallets row for this user, keyed by symbol - used by the Assets page's crypto section. */
export async function getAllCryptoWalletBalances(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ symbol: string; balance: number }[]> {
  const { data } = await supabase
    .from("crypto_wallets")
    .select("symbol, balance")
    .eq("user_id", userId)
    .gt("balance", 0)
    .order("symbol", { ascending: true });

  return ((data ?? []) as { symbol: string; balance: number }[]).map((row) => ({
    symbol: row.symbol,
    balance: Number(row.balance),
  }));
}

/**
 * Deposits that have been detected (webhook-recorded) but not yet
 * credited - crypto_deposit_events rows in 'pending_confirmation' or
 * 'crediting' (the brief atomic-claim window right before crediting, see
 * DepositConfirmationService.claimAndCredit). Summed per symbol so the
 * Assets page can show "X incoming" separate from the real, spendable
 * crypto_wallets balance above - the user can see it's on the way without
 * being able to act on it yet. Reads via the same "select own" RLS policy
 * as crypto_deposit_events generally.
 */
export async function getIncomingCryptoDeposits(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ symbol: string; amount: number }[]> {
  const { data } = await supabase
    .from("crypto_deposit_events")
    .select("symbol, amount")
    .eq("user_id", userId)
    .in("status", ["pending_confirmation", "crediting"]);

  const totals = new Map<string, number>();
  for (const row of (data ?? []) as { symbol: string; amount: number }[]) {
    totals.set(row.symbol, (totals.get(row.symbol) ?? 0) + Number(row.amount));
  }

  return Array.from(totals.entries()).map(([symbol, amount]) => ({
    symbol,
    amount,
  }));
}
