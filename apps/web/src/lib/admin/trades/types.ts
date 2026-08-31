export type TradeAssetType = "gift_card" | "crypto";

export type AdminTradeStatus =
  | "submitted"
  | "under_review"
  | "awaiting_deposit_confirmation"
  | "approved"
  | "rejected"
  | "paid"
  | "disputed"
  | "cancelled";

export interface AdminTradeListItem {
  id: string;
  user_id: string;
  user_display_name: string | null;
  asset_type: TradeAssetType;
  status: AdminTradeStatus;
  card_type: "physical" | "e-code" | null;
  card_country: string | null;
  gift_card_brand_name: string | null;
  crypto_asset_symbol: string | null;
  crypto_asset_network: string | null;
  asset_amount: number;
  rate_value: number;
  quoted_payout: number;
  currency: string;
  fraud_flagged: boolean;
  fraud_flag_reason: string | null;
  fraud_flag_ref_trade_id: string | null;
  created_at: string;
}

export interface AdminTradeFile {
  id: string;
  file_type: "card_image" | "receipt" | "deposit_proof_screenshot";
  storage_path: string;
  image_phash: string | null;
  created_at: string;
  signedUrl: string | null;
}

export interface AdminTradeDetail extends AdminTradeListItem {
  rejection_reason: string | null;
  card_code: string | null;
  card_pin: string | null;
  tx_hash: string | null;
  crypto_asset_id: string | null;
  gift_card_brand_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  updated_at: string;
  user_email: string | null;
  files: AdminTradeFile[];
}
