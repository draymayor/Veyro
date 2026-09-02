import type { BadgeTone } from "@/lib/dashboard/trade-status";
import type { AccountStatus, AdminUserLedgerEntry } from "./types";

export function userLabel(displayName: string | null, userId: string): string {
  return displayName ?? `User ${userId.slice(0, 8)}`;
}

const ACCOUNT_STATUS_INFO: Record<
  AccountStatus,
  { label: string; tone: BadgeTone }
> = {
  active: { label: "Active", tone: "success" },
  restricted: { label: "Restricted", tone: "neutral" },
  banned: { label: "Banned", tone: "error" },
};

export function accountStatusInfo(status: AccountStatus) {
  return ACCOUNT_STATUS_INFO[status];
}

export function formatMoney(amount: number, currency: string | null): string {
  if (!currency) return amount.toLocaleString("en-US");
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

// Crypto amounts are held in the asset itself (BTC, ETH, ...), not a fiat
// currency Intl.NumberFormat can price - same approach already proven on
// the All Transactions view (lib/admin/transactions/display.ts's
// formatCrypto), shown as a plain quantity with up to 8 decimal places
// suffixed by the symbol instead.
export function formatCrypto(amount: number, symbol: string): string {
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${symbol}`;
}

export function formatLedgerAmount(entry: AdminUserLedgerEntry): string {
  return entry.ledger === "crypto"
    ? formatCrypto(entry.amount, entry.crypto_symbol ?? "")
    : formatMoney(entry.amount, entry.wallet_currency);
}

export function formatLedgerBalanceAfter(entry: AdminUserLedgerEntry): string {
  return entry.ledger === "crypto"
    ? formatCrypto(entry.balance_after, entry.crypto_symbol ?? "")
    : formatMoney(entry.balance_after, entry.wallet_currency);
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
