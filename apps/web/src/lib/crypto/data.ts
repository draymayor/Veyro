/**
 * Crypto asset and network identity for the public /crypto page. Shaped to
 * mirror docs/database-schema.md's crypto_assets table (symbol, network,
 * deposit address, is_active). Live price data (current price, 24h change,
 * 7-day history) is not stored here: it comes from GET /crypto/rates via
 * useCryptoRates, keyed by symbol, and merged in at render time. Rates
 * below (rateNgnPerUsd) are Platform Rates, manually set per
 * docs/product-rules.md, not derived from live price data.
 */

export interface CryptoNetwork {
  /** Stable id used in the /sell?asset=X&network=Y placeholder link. */
  id: string;
  /** Short label shown on the network badge/selector, e.g. "TRC20". */
  label: string;
  /** Full name shown in expanded contexts, e.g. "Tron (TRC20)". */
  fullName: string;
  /** Key into NETWORK_ICONS, when a @web3icons/react network icon exists. */
  iconKey?: NetworkIconKey;
  /**
   * Platform Rate, NGN per 1 USD of asset value on this network. Varies by
   * network per docs/product-rules.md #16: USDT-TRC20 and USDT-ERC20 are
   * never assumed interchangeable, including on rate.
   */
  rateNgnPerUsd: number;
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
  "BTC" | "ETH" | "USDT" | "BNB" | "SOL" | "XRP" | "DOGE";

export type NetworkIconKey =
  "Bitcoin" | "Ethereum" | "Tron" | "BinanceSmartChain" | "Solana" | "Xrp";

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
        rateNgnPerUsd: 1615,
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
        rateNgnPerUsd: 1600,
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
        rateNgnPerUsd: 1590,
      },
      {
        id: "erc20",
        label: "ERC20",
        fullName: "Ethereum (ERC20)",
        iconKey: "Ethereum",
        rateNgnPerUsd: 1560,
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
        rateNgnPerUsd: 1580,
      },
    ],
  },
  {
    id: "sol",
    symbol: "SOL",
    name: "Solana",
    iconKey: "SOL",
    networks: [
      {
        id: "solana",
        label: "Solana",
        fullName: "Solana Network",
        iconKey: "Solana",
        rateNgnPerUsd: 1605,
      },
    ],
  },
  {
    id: "xrp",
    symbol: "XRP",
    name: "XRP",
    iconKey: "XRP",
    networks: [
      {
        id: "xrpl",
        label: "XRP Ledger",
        fullName: "XRP Ledger",
        iconKey: "Xrp",
        rateNgnPerUsd: 1550,
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
        rateNgnPerUsd: 1520,
      },
    ],
  },
];

export function payoutFor(priceUsd: number, network: CryptoNetwork): number {
  return priceUsd * network.rateNgnPerUsd;
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

export function formatNgn(value: number): string {
  if (value >= 100_000) {
    return `\u{20A6}${new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)}`;
  }
  return `\u{20A6}${Math.round(value).toLocaleString("en-US")}`;
}
