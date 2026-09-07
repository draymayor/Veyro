/**
 * Minimal chain classification block-watcher needs, duplicated (not
 * imported) from apps/api/src/crypto-addresses/chain-config.ts, same
 * reasoning as apps/sweeper/src/coins.ts's own header comment: block-watcher
 * is a deliberately separate deployable with its own dependency tree, image,
 * and service account - it must never import from or depend on apps/api.
 * Keep `network` values in sync with that file's CHAIN_CONFIGS keys.
 *
 * `detectionMode` reflects what was actually verified live (2026-09-07), not
 * assumed from documentation - see the Strategy 3 design writeup this
 * implements:
 *   - 'ws': a free wss:// endpoint on PublicNode was confirmed with a real
 *     WebSocket upgrade (HTTP 101), for eth_subscribe("newHeads").
 *   - 'poll-evm': no confirmed free WS provider for this chain (PublicNode
 *     404s on Fantom, for example) - falls back to polling eth_blockNumber
 *     on the chain's own public RPC (same EVM_RPC_URL_* env vars the sweeper
 *     already reads, reused here rather than inventing new ones).
 *   - 'poll-tron': TRON has no WS block/event subscription on any provider
 *     (confirmed - not a TronGrid-specific limitation), polls TronGrid's
 *     free REST API instead.
 *   - 'poll-utxo': BTC/LTC/DOGE. BlockCypher's free tier is GET-polling
 *     only (WebHooks/WebSockets are paid-only, confirmed live against their
 *     docs 2026-09-07) - fine given these chains' 1-10 minute block times.
 */

export type DetectionMode = "ws" | "poll-evm" | "poll-tron" | "poll-utxo";

export interface EvmChainConfig {
  network: string;
  nativeSymbol: string;
  detectionMode: "ws" | "poll-evm";
  /** wss:// URL for detectionMode 'ws' chains only (PublicNode). */
  wsUrl?: string;
  /**
   * Contract address per ERC20-style token symbol on this chain.
   * CRITICAL: copied from apps/sweeper/src/chains/registry.ts's own
   * EVM_TOKEN_CONTRACTS, which carries the same warning - verify every
   * address below against the official token list / block explorer for its
   * chain before trusting this for auto-crediting. Treat as unverified
   * placeholders where not independently re-checked here.
   */
  tokenContracts: Record<string, string>;
}

export const EVM_CHAINS: EvmChainConfig[] = [
  {
    network: "ERC20",
    nativeSymbol: "ETH",
    detectionMode: "ws",
    wsUrl: "wss://ethereum.publicnode.com",
    tokenContracts: {
      USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    },
  },
  {
    network: "BEP20",
    nativeSymbol: "BNB",
    detectionMode: "ws",
    wsUrl: "wss://bsc.publicnode.com",
    tokenContracts: { USDT: "0x55d398326f99059fF775485246999027B3197955" },
  },
  {
    network: "Polygon",
    nativeSymbol: "POL",
    detectionMode: "ws",
    wsUrl: "wss://polygon.publicnode.com",
    tokenContracts: {},
  },
  {
    network: "Avalanche",
    nativeSymbol: "AVAX",
    detectionMode: "ws",
    wsUrl: "wss://avalanche.publicnode.com",
    tokenContracts: {},
  },
  {
    network: "Arbitrum",
    nativeSymbol: "ETH",
    detectionMode: "ws",
    wsUrl: "wss://arbitrum.publicnode.com",
    tokenContracts: {
      USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    },
  },
  {
    network: "Optimism",
    nativeSymbol: "ETH",
    detectionMode: "ws",
    wsUrl: "wss://optimism.publicnode.com",
    tokenContracts: {
      USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
      USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    },
  },
  {
    network: "Base",
    nativeSymbol: "ETH",
    detectionMode: "ws",
    wsUrl: "wss://base.publicnode.com",
    tokenContracts: { USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
  },
  // --- Poll-only EVM chains: no confirmed free WS provider (2026-09-07) ---
  {
    network: "Celo",
    nativeSymbol: "CELO",
    detectionMode: "poll-evm",
    tokenContracts: {},
  },
  {
    network: "Flare",
    nativeSymbol: "FLR",
    detectionMode: "poll-evm",
    tokenContracts: {},
  },
  {
    network: "Fantom",
    nativeSymbol: "FTM",
    detectionMode: "poll-evm",
    tokenContracts: {},
  },
  {
    network: "Cronos",
    nativeSymbol: "CRO",
    detectionMode: "poll-evm",
    tokenContracts: {},
  },
  {
    network: "Ethereum Classic",
    nativeSymbol: "ETC",
    detectionMode: "poll-evm",
    tokenContracts: {},
  },
  {
    network: "Kaia",
    nativeSymbol: "KAIA",
    detectionMode: "poll-evm",
    tokenContracts: {},
  },
  {
    network: "XDC Network",
    nativeSymbol: "XDC",
    detectionMode: "poll-evm",
    tokenContracts: {},
  },
];

// keccak256("Transfer(address,address,uint256)") - the ERC20/TRC20 Transfer
// event topic0, identical across every EVM/TVM chain since it's just a hash
// of the event signature string, not chain-specific.
export const TRANSFER_EVENT_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export const TRON_NETWORK = "TRC20";
export const TRON_NATIVE_SYMBOL = "TRX";
// Reused verbatim from apps/sweeper/src/chains/tron.ts's own TRC20_CONTRACTS
// - that file's comment documents why this is trusted (official USDT
// contract, ~$40B/24h volume, 76M holders) rather than a fresh guess here.
export const TRON_USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

export interface UtxoChainConfig {
  network: string;
  nativeSymbol: string;
  /** BlockCypher's own chain path segment, e.g. 'btc' in /v1/btc/main. */
  blockcypherChain: string;
}

export const UTXO_CHAINS: UtxoChainConfig[] = [
  { network: "Bitcoin", nativeSymbol: "BTC", blockcypherChain: "btc" },
  { network: "Litecoin", nativeSymbol: "LTC", blockcypherChain: "ltc" },
  { network: "Dogecoin", nativeSymbol: "DOGE", blockcypherChain: "doge" },
];
