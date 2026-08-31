/** Mirrors the row shape returned by apps/api/src/withdrawals/withdrawals.service.ts. */
export interface Withdrawal {
  id: string;
  amount: number;
  method: "bank_transfer" | "paypal" | "crypto";
  status: string;
  created_at: string;
}

export type CreateWithdrawalPayload =
  | { amount: number; method: "bank_transfer"; bankAccountId: string }
  | { amount: number; method: "paypal"; paypalEmail: string }
  | {
      amount: number;
      method: "crypto";
      cryptoSymbol: string;
      cryptoNetwork: string;
      cryptoPayoutAddress: string;
      /** Optional user note, not yet stored by the backend (no withdrawals column for it). */
      remarks?: string;
    };

/**
 * Soft, best-effort address format checks per network family (docs/context.md's
 * Withdrawal Request page spec: don't block submission on this alone, since
 * these are shape checks, not real checksum/on-chain validation). A missing
 * or unrecognized network id skips the check rather than false-flagging.
 */
const ADDRESS_PATTERNS: Record<string, RegExp> = {
  bitcoin: /^(bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
  erc20: /^0x[a-fA-F0-9]{40}$/,
  bep20: /^0x[a-fA-F0-9]{40}$/,
  trc20: /^T[a-km-zA-HJ-NP-Z1-9]{33}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  dogecoin: /^D[a-km-zA-HJ-NP-Z1-9]{25,34}$/,
};

export function looksLikeValidAddress(
  networkId: string,
  address: string,
): boolean {
  const pattern = ADDRESS_PATTERNS[networkId];
  if (!pattern) return true;
  return pattern.test(address.trim());
}
