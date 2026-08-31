"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  WITHDRAWAL_STATUS_OPTIONS,
  WITHDRAWAL_METHOD_OPTIONS,
} from "@/lib/admin/withdrawals/filters";

const SELECT_CLASS =
  "border-border bg-card text-ink h-9 rounded-lg border px-3 text-sm font-medium outline-none focus-visible:border-ring";

/**
 * Status/method filters for the Payout Processing queue
 * (docs/admin-guide.md), same URL-driven approach as the Trade Review
 * queue's TradeFilters: this stays a plain server component re-fetching
 * GET /admin/withdrawals on navigation.
 */
export function WithdrawalFilters() {
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
        {WITHDRAWAL_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by method"
        className={SELECT_CLASS}
        value={searchParams.get("method") ?? ""}
        onChange={(e) => setParam("method", e.target.value)}
      >
        <option value="">All methods</option>
        {WITHDRAWAL_METHOD_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
