import Link from "next/link";
import { GiftIcon, ArrowRightCircleIcon } from "@heroicons/react/24/solid";

interface EarnBannerProps {
  /** Admin-set total pool size in USD (platform_settings.earn_pool_total_usd), shown as USDT - display-only relabel. */
  poolTotalUsd: number;
}

function formatUsdt(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")}`;
}

/**
 * Full-width promo banner routing into the Earn page, sitting directly
 * under SellEntryCards. Reads the live pool size the same way EarnOptionsCard
 * does (platform_settings.earn_pool_total_usd, never hardcoded).
 */
export function EarnBanner({ poolTotalUsd }: EarnBannerProps) {
  return (
    <Link
      href="/earn"
      className="bg-primary hover:bg-primary/90 group flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 transition-colors sm:px-5"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15">
          <GiftIcon className="size-4.5 text-white" aria-hidden="true" />
        </span>
        <span className="animate-gentle-pulse font-heading min-w-0 truncate text-sm font-medium text-white sm:text-base">
          Earn from {formatUsdt(poolTotalUsd)} USDT pool
        </span>
      </span>

      <ArrowRightCircleIcon
        className="size-5 shrink-0 text-white/80 transition-colors group-hover:text-white sm:size-6"
        aria-hidden="true"
      />
    </Link>
  );
}
