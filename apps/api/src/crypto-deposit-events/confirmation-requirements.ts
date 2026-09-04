/**
 * Per-network_code minimum confirmation policy for auto-crediting a
 * webhook-detected deposit (Piece 3 of docs/context.md's "hybrid model").
 * Keyed by CHAIN_CONFIGS' network_code, same keys as chain-config.ts.
 *
 * Two rule shapes:
 * - 'count': credit once a plain confirmation count is reached.
 * - 'finalized': credit once the deposit's block is at or below the
 *   chain's own protocol-level 'finalized' block (Ethereum mainnet post-
 *   Merge only) - a real finality GUARANTEE, strictly stronger than any
 *   heuristic count, so used in preference to one wherever the chain
 *   actually has this concept.
 *
 * `verified` marks whether this specific number was grounded in real
 * research tonight (protocol block-time facts + real corroborating
 * sources - see the per-chain comments below) versus a deliberately
 * conservative, flat, UNVERIFIED PLACEHOLDER pending its own real
 * per-chain research pass. Do not treat an unverified entry as trusted
 * just because it's in this table - PLACEHOLDER_NETWORK_CODES below
 * exists specifically so nothing here can be mistaken for researched.
 */
export type ConfirmationRule =
  | { kind: 'count'; minConfirmations: number; verified: boolean }
  | { kind: 'finalized'; verified: boolean };

// ~10 min/block (protocol constant). 6 confirmations (~60 min) is the
// long-standing, widely-documented security-first standard for BTC -
// deliberately NOT Binance's real but aggressive 1-confirmation deposit
// policy (confirmed via search), which is a UX optimization backed by
// exchange-scale fraud-loss absorption this platform doesn't have.
const BITCOIN: ConfirmationRule = {
  kind: 'count',
  minConfirmations: 6,
  verified: true,
};

// ~2.5 min/block. Upper end of the commonly-cited 1-12 confirmation
// range for LTC (~30 min), erring toward safety for real money.
const LITECOIN: ConfirmationRule = {
  kind: 'count',
  minConfirmations: 12,
  verified: true,
};

// ~1 min/block - a flat "6" would give DOGE a much thinner real-time
// safety margin than BTC's 6. DOGE has merge-mined with LTC since 2014
// (shares LTC's hashrate via AuxPoW), so a comparable TIME window to
// LTC/BTC, not a comparable raw block count, is the right target: ~40
// confirmations (~40 min).
const DOGECOIN: ConfirmationRule = {
  kind: 'count',
  minConfirmations: 40,
  verified: true,
};

// ~3 sec/block. Real and corroborated, not a single-source guess:
// Binance, OKX, and Bybit independently converge on 20 confirmations
// (~60 sec) for TRC20/TRON deposits (confirmed via search).
const TRON: ConfirmationRule = {
  kind: 'count',
  minConfirmations: 20,
  verified: true,
};

// Ethereum mainnet ONLY (not the other 13 EVM chains below, which do not
// share Ethereum's Casper FFG finality mechanism) - post-Merge Ethereum
// reaches actual protocol-level finality roughly every 2 epochs (~12.8
// min). Using the 'finalized' block tag is a real guarantee, not a
// heuristic. NEEDS A LIVE CHECK before this ships: whether Tatum's EVM
// gateway actually honors the 'finalized' tag on eth_getBlockByNumber
// for this chain specifically has not yet been confirmed against a real
// response (see TatumChainDataService.getFinalizedBlockNumber) - flagged
// there, not assumed here.
const ETHEREUM_FINALIZED: ConfirmationRule = {
  kind: 'finalized',
  verified: true,
};

// --- UNVERIFIED, CONSERVATIVE PLACEHOLDERS ---
// Every network_code below has NOT had its own real per-chain finality
// research pass (real block-time confirmation + a real corroborating
// source, the same bar BITCOIN/LITECOIN/DOGECOIN/TRON/ETHEREUM_FINALIZED
// above were held to). This is a deliberately flat, conservative count
// (not time-normalized per chain's own real block time) rather than
// invented per-chain precision dressed up as researched. Several of
// these - Arbitrum, Optimism, Base specifically - are L2s whose real
// reorg characteristics are tied to their L1 settlement, not just their
// own block count, a materially different question this placeholder
// does NOT answer. DO NOT treat this number as trusted for any of these
// chains without doing that research first - see
// PLACEHOLDER_NETWORK_CODES below, checked explicitly wherever this
// matters (e.g. a future admin-facing warning on these specifically).
const UNVERIFIED_PLACEHOLDER: ConfirmationRule = {
  kind: 'count',
  minConfirmations: 30,
  verified: false,
};

export const PLACEHOLDER_NETWORK_CODES = [
  'BEP20',
  'Polygon',
  'Avalanche',
  'Celo',
  'Flare',
  'Fantom',
  'Cronos',
  'Ethereum Classic',
  'Kaia',
  'XDC Network',
  'Arbitrum',
  'Optimism',
  'Base',
] as const;

export const CONFIRMATION_REQUIREMENTS: Record<string, ConfirmationRule> = {
  Bitcoin: BITCOIN,
  Litecoin: LITECOIN,
  Dogecoin: DOGECOIN,
  TRC20: TRON,
  ERC20: ETHEREUM_FINALIZED,
  ...Object.fromEntries(
    PLACEHOLDER_NETWORK_CODES.map((code) => [code, UNVERIFIED_PLACEHOLDER]),
  ),
};
