/**
 * Notifications-page item types, shaped directly after the `notifications`
 * table (docs/database-schema.md): category, title, body,
 * related_trade_id/related_withdrawal_id, read_at. The backend only ever
 * inserts these rows in response to real events (trade status changes,
 * withdrawal status changes, referral earnings, account/security events).
 * The real query lives in get-notifications.ts.
 */

export type NotificationCategory =
  "trades" | "wallet" | "referrals" | "account";

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  relatedTradeId: string | null;
  relatedWithdrawalId: string | null;
  readAt: string | null;
  createdAt: string;
}

export const NOTIFICATION_CATEGORIES: {
  value: "all" | NotificationCategory;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "trades", label: "Trades" },
  { value: "wallet", label: "Wallet" },
  { value: "referrals", label: "Referrals" },
  { value: "account", label: "Account" },
];
