"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  TRADE_STATUS_OPTIONS,
  TRADE_ASSET_TYPE_OPTIONS,
} from "@/lib/admin/trades/filters";

const SELECT_CLASS =
  "border-border bg-card text-ink h-9 rounded-lg border px-3 text-sm font-medium outline-none focus-visible:border-ring";

/**
 * Status/asset-type filters for the Trade Review queue (docs/admin-guide.md:
 * "One queue, filterable by asset type and status"). Drives the URL's
 * search params rather than local state, so the list itself stays a plain
 * server component re-fetching GET /admin/trades on navigation, no client
 * data-fetching duplication.
 */
export function TradeFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select
        aria-label="Filter by status"
        className={SELECT_CLASS}
        value={searchParams.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
      >
        <option value="">All statuses</option>
        {TRADE_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by asset type"
        className={SELECT_CLASS}
        value={searchParams.get("assetType") ?? ""}
        onChange={(e) => setParam("assetType", e.target.value)}
      >
        <option value="">Gift Card + Crypto</option>
        {TRADE_ASSET_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
