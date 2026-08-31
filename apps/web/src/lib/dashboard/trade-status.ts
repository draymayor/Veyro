/**
 * Status vocabulary for trades and withdrawals, per docs/database-schema.md
 * and docs/product-rules.md's trade lifecycle. Centralized here so every
 * surface that shows a status badge (dashboard widgets, Assets transaction
 * history, admin views later) maps the same status to the same label and
 * color, per docs/design-principles.md's Trust Signals section.
 */

export type TradeStatus =
  | "awaiting_deposit_confirmation"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "paid"
  | "disputed"
  | "cancelled";

export type WithdrawalStatus = "requested" | "processing" | "paid" | "failed";

export type BadgeTone = "success" | "neutral" | "error";

interface StatusInfo {
  label: string;
  tone: BadgeTone;
}

// Only "approved"/"paid" read as success (vibrant green) and only
// "rejected"/"disputed"/"failed" read as error (brick red), per
// design-principles.md: everything mid-flight (submitted, under review,
// awaiting confirmation, requested, processing, cancelled) stays neutral
// rather than borrowing either color.
const TRADE_STATUS: Record<TradeStatus, StatusInfo> = {
  awaiting_deposit_confirmation: {
    label: "Awaiting Deposit",
    tone: "neutral",
  },
  submitted: { label: "Submitted", tone: "neutral" },
  under_review: { label: "Under Review", tone: "neutral" },
  approved: { label: "Approved", tone: "success" },
  paid: { label: "Paid", tone: "success" },
  rejected: { label: "Rejected", tone: "error" },
  disputed: { label: "Disputed", tone: "error" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const WITHDRAWAL_STATUS: Record<WithdrawalStatus, StatusInfo> = {
  requested: { label: "Requested", tone: "neutral" },
  processing: { label: "Processing", tone: "neutral" },
  paid: { label: "Paid", tone: "success" },
  failed: { label: "Failed", tone: "error" },
};

export function tradeStatusInfo(status: TradeStatus): StatusInfo {
  return TRADE_STATUS[status];
}

export function withdrawalStatusInfo(status: WithdrawalStatus): StatusInfo {
  return WITHDRAWAL_STATUS[status];
}
