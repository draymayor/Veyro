import type { BadgeTone } from "@/lib/dashboard/trade-status";
import type { AccountStatus } from "./types";

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

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
