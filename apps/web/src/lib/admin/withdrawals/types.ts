export type WithdrawalMethod = "bank_transfer" | "paypal" | "crypto";

export type AdminWithdrawalStatus =
  "requested" | "processing" | "paid" | "failed";

// Only meaningful for method="crypto" withdrawals that have reached
// status="processing" (docs/database-schema.md's Withdrawal signing mode
// section). null otherwise.
export type CryptoSigningStatus = "awaiting_approval" | "ready_to_sign" | null;

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
  crypto_signing_status: CryptoSigningStatus;
  transaction_reference: string | null;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
}
