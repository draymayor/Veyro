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
 * Live "is this worth sweeping" context for a `sweep_fee_multiple_*`
 * threshold (thresholds.ts) - only meaningful to adapters whose fee is
 * denominated in a different unit than the balance being swept (currently
 * just EvmAdapter's ERC20 token path; other adapters ignore it). Computed
 * by SweepRunner from platform_settings + PriceFeed and passed down so the
 * comparison happens inside the same method that already fetched the live
 * fee estimate, instead of against a stale pre-fetched number.
 */
export interface SweepFeeContext {
  /** Sweep only if the balance's USD value exceeds this many times the live fee estimate's USD value. */
  feeMultiplier: number;
  /** Live USD price of the chain's native gas currency, for converting a native-denominated fee into USD. */
  nativeUsdPrice: number;
  /** When true, perform the full live check but stop short of broadcasting - same intent as SweeperConfig.dryRun. */
  dryRun?: boolean;
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
   * skipped_below_threshold). `feeContext` is only supplied - and only
   * consulted - for symbols gated by a `sweep_fee_multiple_*` setting.
   */
  sweep(
    deposit: DepositAddress,
    symbol: string,
    toAddress: string,
    feeContext?: SweepFeeContext,
  ): Promise<SweepResult | null>;
}
