/**
 * Crypto asset and network identity for the public /crypto page. Shaped to
 * mirror docs/database-schema.md's crypto_assets table (symbol, network,
 * margin_percentage, is_active), and mirrors the Tier 1/2 coin list in
 * apps/api/src/crypto-addresses/coins.config.ts - keep both in sync when a
 * coin/network changes. Arbitrum/Optimism/Base are additional network
 * options under ETH/USDT/USDC, not separate top-level coins.
 *
 * Deposit addresses are never stored here: Deposit Crypto and Sell Crypto
 * both fetch the signed-in user's real address (and destination
 * tag/memo, where the chain uses one) live from
 * GET /crypto-addresses/:symbol/:network via useDepositAddress
 * (lib/crypto/use-deposit-address.ts), which resolves to a real
 * Tatum-derived address server-side. `assetNetwork` below is the exact
 * string that call must send - it has to match crypto_assets.network on
 * this project exactly (verified against the live table), which does not
 * always equal `label` or `fullName` (e.g. BTC's fullName is "Bitcoin
 * Network" for display, but crypto_assets.network is "BTC").
 *
 * Live price data (current price, 24h change, 7-day history) is not
 * stored here either: it comes from GET /crypto/rates via useCryptoRates,
 * keyed by symbol, and merged in at render time. Payout figures (what
 * Veyro would actually pay) are not computed here either, they come from
 * GET /crypto/payout via useCryptoPayout, which applies the live FX rate
 * server-side, since both that and API keys have to stay server-side.
 */

export interface CryptoNetwork {
  /** Stable id used in the sell flow's routes and query params. */
  id: string;
  /** Short label shown on the network badge/selector, e.g. "TRC20". */
  label: string;
  /** Full name shown in expanded contexts, e.g. "Tron (TRC20)". */
  fullName: string;
  /** Key into NETWORK_ICONS, when a @web3icons/react network icon exists. */
  iconKey?: NetworkIconKey;
  /**
   * The exact value of crypto_assets.network for this asset/network pair
   * on the live project - what GET /crypto-addresses/:symbol/:network
   * must be called with. Not a display string; do not use this for UI
   * copy, use `label`/`fullName` instead. A pair with no matching
   * crypto_assets row yet (e.g. some of the additional EVM L2 options
   * below) still carries a best-guess value here - the real endpoint
   * correctly rejects it with a clear "not supported" error rather than
   * ever falling back to a fake address.
   */
  assetNetwork: string;
}

export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  /** Key into TOKEN_ICONS. */
  iconKey: TokenIconKey;
  networks: CryptoNetwork[];
}

export type TokenIconKey =
  | "BTC"
  | "ETH"
  | "USDT"
  | "BNB"
  | "DOGE"
  | "POL"
  | "AVAX"
  | "CELO"
  | "FLR"
  | "ETC"
  | "KAIA"
  | "XDC"
  | "LTC"
  | "USDC"
  | "TRX";

export type NetworkIconKey =
  | "Bitcoin"
  | "Ethereum"
  | "Tron"
  | "BinanceSmartChain"
  | "Polygon"
  | "Avalanche"
  | "Celo"
  | "Flare"
  | "EthereumClassic"
  | "Kaia"
  | "Xdc"
  | "Litecoin"
  | "Arbitrum"
  | "Optimism"
  | "Base";

export const CRYPTO_ASSETS: CryptoAsset[] = [
  {
    id: "btc",
    symbol: "BTC",
    name: "Bitcoin",
    iconKey: "BTC",
    networks: [
      {
        id: "bitcoin",
        label: "Bitcoin",
        fullName: "Bitcoin Network",
        iconKey: "Bitcoin",
        assetNetwork: "BTC",
      },
    ],
  },
  {
    id: "eth",
    symbol: "ETH",
    name: "Ethereum",
    iconKey: "ETH",
    networks: [
      {
        id: "erc20",
        label: "ERC20",
        fullName: "Ethereum (ERC20)",
        iconKey: "Ethereum",
        assetNetwork: "Ethereum (ERC20)",
      },
      {
        id: "arbitrum",
        label: "Arbitrum",
        fullName: "Arbitrum One",
        iconKey: "Arbitrum",
        assetNetwork: "Arbitrum One",
      },
      {
        id: "optimism",
        label: "Optimism",
        fullName: "Optimism",
        iconKey: "Optimism",
        assetNetwork: "Optimism",
      },
      {
        id: "base",
        label: "Base",
        fullName: "Base",
        iconKey: "Base",
        assetNetwork: "Base",
      },
    ],
  },
  {
    id: "usdt",
    symbol: "USDT",
    name: "Tether",
    iconKey: "USDT",
    networks: [
      {
        id: "trc20",
        label: "TRC20",
        fullName: "Tron (TRC20)",
        iconKey: "Tron",
        assetNetwork: "TRON (TRC20)",
      },
      {
        id: "erc20",
        label: "ERC20",
        fullName: "Ethereum (ERC20)",
        iconKey: "Ethereum",
        assetNetwork: "Ethereum (ERC20)",
      },
      {
        id: "bep20",
        label: "BEP20",
        fullName: "BNB Smart Chain (BEP20)",
        iconKey: "BinanceSmartChain",
        assetNetwork: "BSC (BEP20)",
      },
      {
        id: "arbitrum",
        label: "Arbitrum",
        fullName: "Arbitrum One",
        iconKey: "Arbitrum",
        assetNetwork: "Arbitrum One",
      },
      {
        id: "optimism",
        label: "Optimism",
        fullName: "Optimism",
        iconKey: "Optimism",
        assetNetwork: "Optimism",
      },
      {
        id: "base",
        label: "Base",
        fullName: "Base",
        iconKey: "Base",
        assetNetwork: "Base",
      },
    ],
  },
  {
    id: "bnb",
    symbol: "BNB",
    name: "BNB",
    iconKey: "BNB",
    networks: [
      {
        id: "bep20",
        label: "BEP20",
        fullName: "BNB Smart Chain (BEP20)",
        iconKey: "BinanceSmartChain",
        assetNetwork: "BSC (BEP20)",
      },
    ],
  },
  {
    id: "doge",
    symbol: "DOGE",
    name: "Dogecoin",
    iconKey: "DOGE",
    networks: [
      {
        id: "dogecoin",
        label: "Dogecoin",
        fullName: "Dogecoin Network",
        assetNetwork: "Dogecoin",
      },
    ],
  },
  {
    id: "pol",
    symbol: "POL",
    name: "Polygon",
    iconKey: "POL",
    networks: [
      {
        id: "polygon",
        label: "Polygon",
        fullName: "Polygon PoS",
        iconKey: "Polygon",
        assetNetwork: "Polygon PoS",
      },
      {
        id: "erc20",
        label: "ERC20",
        fullName: "Ethereum (ERC20)",
        iconKey: "Ethereum",
        assetNetwork: "Ethereum (ERC20)",
      },
    ],
  },
  {
    id: "avax",
    symbol: "AVAX",
    name: "Avalanche",
    iconKey: "AVAX",
    networks: [
      {
        id: "avalanche",
        label: "Avalanche C-Chain",
        fullName: "Avalanche C-Chain",
        iconKey: "Avalanche",
        assetNetwork: "AVAX",
      },
    ],
  },
  {
    id: "celo",
    symbol: "CELO",
    name: "Celo",
    iconKey: "CELO",
    networks: [
      {
        id: "celo",
        label: "Celo",
        fullName: "Celo",
        iconKey: "Celo",
        assetNetwork: "CELO",
      },
    ],
  },
  {
    id: "flr",
    symbol: "FLR",
    name: "Flare",
    iconKey: "FLR",
    networks: [
      {
        id: "flare",
        label: "Flare",
        fullName: "Flare",
        iconKey: "Flare",
        assetNetwork: "FLR",
      },
    ],
  },
  {
    id: "etc",
    symbol: "ETC",
    name: "Ethereum Classic",
    iconKey: "ETC",
    networks: [
      {
        id: "ethereum-classic",
        label: "Ethereum Classic",
        fullName: "Ethereum Classic",
        iconKey: "EthereumClassic",
        assetNetwork: "Ethereum Classic",
      },
    ],
  },
  {
    id: "kaia",
    symbol: "KAIA",
    name: "Kaia",
    iconKey: "KAIA",
    networks: [
      {
        id: "kaia",
        label: "Kaia",
        fullName: "Kaia",
        iconKey: "Kaia",
        assetNetwork: "KAIA",
      },
    ],
  },
  {
    id: "xdc",
    symbol: "XDC",
    name: "XDC Network",
    iconKey: "XDC",
    networks: [
      {
        id: "xdc-network",
        label: "XDC Network",
        fullName: "XDC Network",
        iconKey: "Xdc",
        assetNetwork: "XDC",
      },
    ],
  },
  {
    id: "ltc",
    symbol: "LTC",
    name: "Litecoin",
    iconKey: "LTC",
    networks: [
      {
        id: "litecoin",
        label: "Litecoin",
        fullName: "Litecoin Network",
        iconKey: "Litecoin",
        assetNetwork: "LTC",
      },
    ],
  },
  {
    id: "usdc",
    symbol: "USDC",
    name: "USD Coin",
    iconKey: "USDC",
    networks: [
      {
        id: "erc20",
        label: "ERC20",
        fullName: "Ethereum (ERC20)",
        iconKey: "Ethereum",
        assetNetwork: "Ethereum (ERC20)",
      },
      {
        id: "arbitrum",
        label: "Arbitrum",
        fullName: "Arbitrum One",
        iconKey: "Arbitrum",
        assetNetwork: "Arbitrum One",
      },
      {
        id: "optimism",
        label: "Optimism",
        fullName: "Optimism",
        iconKey: "Optimism",
        assetNetwork: "Optimism",
      },
      {
        id: "base",
        label: "Base",
        fullName: "Base",
        iconKey: "Base",
        assetNetwork: "Base",
      },
    ],
  },
  {
    id: "trx",
    symbol: "TRX",
    name: "Tron",
    iconKey: "TRX",
    networks: [
      {
        id: "trc20",
        label: "TRC20",
        fullName: "Tron (TRC20)",
        iconKey: "Tron",
        assetNetwork: "TRON (TRC20)",
      },
    ],
  },
];

export function assetById(id: string): CryptoAsset | undefined {
  return CRYPTO_ASSETS.find((asset) => asset.id === id);
}

/** crypto_wallets.symbol is always the uppercase ticker (e.g. "BTC"), unlike `id` which is lowercase. */
export function assetBySymbol(symbol: string): CryptoAsset | undefined {
  return CRYPTO_ASSETS.find((asset) => asset.symbol === symbol.toUpperCase());
}

export function networkById(
  asset: CryptoAsset,
  id: string | undefined,
): CryptoNetwork {
  return (
    asset.networks.find((network) => network.id === id) ?? asset.networks[0]
  );
}

export function formatUsd(value: number): string {
  const decimals = value < 1 ? 4 : 2;
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Splits a USD price into whole and decimal parts so callers can style
 * them at different sizes (large whole number, smaller decimals).
 */
export function splitPriceUsd(value: number): {
  whole: string;
  decimals: string;
} {
  const decimalPlaces = value < 1 ? 4 : 2;
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
  const [whole, decimals] = formatted.split(".");
  return { whole, decimals: decimals ?? "00" };
}
