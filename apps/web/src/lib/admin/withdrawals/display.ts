/**
 * Display fallback for a withdrawal's owner when they haven't set a
 * display_name, same reasoning as the Trade Review queue's
 * tradeUserLabel: no per-row email fetch here, just a short id fallback.
 */
export function withdrawalUserLabel(
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

// Crypto amounts are a raw asset quantity, not a fiat currency
// Intl.NumberFormat can price - shown as a plain quantity with up to 8
// decimal places suffixed by the symbol instead, same pattern as the All
// Transactions view's formatCrypto (lib/admin/transactions/display.ts).
export function formatCrypto(amount: number, symbol: string): string {
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${symbol}`;
}

export function formatWithdrawalAmount(withdrawal: {
  method: string;
  amount: number;
  currency: string | null;
  crypto_asset_symbol: string | null;
}): string {
  return withdrawal.method === "crypto"
    ? formatCrypto(withdrawal.amount, withdrawal.crypto_asset_symbol ?? "")
    : formatMoney(withdrawal.amount, withdrawal.currency);
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

const BANK_DETAIL_LABELS: Record<string, string> = {
  country: "Country",
  bankName: "Bank",
  accountNumber: "Account number",
  accountName: "Account name",
  accountType: "Account type",
  routingNumber: "Routing number",
  sortCode: "Sort code",
  iban: "IBAN",
  bic: "BIC/SWIFT",
  ibanOrSwift: "IBAN/SWIFT",
};

// bank_details is stored flexibly per country (docs/database-schema.md),
// so this renders whatever fields are actually present rather than
// assuming one fixed shape.
export function bankDetailEntries(
  bankDetails: Record<string, string | undefined> | null,
): { label: string; value: string }[] {
  if (!bankDetails) return [];
  return Object.entries(bankDetails)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([key, value]) => ({
      label: BANK_DETAIL_LABELS[key] ?? key,
      value,
    }));
}
