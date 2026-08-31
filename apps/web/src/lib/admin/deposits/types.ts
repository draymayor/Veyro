export type ManualDepositType = "fiat" | "crypto";

export interface ManualDepositQuote {
  userId: string;
  displayName: string | null;
  email: string | null;
  depositType: ManualDepositType;
  /** Fiat deposits only - the wallet currency being credited. */
  walletCurrency: string | null;
  /** Crypto deposits only - the symbol being credited to crypto_wallets. */
  symbol: string | null;
  creditAmount: number;
  sourceLabel: string;
}

export interface ManualDepositResult extends ManualDepositQuote {
  ledgerEntryId: string;
  newBalance: number;
}
