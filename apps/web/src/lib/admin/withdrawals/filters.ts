import type { AdminWithdrawalStatus, WithdrawalMethod } from "./types";

export const WITHDRAWAL_STATUS_OPTIONS: {
  value: AdminWithdrawalStatus;
  label: string;
}[] = [
  { value: "requested", label: "Requested" },
  { value: "processing", label: "Processing" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
];

export const WITHDRAWAL_METHOD_OPTIONS: {
  value: WithdrawalMethod;
  label: string;
}[] = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "paypal", label: "PayPal" },
  { value: "crypto", label: "Crypto" },
];
