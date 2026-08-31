/** Mirrors the BankAccount shape returned by apps/api/src/bank-accounts/bank-accounts.service.ts. */
export interface BankAccount {
  id: string;
  country: string;
  bankDetails: Record<string, string | undefined>;
  isDefault: boolean;
  createdAt: string;
}
