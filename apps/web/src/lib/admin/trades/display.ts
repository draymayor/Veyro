/**
 * Display fallback for a trade's owner when they haven't set a
 * display_name (public.users.display_name is nullable, editable on the
 * Profile page). The Trade Review list doesn't fetch email per row (that
 * would be one auth admin API call per row), so a shortened id is the
 * fallback there; the detail view fetches the real email separately.
 */
export function tradeUserLabel(
  displayName: string | null,
  userId: string,
): string {
  return displayName ?? `User ${userId.slice(0, 8)}`;
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-US")}`;
  }
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
