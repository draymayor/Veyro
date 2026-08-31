import type { AdminTransactionListItem } from "./types";

export function transactionUserLabel(
  displayName: string | null,
  userId: string,
): string {
  return displayName ?? `User ${userId.slice(0, 8)}`;
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
// currency Intl.NumberFormat can price - shown as a plain quantity with up
// to 8 decimal places (enough for satoshi-scale BTC amounts) suffixed by
// the symbol instead.
export function formatCrypto(amount: number, symbol: string): string {
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${symbol}`;
}

export function formatTransactionAmount(
  item: AdminTransactionListItem,
): string {
  return item.ledger === "crypto"
    ? formatCrypto(item.amount, item.crypto_symbol ?? "")
    : formatMoney(item.amount, item.currency);
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

// Short label for the source cell, distinct from the longer reference text
// sourceReference gives underneath it.
export function sourceLabel(item: AdminTransactionListItem): string {
  if (item.source === "trade") return "Trade";
  if (item.source === "withdrawal") return "Withdrawal";
  if (item.source === "crypto_deposit") return "Crypto Deposit";
  if (item.source === "admin_adjustment") return "Admin Adjustment";
  return "Manual Deposit";
}

function assetTypeLabel(assetType: string | null): string {
  if (assetType === "gift_card") return "Gift Card";
  if (assetType === "crypto") return "Crypto";
  return "";
}

function methodLabel(method: string | null): string {
  if (method === "bank_transfer") return "Bank Transfer";
  if (method === "paypal") return "PayPal";
  if (method === "crypto") return "Crypto";
  return "";
}

// One line of extra context under the source label: which trade/withdrawal
// triggered this ledger entry, or the admin's reason for a manual deposit.
// A manual deposit entry (trade_id and withdrawal_id both null) always
// shows plainly as "Manual Deposit" rather than a blank/missing source, per
// docs/admin-guide.md.
export function sourceReference(item: AdminTransactionListItem): string {
  if (item.source === "trade") {
    return `${assetTypeLabel(item.trade_asset_type)} · ${item.trade_status ?? ""}`.trim();
  }
  if (item.source === "withdrawal") {
    return `${methodLabel(item.withdrawal_method)} · ${item.withdrawal_status ?? ""}`.trim();
  }
  if (item.source === "crypto_deposit") {
    return `${item.crypto_symbol ?? ""} deposit`.trim();
  }
  if (item.source === "admin_adjustment") {
    return `${item.crypto_symbol ?? ""} balance adjustment`.trim();
  }
  return item.manual_deposit_reason ?? "No reason on file";
}
