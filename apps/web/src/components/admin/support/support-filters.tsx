"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SUPPORT_CATEGORIES } from "@/lib/support/categories";
import { SUPPORT_STATUS_OPTIONS } from "@/lib/admin/support/types";

const SELECT_CLASS =
  "border-border bg-card text-ink h-9 rounded-lg border px-3 text-sm font-medium outline-none focus-visible:border-ring";

/**
 * Status and category filters for the Support Inbox thread list
 * (docs/admin-guide.md), URL-driven like the User Management filters so
 * this stays a plain server component re-fetching GET /admin/support/threads
 * on navigation.
 */
export function SupportFilters() {
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
        {SUPPORT_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by category"
        className={SELECT_CLASS}
        value={searchParams.get("category") ?? ""}
        onChange={(e) => setParam("category", e.target.value)}
      >
        <option value="">All categories</option>
        {SUPPORT_CATEGORIES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
