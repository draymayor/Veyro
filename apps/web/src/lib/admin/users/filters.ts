import type { AccountStatus } from "./types";

export const ACCOUNT_STATUS_OPTIONS: { value: AccountStatus; label: string }[] =
  [
    { value: "active", label: "Active" },
    { value: "restricted", label: "Restricted" },
    { value: "banned", label: "Banned" },
  ];
