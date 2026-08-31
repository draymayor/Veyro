export interface DepositAddress {
  userId: string;
  symbol: string;
  network: string;
  address: string;
  /** HD derivation index for xpub-derived chains; null for shared-address chains (none currently active). */
  derivationIndex: number | null;
  /** Destination tag/memo for shared-address chains (none currently active). */
  destinationTag: string | null;
}

export interface SweepResult {
  txHash: string;
  amountSwept: number;
  feeEstimate: number;
}

/**
 * One adapter per signing family (UTXO, EVM, Tron). Each
 * adapter owns everything chain-specific: balance lookups, private-key
 * derivation from its master seed, transaction construction, signing, and
 * broadcast. SweepRunner never touches raw key material directly - it only
 * calls through this interface.
 */
export interface ChainAdapter {
  /** Returns the on-chain balance of `symbol` at `address`, in the symbol's own units. */
  getBalance(address: string, symbol: string): Promise<number>;

  /**
   * Sweeps the full available balance of `symbol` from `deposit` to
   * `toAddress`, minus whatever network fee the sweep itself costs.
   * Returns null if, after fee deduction, nothing was worth sending (the
   * caller should not treat this as an error - just log
   * skipped_below_threshold).
   */
  sweep(
    deposit: DepositAddress,
    symbol: string,
    toAddress: string,
  ): Promise<SweepResult | null>;
}
