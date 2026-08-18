import type { ReactNode } from "react";
import { AssetIcon } from "@/components/crypto/asset-icon";
import { PriceChangeBadge } from "@/components/crypto/price-change-badge";
import { PriceSparkline } from "@/components/crypto/price-sparkline";
import { splitPriceUsd, type TokenIconKey } from "@/lib/crypto/data";
import type { CryptoRate } from "@/lib/crypto/use-crypto-rates";
import { cn } from "@/lib/utils";

interface CryptoPriceCardProps {
  iconKey: TokenIconKey;
  name: string;
  symbol: string;
  rate: CryptoRate | undefined;
  loading: boolean;
  error: boolean;
  className?: string;
  /** DOM id for GSAP Flip to match this card across re-renders (search filtering). */
  flipId?: string;
  /** Extra content next to the icon/name row, e.g. a network selector. */
  headerRight?: ReactNode;
  /** Extra content below the chart, e.g. payout preview and a sell link. */
  children?: ReactNode;
}

function PriceDisplay({ value }: { value: number }) {
  const { whole, decimals } = splitPriceUsd(value);
  return (
    <span className="font-heading text-background tabular-nums">
      <span className="text-2xl font-semibold">${whole}</span>
      <span className="text-background/50 text-base font-medium">
        .{decimals}
      </span>
    </span>
  );
}

/**
 * Dark glassmorphic card shared by the homepage crypto carousel and the
 * /crypto page's rate browser, so both surfaces show live prices with the
 * same visual language. Reuses the app's established "light text on a dark
 * surface" pattern (text-background over bg-ink) from the auth pages'
 * visual panel, rather than introducing raw white/black utilities.
 */
export function CryptoPriceCard({
  iconKey,
  name,
  symbol,
  rate,
  loading,
  error,
  className,
  flipId,
  headerRight,
  children,
}: CryptoPriceCardProps) {
  const hasRate = !loading && !error && !!rate;

  return (
    <div
      data-flip-id={flipId}
      className={cn(
        "bg-ink relative flex flex-col gap-4 overflow-hidden rounded-[1.4rem] border border-white/10 p-5 shadow-[0_20px_45px_rgba(0,0,0,0.35)]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent"
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="bg-background/10 relative flex size-10 items-center justify-center rounded-full p-2">
            <AssetIcon iconKey={iconKey} className="size-full" />
          </span>
          <div>
            <p className="text-background text-sm font-medium">{name}</p>
            <p className="text-background/45 text-xs tracking-wide uppercase">
              {symbol}
            </p>
          </div>
        </div>
        {headerRight}
      </div>

      <div className="relative flex items-center gap-2">
        {loading && (
          <div className="h-7 w-28 animate-pulse rounded-md bg-white/10" />
        )}
        {!loading && error && (
          <span className="text-background/40 text-sm">Price unavailable</span>
        )}
        {hasRate && (
          <>
            <PriceDisplay value={rate.priceUsd} />
            <PriceChangeBadge change={rate.change24h} />
          </>
        )}
      </div>

      <div className="relative -mx-1 h-16">
        {hasRate ? (
          <PriceSparkline
            history={rate.history}
            positive={rate.change24h >= 0}
            className="h-full w-full"
          />
        ) : (
          <div className="h-full w-full rounded-lg bg-white/5" />
        )}
      </div>

      {children && <div className="relative">{children}</div>}
    </div>
  );
}
