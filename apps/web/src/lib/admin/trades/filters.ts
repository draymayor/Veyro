import type { AdminTradeStatus, TradeAssetType } from "./types";

export const TRADE_STATUS_OPTIONS: {
  value: AdminTradeStatus;
  label: string;
}[] = [
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "awaiting_deposit_confirmation", label: "Awaiting Deposit" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "paid", label: "Paid" },
  { value: "disputed", label: "Disputed" },
  { value: "cancelled", label: "Cancelled" },
];

export const TRADE_ASSET_TYPE_OPTIONS: {
  value: TradeAssetType;
  label: string;
}[] = [
  { value: "gift_card", label: "Gift Card" },
  { value: "crypto", label: "Crypto" },
];
