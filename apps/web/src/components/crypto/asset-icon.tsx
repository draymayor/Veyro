import {
  TokenBTC,
  TokenETH,
  TokenUSDT,
  TokenBNB,
  TokenDOGE,
  TokenPOL,
  TokenAVAX,
  TokenCELO,
  TokenFLR,
  TokenETC,
  TokenKLAY,
  TokenXDC,
  TokenLTC,
  TokenUSDC,
  TokenTRX,
  NetworkBitcoin,
  NetworkEthereum,
  NetworkTron,
  NetworkBinanceSmartChain,
  NetworkPolygon,
  NetworkAvalanche,
  NetworkCelo,
  NetworkFlare,
  NetworkEthereumClassic,
  NetworkKaia,
  NetworkXdc,
  NetworkLitecoin,
  NetworkArbitrumOne,
  NetworkOptimism,
  NetworkBase,
} from "@web3icons/react";
import type { NetworkIconKey, TokenIconKey } from "@/lib/crypto/data";

const TOKEN_ICONS: Record<TokenIconKey, typeof TokenBTC> = {
  BTC: TokenBTC,
  ETH: TokenETH,
  USDT: TokenUSDT,
  BNB: TokenBNB,
  DOGE: TokenDOGE,
  POL: TokenPOL,
  AVAX: TokenAVAX,
  CELO: TokenCELO,
  FLR: TokenFLR,
  ETC: TokenETC,
  // web3icons has not published a rebranded KAIA token icon yet (Kaia is
  // Klaytn's 2024 rebrand) - TokenKLAY is the closest available icon.
  // Swap to a KAIA-specific icon once web3icons adds one.
  KAIA: TokenKLAY,
  XDC: TokenXDC,
  LTC: TokenLTC,
  USDC: TokenUSDC,
  TRX: TokenTRX,
};

const NETWORK_ICONS: Record<NetworkIconKey, typeof NetworkBitcoin> = {
  Bitcoin: NetworkBitcoin,
  Ethereum: NetworkEthereum,
  Tron: NetworkTron,
  BinanceSmartChain: NetworkBinanceSmartChain,
  Polygon: NetworkPolygon,
  Avalanche: NetworkAvalanche,
  Celo: NetworkCelo,
  Flare: NetworkFlare,
  EthereumClassic: NetworkEthereumClassic,
  Kaia: NetworkKaia,
  Xdc: NetworkXdc,
  Litecoin: NetworkLitecoin,
  Arbitrum: NetworkArbitrumOne,
  Optimism: NetworkOptimism,
  Base: NetworkBase,
};

interface AssetIconProps {
  iconKey: TokenIconKey;
  className?: string;
}

export function AssetIcon({ iconKey, className }: AssetIconProps) {
  const Icon = TOKEN_ICONS[iconKey];
  return <Icon variant="branded" className={className} />;
}

interface NetworkBadgeIconProps {
  iconKey?: NetworkIconKey;
  className?: string;
}

export function NetworkBadgeIcon({
  iconKey,
  className,
}: NetworkBadgeIconProps) {
  if (!iconKey) return null;
  const Icon = NETWORK_ICONS[iconKey];
  return <Icon variant="mono" className={className} />;
}
