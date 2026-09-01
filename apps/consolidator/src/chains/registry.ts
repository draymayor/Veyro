import { ConsolidatorConfig } from "../config";
import { ConsolidatorChain } from "../coins";
import { PayoutAdapter } from "./types";
import { EvmConsolidatorAdapter } from "./evm";
import {
  UtxoConsolidatorAdapter,
  UtxoProvider,
  BITCOIN_PARAMS,
  LITECOIN_PARAMS,
  DOGECOIN_PARAMS,
} from "./utxo";
import { TronConsolidatorAdapter } from "./tron";

// CRITICAL: verify every contract address below against the official token
// list / block explorer for its chain before this ever touches mainnet
// funds - a wrong address here would send to (or read the balance of) the
// wrong contract entirely. Duplicated from apps/sweeper/src/chains/registry.ts
// deliberately (separate deployable, must not import from it) - keep both
// in sync when a contract address changes.
const EVM_TOKEN_CONTRACTS: Record<string, Record<string, string>> = {
  ERC20: {
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  },
  BEP20: { USDT: "0x55d398326f99059fF775485246999027B3197955" },
  Arbitrum: {
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  },
  Optimism: {
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  },
  Base: { USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
};

const UTXO_PARAMS = {
  BTC: BITCOIN_PARAMS,
  LTC: LITECOIN_PARAMS,
  DOGE: DOGECOIN_PARAMS,
};

/**
 * Builds a PayoutAdapter for one withdrawal's chain. `networkCode` is the
 * withdrawal's crypto_assets.network_code (e.g. 'ERC20', 'Bitcoin',
 * 'TRC20') - needed even for chain='EVM' since each EVM network has its
 * own RPC endpoint and token contract map despite sharing one address.
 * Fetches CONSOLIDATION_MASTER_SEED once per run (cached by
 * SecretManagerClient) regardless of how many withdrawals/chains this run
 * processes - it's one shared secret across all 5 chains, unlike the
 * sweeper's 5 independent per-chain seeds.
 */
export function buildAdapter(
  chain: ConsolidatorChain,
  networkCode: string,
  config: ConsolidatorConfig,
  masterSeedMnemonic: string,
  utxoProviders: Record<"BTC" | "LTC" | "DOGE", UtxoProvider>,
): PayoutAdapter {
  switch (chain) {
    case "BTC":
    case "LTC":
    case "DOGE":
      return new UtxoConsolidatorAdapter(
        UTXO_PARAMS[chain],
        masterSeedMnemonic,
        utxoProviders[chain],
      );
    case "EVM": {
      const rpcUrl = config.evmRpcUrls[networkCode];
      if (!rpcUrl) {
        throw new Error(
          `Missing EVM_RPC_URL_* env var for network "${networkCode}"`,
        );
      }
      return new EvmConsolidatorAdapter(
        rpcUrl,
        masterSeedMnemonic,
        EVM_TOKEN_CONTRACTS[networkCode] ?? {},
      );
    }
    case "TRON":
      return new TronConsolidatorAdapter(
        "https://api.trongrid.io",
        masterSeedMnemonic,
      );
  }
}
