/**
 * The 17 Tier 1/2 coins Veyro supports (docs/planning-history.md's Sweeper
 * section) - deliberately not padded to 25 with Tier 3 chains. Layer 2s
 * (Arbitrum, Optimism, Base) are additional network options under the
 * existing ETH/USDT/USDC entries below, not separate top-level coins.
 * This is the source of truth for what apps/web's public asset list
 * (apps/web/src/lib/crypto/data.ts) and the crypto_assets seed migration
 * should both mirror - keep all three in sync when a coin/network changes.
 */

export interface CoinNetworkOption {
  /** Matches a key in CHAIN_CONFIGS and crypto_assets.network. */
  network: string;
  label: string;
}

export interface CoinDefinition {
  symbol: string;
  name: string;
  tier: 1 | 2;
  networks: CoinNetworkOption[];
}

export const SUPPORTED_COINS: CoinDefinition[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    tier: 1,
    networks: [{ network: 'Bitcoin', label: 'Bitcoin' }],
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    tier: 1,
    networks: [
      { network: 'ERC20', label: 'Ethereum (ERC20)' },
      { network: 'Arbitrum', label: 'Arbitrum' },
      { network: 'Optimism', label: 'Optimism' },
      { network: 'Base', label: 'Base' },
    ],
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    tier: 1,
    networks: [
      { network: 'ERC20', label: 'Ethereum (ERC20)' },
      { network: 'TRC20', label: 'Tron (TRC20)' },
      { network: 'BEP20', label: 'BNB Smart Chain (BEP20)' },
      { network: 'Arbitrum', label: 'Arbitrum' },
      { network: 'Optimism', label: 'Optimism' },
      { network: 'Base', label: 'Base' },
    ],
  },
  {
    symbol: 'BNB',
    name: 'BNB',
    tier: 1,
    networks: [{ network: 'BEP20', label: 'BNB Smart Chain (BEP20)' }],
  },
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    tier: 1,
    networks: [{ network: 'Dogecoin', label: 'Dogecoin' }],
  },
  {
    symbol: 'POL',
    name: 'Polygon',
    tier: 2,
    networks: [{ network: 'Polygon', label: 'Polygon' }],
  },
  {
    symbol: 'AVAX',
    name: 'Avalanche',
    tier: 2,
    networks: [{ network: 'Avalanche', label: 'Avalanche C-Chain' }],
  },
  {
    symbol: 'CELO',
    name: 'Celo',
    tier: 2,
    networks: [{ network: 'Celo', label: 'Celo' }],
  },
  {
    symbol: 'FLR',
    name: 'Flare',
    tier: 2,
    networks: [{ network: 'Flare', label: 'Flare' }],
  },
  {
    symbol: 'FTM',
    name: 'Fantom',
    tier: 2,
    networks: [{ network: 'Fantom', label: 'Fantom' }],
  },
  {
    symbol: 'CRO',
    name: 'Cronos',
    tier: 2,
    networks: [{ network: 'Cronos', label: 'Cronos' }],
  },
  {
    symbol: 'ETC',
    name: 'Ethereum Classic',
    tier: 2,
    networks: [{ network: 'Ethereum Classic', label: 'Ethereum Classic' }],
  },
  {
    symbol: 'KAIA',
    name: 'Kaia',
    tier: 2,
    networks: [{ network: 'Kaia', label: 'Kaia' }],
  },
  {
    symbol: 'XDC',
    name: 'XDC Network',
    tier: 2,
    networks: [{ network: 'XDC Network', label: 'XDC Network' }],
  },
  {
    symbol: 'LTC',
    name: 'Litecoin',
    tier: 1,
    networks: [{ network: 'Litecoin', label: 'Litecoin' }],
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    tier: 1,
    networks: [
      { network: 'ERC20', label: 'Ethereum (ERC20)' },
      { network: 'Arbitrum', label: 'Arbitrum' },
      { network: 'Optimism', label: 'Optimism' },
      { network: 'Base', label: 'Base' },
    ],
  },
  {
    symbol: 'TRX',
    name: 'Tron',
    tier: 1,
    networks: [{ network: 'TRC20', label: 'Tron (TRC20)' }],
  },
];
