/**
 * Maps crypto_assets.network_code (docs/database-schema.md; matches
 * CHAIN_CONFIGS keys in apps/api/src/crypto-addresses/chain-config.ts) to
 * one of the 5 consolidation_wallets chains. Duplicated (not imported) from
 * apps/api and apps/sweeper because the consolidator is a deliberately
 * separate deployable with its own dependency tree, image, and service
 * account - it must never import from either. Keep in sync when a
 * coin/network changes (same discipline apps/sweeper/src/coins.ts already
 * documents for itself).
 *
 * All EVM networks share ONE consolidation wallet address (one address
 * space, verified via CONSOLIDATION_MASTER_SEED's m/44'/60'/0'/0/0 path -
 * see scripts/gcp/bootstrap-consolidator-iam.sh), but each network still
 * needs its own RPC endpoint and, for tokens, its own contract address to
 * broadcast on the right chain - that per-network detail is handled in
 * chains/registry.ts, not here.
 */
export type ConsolidatorChain = "BTC" | "LTC" | "DOGE" | "EVM" | "TRON";

export const NETWORK_CODE_TO_CHAIN: Record<string, ConsolidatorChain> = {
  Bitcoin: "BTC",
  Litecoin: "LTC",
  Dogecoin: "DOGE",
  ERC20: "EVM",
  BEP20: "EVM",
  Polygon: "EVM",
  Avalanche: "EVM",
  Celo: "EVM",
  Flare: "EVM",
  Fantom: "EVM",
  Cronos: "EVM",
  "Ethereum Classic": "EVM",
  Kaia: "EVM",
  "XDC Network": "EVM",
  Arbitrum: "EVM",
  Optimism: "EVM",
  Base: "EVM",
  TRC20: "TRON",
};

export function chainForNetworkCode(networkCode: string): ConsolidatorChain {
  const chain = NETWORK_CODE_TO_CHAIN[networkCode];
  if (!chain) {
    throw new Error(
      `No consolidator chain mapping for network_code "${networkCode}" - add it to NETWORK_CODE_TO_CHAIN before this withdrawal can be signed.`,
    );
  }
  return chain;
}
