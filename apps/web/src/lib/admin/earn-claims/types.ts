export type AdminEarnClaimStatus = "claimed" | "unlocked" | "paid" | "expired";

export interface AdminEarnClaimListItem {
  id: string;
  user_id: string;
  user_display_name: string | null;
  bonus_amount_usd: number;
  required_trade_volume_usd: number;
  status: AdminEarnClaimStatus;
  claimed_at: string;
  expires_at: string;
  unlocked_at: string | null;
  paid_at: string | null;
  wallet_transaction_id: string | null;
}
