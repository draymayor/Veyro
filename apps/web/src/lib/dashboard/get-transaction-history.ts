import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TransactionHistoryItem,
  TradeHistoryItem,
  WithdrawalHistoryItem,
  AdjustmentHistoryItem,
  CryptoWalletHistoryItem,
} from "./transaction-history";
import type { TradeStatus, WithdrawalStatus } from "./trade-status";

function withdrawalMethodLabel(method: string): string {
  if (method === "bank_transfer") return "Bank Transfer";
  if (method === "paypal") return "PayPal";
  return "Crypto Withdrawal";
}

function tradeLabel(
  assetType: string,
  brandName: string | null,
  cryptoSymbol: string | null,
  cryptoNetwork: string | null,
): string {
  if (assetType === "gift_card") return brandName ?? "Gift Card";
  return cryptoNetwork
    ? `${cryptoSymbol ?? "Crypto"} (${cryptoNetwork})`
    : (cryptoSymbol ?? "Crypto");
}

/**
 * Real replacement for the TRANSACTION_HISTORY placeholder: a merged,
 * chronological view of this user's own trades and withdrawals, read
 * directly via RLS ("trades select own", "withdrawals select own",
 * supabase/migrations/20260812233403_rls_policies.sql). withdrawals has no
 * currency column of its own (docs/database-schema.md) - a withdrawal is
 * always denominated in the caller's own wallet currency, passed in here
 * rather than re-derived per row.
 */
export async function getTransactionHistory(
  supabase: SupabaseClient,
  userId: string,
  walletCurrency: string,
): Promise<TransactionHistoryItem[]> {
  const [tradesRes, withdrawalsRes, adjustmentsRes, cryptoWalletRes] =
    await Promise.all([
      supabase
        .from("trades")
        .select(
          "id, asset_type, status, quoted_payout, currency, created_at, gift_card_brands(name), crypto_assets(symbol, network)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("withdrawals")
        .select("id, amount, method, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      // Standalone wallet_transactions rows (trade_id and withdrawal_id both
      // null) - currently only admin manual FIAT deposits/corrections
      // (AdminDepositsService.execute), which never create a trades or
      // withdrawals row at all, so without this they never appeared here.
      supabase
        .from("wallet_transactions")
        .select(
          "id, type, amount, created_at, wallets!inner(user_id, currency)",
        )
        .eq("wallets.user_id", userId)
        .is("trade_id", null)
        .is("withdrawal_id", null)
        .order("created_at", { ascending: false }),
      // Real held crypto balance activity (docs/database-schema.md's
      // crypto_wallet_transactions, product-rules.md rules 6a/16): deposits,
      // instant sell conversions, withdrawals, and admin corrections, all
      // against the crypto_wallets balance rather than the fiat wallet.
      supabase
        .from("crypto_wallet_transactions")
        .select("id, symbol, type, amount, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

  const trades: TradeHistoryItem[] = (
    (tradesRes.data ?? []) as Record<string, unknown>[]
  ).map((row) => {
    const brand = row.gift_card_brands as { name: string } | null;
    const asset = row.crypto_assets as {
      symbol: string;
      network: string;
    } | null;
    const assetType = row.asset_type as "gift_card" | "crypto";
    return {
      kind: "trade",
      id: row.id as string,
      assetType,
      label: tradeLabel(
        assetType,
        brand?.name ?? null,
        asset?.symbol ?? null,
        asset?.network ?? null,
      ),
      amount: Number(row.quoted_payout),
      currency: row.currency as string,
      status: row.status as TradeStatus,
      createdAt: row.created_at as string,
    };
  });

  const withdrawals: WithdrawalHistoryItem[] = (
    (withdrawalsRes.data ?? []) as Record<string, unknown>[]
  ).map((row) => {
    const method = row.method as "bank_transfer" | "paypal" | "crypto";
    return {
      kind: "withdrawal",
      id: row.id as string,
      method,
      label: withdrawalMethodLabel(method),
      amount: Number(row.amount),
      currency: walletCurrency,
      status: row.status as WithdrawalStatus,
      createdAt: row.created_at as string,
    };
  });

  const adjustments: AdjustmentHistoryItem[] = (
    (adjustmentsRes.data ?? []) as unknown as Record<string, unknown>[]
  ).map((row) => {
    const type = row.type as "credit" | "debit";
    const wallet = row.wallets as unknown as { currency: string };
    return {
      kind: "adjustment",
      id: row.id as string,
      type,
      label: type === "credit" ? "Wallet Credit" : "Wallet Debit",
      amount: Number(row.amount),
      currency: wallet.currency,
      createdAt: row.created_at as string,
    };
  });

  const cryptoWalletLabels: Record<string, string> = {
    deposit: "Crypto Deposit",
    sell_conversion_debit: "Sell Crypto",
    withdrawal: "Crypto Withdrawal",
    admin_credit: "Crypto Credit",
    admin_debit: "Crypto Debit",
  };

  const cryptoTransactions: CryptoWalletHistoryItem[] = (
    (cryptoWalletRes.data ?? []) as Record<string, unknown>[]
  ).map((row) => {
    const type = row.type as CryptoWalletHistoryItem["type"];
    const symbol = row.symbol as string;
    return {
      kind: "crypto",
      id: row.id as string,
      type,
      label: cryptoWalletLabels[type] ?? "Crypto Activity",
      amount: Number(row.amount),
      currency: symbol,
      createdAt: row.created_at as string,
    };
  });

  return [
    ...trades,
    ...withdrawals,
    ...adjustments,
    ...cryptoTransactions,
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
