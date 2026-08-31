import { SecretManagerClient } from "../secret-manager";
import { SweeperConfig } from "../config";
import { ChainDefinition } from "../coins";
import { ChainAdapter } from "./types";
import { EvmAdapter } from "./evm";
import {
  UtxoAdapter,
  UtxoProvider,
  BITCOIN_PARAMS,
  LITECOIN_PARAMS,
  DOGECOIN_PARAMS,
} from "./utxo";
import { TronAdapter } from "./tron";

// CRITICAL: verify every contract address below against the official token
// list / block explorer for its chain before this ever touches mainnet
// funds - a wrong address here would sweep into (or read the balance of)
// the wrong contract entirely. Treat these as unverified placeholders.
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

/**
 * Builds a ChainAdapter for one chain definition, fetching only the secret
 * that chain actually needs (never all 5 up front) - keeps each run's
 * Secret Manager footprint minimal and makes it obvious in logs/audit
 * trails exactly which secret a given run touched.
 */
export async function buildAdapter(
  chain: ChainDefinition,
  config: SweeperConfig,
  secrets: SecretManagerClient,
  utxoProviders: Record<string, UtxoProvider>,
): Promise<ChainAdapter> {
  switch (chain.signingFamily) {
    case "evm": {
      const rpcUrl = config.evmRpcUrls[chain.network];
      if (!rpcUrl) {
        throw new Error(
          `Missing EVM_RPC_URL_* env var for network "${chain.network}"`,
        );
      }
      const seed = await secrets.getSecret(chain.secretName);
      return new EvmAdapter(
        rpcUrl,
        seed,
        chain.network,
        EVM_TOKEN_CONTRACTS[chain.network] ?? {},
      );
    }
    case "utxo": {
      const seed = await secrets.getSecret(chain.secretName);
      const provider = utxoProviders[chain.network];
      if (!provider) {
        throw new Error(`Missing UtxoProvider for network "${chain.network}"`);
      }
      const params =
        chain.network === "Bitcoin"
          ? BITCOIN_PARAMS
          : chain.network === "Litecoin"
            ? LITECOIN_PARAMS
            : chain.network === "Dogecoin"
              ? DOGECOIN_PARAMS
              : null;
      if (!params) {
        throw new Error(`No UtxoNetworkParams for network "${chain.network}"`);
      }
      return new UtxoAdapter(params, seed, provider);
    }
    case "tron": {
      const seed = await secrets.getSecret(chain.secretName);
      return new TronAdapter({ fullHost: "https://api.trongrid.io" }, seed);
    }
  }
}
