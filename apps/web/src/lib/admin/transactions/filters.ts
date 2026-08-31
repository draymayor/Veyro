import type { AdminTransactionSource, WalletTransactionType } from "./types";

export const TRANSACTION_TYPE_OPTIONS: {
  value: WalletTransactionType;
  label: string;
}[] = [
  { value: "credit", label: "Credit" },
  { value: "debit", label: "Debit" },
];

export const TRANSACTION_SOURCE_OPTIONS: {
  value: AdminTransactionSource;
  label: string;
}[] = [
  { value: "trade", label: "Trade" },
  { value: "withdrawal", label: "Withdrawal" },
  { value: "manual_deposit", label: "Manual Deposit" },
  { value: "crypto_deposit", label: "Crypto Deposit" },
  { value: "admin_adjustment", label: "Admin Adjustment" },
];

export const TRANSACTION_SORT_OPTIONS: {
  value: "desc" | "asc";
  label: string;
}[] = [
  { value: "desc", label: "Newest first" },
  { value: "asc", label: "Oldest first" },
];
