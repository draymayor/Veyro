"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  TRANSACTION_TYPE_OPTIONS,
  TRANSACTION_SOURCE_OPTIONS,
  TRANSACTION_SORT_OPTIONS,
} from "@/lib/admin/transactions/filters";
import { TransactionUserFilter } from "./transaction-user-filter";
import type { AdminUserListItem } from "@/lib/admin/users/types";

const SELECT_CLASS =
  "border-border bg-card text-ink h-9 rounded-lg border px-3 text-sm font-medium outline-none focus-visible:border-ring";

const DATE_INPUT_CLASS =
  "border-border bg-card text-ink h-9 rounded-lg border px-2 text-sm outline-none focus-visible:border-ring";

interface TransactionFiltersProps {
  initialSelectedUser: AdminUserListItem | null;
}

// Type/source/date-range/sort filters for the All Transactions View
// (docs/admin-guide.md), same URL-driven approach as every other admin
// queue's filter bar: this stays a plain server component re-fetching
// GET /admin/transactions on navigation. All filters compose (they map
// straight onto AND'd query params the backend applies together), so
// e.g. a user + type + date range narrows correctly, not just one at a
// time.
export function TransactionFilters({
  initialSelectedUser,
}: TransactionFiltersProps) {
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
    <div className="flex flex-wrap items-center gap-2">
      <TransactionUserFilter
        key={searchParams.get("userId") ?? "none"}
        initialSelectedUser={initialSelectedUser}
      />

      <select
        aria-label="Filter by type"
        className={SELECT_CLASS}
        value={searchParams.get("type") ?? ""}
        onChange={(e) => setParam("type", e.target.value)}
      >
        <option value="">All types</option>
        {TRANSACTION_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by source"
        className={SELECT_CLASS}
        value={searchParams.get("source") ?? ""}
        onChange={(e) => setParam("source", e.target.value)}
      >
        <option value="">All sources</option>
        {TRANSACTION_SOURCE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <input
        aria-label="From date"
        type="date"
        className={DATE_INPUT_CLASS}
        value={searchParams.get("dateFrom") ?? ""}
        onChange={(e) => setParam("dateFrom", e.target.value)}
      />
      <span className="text-ink/40 text-xs">to</span>
      <input
        aria-label="To date"
        type="date"
        className={DATE_INPUT_CLASS}
        value={searchParams.get("dateTo") ?? ""}
        onChange={(e) => setParam("dateTo", e.target.value)}
      />

      <select
        aria-label="Sort by date"
        className={SELECT_CLASS}
        value={searchParams.get("sort") ?? "desc"}
        onChange={(e) => setParam("sort", e.target.value)}
      >
        {TRANSACTION_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
