export type WalletTransactionType = "credit" | "debit";
export type AdminTransactionSource =
  | "trade"
  | "withdrawal"
  | "manual_deposit"
  | "crypto_deposit"
  | "admin_adjustment";

export interface AdminTransactionListItem {
  id: string;
  created_at: string;
  user_id: string;
  user_display_name: string | null;
  user_email: string | null;
  ledger: "fiat" | "crypto";
  currency: string | null;
  crypto_symbol: string | null;
  type: WalletTransactionType;
  amount: number;
  balance_after: number;
  source: AdminTransactionSource;
  trade_id: string | null;
  trade_asset_type: string | null;
  trade_status: string | null;
  withdrawal_id: string | null;
  withdrawal_method: string | null;
  withdrawal_status: string | null;
  manual_deposit_reason: string | null;
}
