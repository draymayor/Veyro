/**
 * Minimal chain classification the sweeper needs, duplicated (not imported)
 * from apps/api/src/crypto-addresses/chain-config.ts because the sweeper is
 * a deliberately separate deployable with its own dependency tree, image,
 * and service account (docs/planning-history.md's Sweeper section) - it
 * must never import from or depend on apps/api. Keep this in sync with
 * that file and with apps/api/src/crypto-addresses/coins.config.ts when a
 * coin/network changes.
 */

export type SweepGroup = "utxo" | "evm";

export type SigningFamily = "utxo" | "evm" | "tron";

export interface ChainDefinition {
  /** Matches crypto_assets.network / user_crypto_addresses.network. */
  network: string;
  /** Native symbol swept for gas/fee accounting purposes (BTC, ETH, TRX...). */
  nativeSymbol: string;
  /** Every symbol (native + tokens) that can accumulate at addresses on this network. */
  symbols: string[];
  sweepGroup: SweepGroup;
  signingFamily: SigningFamily;
  /** Which combined secret this chain's signing key material lives in. */
  secretName: string;
  /** platform_settings key holding this chain's fee-aware minimum threshold, per native-unit symbol swept. */
  thresholdKeyBySymbol: Record<string, string>;
}

export const CHAINS: ChainDefinition[] = [
  {
    network: "Bitcoin",
    nativeSymbol: "BTC",
    symbols: ["BTC"],
    sweepGroup: "utxo",
    signingFamily: "utxo",
    secretName: "SWEEPER_BTC_SEED",
    thresholdKeyBySymbol: { BTC: "sweep_min_threshold_btc" },
  },
  {
    network: "Litecoin",
    nativeSymbol: "LTC",
    symbols: ["LTC"],
    sweepGroup: "utxo",
    signingFamily: "utxo",
    secretName: "SWEEPER_LTC_SEED",
    thresholdKeyBySymbol: { LTC: "sweep_min_threshold_ltc" },
  },
  {
    network: "Dogecoin",
    nativeSymbol: "DOGE",
    symbols: ["DOGE"],
    sweepGroup: "utxo",
    signingFamily: "utxo",
    secretName: "SWEEPER_DOGE_SEED",
    thresholdKeyBySymbol: { DOGE: "sweep_min_threshold_doge" },
  },
  {
    network: "ERC20",
    nativeSymbol: "ETH",
    symbols: ["ETH", "USDT", "USDC"],
    sweepGroup: "evm",
    signingFamily: "evm",
    secretName: "SWEEPER_EVM_SEED",
    thresholdKeyBySymbol: {
      ETH: "sweep_min_threshold_evm_native",
      USDT: "sweep_min_threshold_erc20_token",
      USDC: "sweep_min_threshold_erc20_token",
    },
  },
  {
    network: "BEP20",
    nativeSymbol: "BNB",
    symbols: ["BNB", "USDT"],
    sweepGroup: "evm",
    signingFamily: "evm",
    secretName: "SWEEPER_EVM_SEED",
    thresholdKeyBySymbol: {
      BNB: "sweep_min_threshold_evm_native",
      USDT: "sweep_min_threshold_erc20_token",
    },
  },
  {
    network: "Polygon",
    nativeSymbol: "POL",
    symbols: ["POL"],
    sweepGroup: "evm",
    signingFamily: "evm",
    secretName: "SWEEPER_EVM_SEED",
    thresholdKeyBySymbol: { POL: "sweep_min_threshold_evm_native" },
  },
  {
    network: "Avalanche",
    nativeSymbol: "AVAX",
    symbols: ["AVAX"],
    sweepGroup: "evm",
    signingFamily: "evm",
    secretName: "SWEEPER_EVM_SEED",
    thresholdKeyBySymbol: { AVAX: "sweep_min_threshold_evm_native" },
  },
  {
    network: "Celo",
    nativeSymbol: "CELO",
    symbols: ["CELO"],
    sweepGroup: "evm",
    signingFamily: "evm",
    secretName: "SWEEPER_EVM_SEED",
    thresholdKeyBySymbol: { CELO: "sweep_min_threshold_evm_native" },
  },
  {
    network: "Flare",
    nativeSymbol: "FLR",
    symbols: ["FLR"],
    sweepGroup: "evm",
    signingFamily: "evm",
    secretName: "SWEEPER_EVM_SEED",
    thresholdKeyBySymbol: { FLR: "sweep_min_threshold_evm_native" },
  },
  {
    network: "Fantom",
    nativeSymbol: "FTM",
    symbols: ["FTM"],
    sweepGroup: "evm",
    signingFamily: "evm",
    secretName: "SWEEPER_EVM_SEED",
    thresholdKeyBySymbol: { FTM: "sweep_min_threshold_evm_native" },
  },
  {
    network: "Cronos",
    nativeSymbol: "CRO",
    symbols: ["CRO"],
    sweepGroup: "evm",
    signingFamily: "evm",
    secretName: "SWEEPER_EVM_SEED",
    thresholdKeyBySymbol: { CRO: "sweep_min_threshold_evm_native" },
  },
  {
    network: "Ethereum Classic",
    nativeSymbol: "ETC",
    symbols: ["ETC"],
    sweepGroup: "evm",
    signingFamily: "evm",
    secretName: "SWEEPER_EVM_SEED",
    thresholdKeyBySymbol: { ETC: "sweep_min_threshold_evm_native" },
  },
  {
    network: "Kaia",
    nativeSymbol: "KAIA",
    symbols: ["KAIA"],
    sweepGroup: "evm",
    signingFamily: "evm",
    secretName: "SWEEPER_EVM_SEED",
    thresholdKeyBySymbol: { KAIA: "sweep_min_threshold_evm_native" },
  },
  {
    network: "XDC Network",
    nativeSymbol: "XDC",
    symbols: ["XDC"],
    sweepGroup: "evm",
    signingFamily: "evm",
    secretName: "SWEEPER_EVM_SEED",
    thresholdKeyBySymbol: { XDC: "sweep_min_threshold_evm_native" },
  },
  {
    network: "Arbitrum",
    nativeSymbol: "ETH",
    symbols: ["ETH", "USDT", "USDC"],
    sweepGroup: "evm",
    signingFamily: "evm",
    secretName: "SWEEPER_EVM_SEED",
    thresholdKeyBySymbol: {
      ETH: "sweep_min_threshold_evm_native",
      USDT: "sweep_min_threshold_erc20_token",
      USDC: "sweep_min_threshold_erc20_token",
    },
  },
  {
    network: "Optimism",
    nativeSymbol: "ETH",
    symbols: ["ETH", "USDT", "USDC"],
    sweepGroup: "evm",
    signingFamily: "evm",
    secretName: "SWEEPER_EVM_SEED",
    thresholdKeyBySymbol: {
      ETH: "sweep_min_threshold_evm_native",
      USDT: "sweep_min_threshold_erc20_token",
      USDC: "sweep_min_threshold_erc20_token",
    },
  },
  {
    network: "Base",
    nativeSymbol: "ETH",
    symbols: ["ETH", "USDT", "USDC"],
    sweepGroup: "evm",
    signingFamily: "evm",
    secretName: "SWEEPER_EVM_SEED",
    thresholdKeyBySymbol: {
      ETH: "sweep_min_threshold_evm_native",
      USDT: "sweep_min_threshold_erc20_token",
      USDC: "sweep_min_threshold_erc20_token",
    },
  },
  {
    network: "TRC20",
    nativeSymbol: "TRX",
    symbols: ["TRX", "USDT"],
    sweepGroup: "evm",
    signingFamily: "tron",
    secretName: "SWEEPER_TRON_SEED",
    thresholdKeyBySymbol: {
      TRX: "sweep_min_threshold_trx",
      USDT: "sweep_min_threshold_trc20_token",
    },
  },
];

export function chainsForGroup(group: SweepGroup): ChainDefinition[] {
  return CHAINS.filter((c) => c.sweepGroup === group);
}
