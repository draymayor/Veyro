import { AssetIcon } from "@/components/crypto/asset-icon";
import { PriceChangeBadge } from "@/components/crypto/price-change-badge";
import { splitPriceUsd, type CryptoAsset } from "@/lib/crypto/data";
import type { CryptoRate } from "@/lib/crypto/use-crypto-rates";

interface CryptoRateRowProps {
  asset: CryptoAsset;
  rate: CryptoRate | undefined;
  loading: boolean;
  error: boolean;
}

export function CryptoRateRow({
  asset,
  rate,
  loading,
  error,
}: CryptoRateRowProps) {
  const hasRate = !loading && !error && !!rate;
  const price = hasRate ? splitPriceUsd(rate.priceUsd) : null;

  return (
    // Home's Crypto tab is a live rate ticker only (docs/context.md) - no
    // navigation on tap here, unlike the real Sell Crypto asset picker
    // which uses its own separate row component.
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-2xl px-4 py-4 sm:px-5">
      <span className="flex min-w-0 items-center gap-3">
        <span className="bg-secondary flex size-9 shrink-0 items-center justify-center rounded-full p-1.5">
          <AssetIcon iconKey={asset.iconKey} className="size-full" />
        </span>
        <span className="min-w-0">
          <span className="text-ink block text-sm font-medium">
            {asset.name}
          </span>
          <span className="text-ink/40 block text-xs tracking-wide uppercase">
            {asset.symbol}
          </span>
        </span>
      </span>

      <span className="text-ink justify-self-end text-right text-sm font-medium tabular-nums">
        {loading && (
          <span className="bg-secondary inline-block h-4 w-16 animate-pulse rounded" />
        )}
        {!loading && (price ? `$${price.whole}.${price.decimals}` : "$0.00")}
      </span>

      <span className="min-w-16 justify-self-end">
        {hasRate && <PriceChangeBadge change={rate.change24h} />}
      </span>
    </div>
  );
}
