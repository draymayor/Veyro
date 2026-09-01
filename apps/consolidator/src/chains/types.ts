/**
 * Why a payout was NOT signed/broadcast. Only 'insufficient_consolidation_balance'
 * is ever returned as a normal PayoutResult - it happens strictly BEFORE any
 * key material is derived or any signing/broadcast is attempted, so it is
 * always safe to release the withdrawal back to 'ready_to_sign' for a
 * later retry (e.g. once the consolidation wallet is topped up).
 *
 * Any OTHER failure (a thrown error from inside payout(), after the
 * solvency check passed) is deliberately NOT modeled as a PayoutResult -
 * see ConsolidatorRunner.processOne. Once signing/broadcast has been
 * attempted, whether funds actually moved is ambiguous from a thrown
 * error alone, so the runner leaves that withdrawal in 'signing' for
 * manual chain verification rather than guessing.
 */
export type PayoutFailureReason = "insufficient_consolidation_balance";

export interface PayoutSuccess {
  ok: true;
  txHash: string;
  /** In the chain's native fee-paying asset's own units, not the payout symbol's. */
  feeEstimate: number;
}

export interface PayoutFailure {
  ok: false;
  reason: PayoutFailureReason;
  message: string;
  /**
   * Present only when the failure happened AFTER the adapter had already
   * computed a real fee estimate (e.g. the solvency check itself needed
   * it to decide amount + fee > balance) - in the chain's native
   * fee-paying asset's own units, same as PayoutSuccess.feeEstimate.
   * Undefined when the failure happened before any fee calculation.
   */
  feeEstimate?: number;
}

export type PayoutResult = PayoutSuccess | PayoutFailure;

/**
 * One adapter per signing family (UTXO, EVM, Tron), each covering exactly
 * one chain's single, fixed consolidation wallet address (never a range of
 * derived addresses - see the header comment in
 * scripts/gcp/bootstrap-consolidator-iam.sh for the confirmed, single,
 * fixed derivation index per chain). ConsolidatorRunner never touches raw
 * key material directly - it only calls through this interface.
 */
export interface PayoutAdapter {
  /** The chain's one fixed consolidation wallet address, for logging and solvency-check context. */
  readonly fromAddress: string;

  /**
   * Sends EXACTLY `amount` of `symbol` from the fixed consolidation wallet
   * to `toAddress` - the user's owed amount, already debited from their
   * crypto_wallets ledger balance at withdrawal request time. The network
   * fee is paid ON TOP from the consolidation wallet's own balance, never
   * deducted from `amount` - the opposite of apps/sweeper's sweep()
   * semantics, which sends "everything available, minus fee". Performs an
   * explicit pre-signing on-chain balance check (native balance covers
   * amount + fee for a native send; token balance covers amount AND
   * native balance covers fee, for a token send) and returns ok:false
   * without ever deriving key material if the wallet can't cover it.
   */
  payout(
    symbol: string,
    amount: number,
    toAddress: string,
  ): Promise<PayoutResult>;
}
