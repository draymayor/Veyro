/**
 * formatNgn: illustrative-rate formatting shared by the gift card rate
 * row and brand list (unrelated to wallet balance, a separate concern
 * kept out of scope for the balance/activity/notifications real-data
 * pass, see get-wallet-summary.ts, get-transaction-history.ts, and
 * get-notifications.ts for those).
 */
export function formatNgn(value: number): string {
  return `₦${value.toLocaleString("en-NG")}`;
}
