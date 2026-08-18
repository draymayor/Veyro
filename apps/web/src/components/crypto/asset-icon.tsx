import {
  TokenBTC,
  TokenETH,
  TokenUSDT,
  TokenBNB,
  TokenSOL,
  TokenXRP,
  TokenDOGE,
  NetworkBitcoin,
  NetworkEthereum,
  NetworkTron,
  NetworkBinanceSmartChain,
  NetworkSolana,
  NetworkXrp,
} from "@web3icons/react";
import type { NetworkIconKey, TokenIconKey } from "@/lib/crypto/data";

const TOKEN_ICONS: Record<TokenIconKey, typeof TokenBTC> = {
  BTC: TokenBTC,
  ETH: TokenETH,
  USDT: TokenUSDT,
  BNB: TokenBNB,
  SOL: TokenSOL,
  XRP: TokenXRP,
  DOGE: TokenDOGE,
};

const NETWORK_ICONS: Record<NetworkIconKey, typeof NetworkBitcoin> = {
  Bitcoin: NetworkBitcoin,
  Ethereum: NetworkEthereum,
  Tron: NetworkTron,
  BinanceSmartChain: NetworkBinanceSmartChain,
  Solana: NetworkSolana,
  Xrp: NetworkXrp,
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
