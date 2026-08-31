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
