export type WithdrawalMethod = "bank_transfer" | "paypal" | "crypto";

export type AdminWithdrawalStatus =
  "requested" | "processing" | "paid" | "failed";

export interface AdminWithdrawalListItem {
  id: string;
  user_id: string;
  user_display_name: string | null;
  user_withdrawals_suspended: boolean;
  amount: number;
  currency: string | null;
  method: WithdrawalMethod;
  status: AdminWithdrawalStatus;
  bank_details: Record<string, string | undefined> | null;
  paypal_email: string | null;
  crypto_asset_symbol: string | null;
  crypto_asset_network: string | null;
  crypto_payout_address: string | null;
  transaction_reference: string | null;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
}
