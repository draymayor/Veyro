"use client";

import { useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { ACCOUNT_STATUS_OPTIONS } from "@/lib/admin/users/filters";

const SEARCH_DEBOUNCE_MS = 400;

const SELECT_CLASS =
  "border-border bg-card text-ink h-9 rounded-lg border px-3 text-sm font-medium outline-none focus-visible:border-ring";

/**
 * Search (name/email/id) plus account-status filter for the User
 * Management list (docs/admin-guide.md). Same URL-driven approach as the
 * Trade Review/Payout Processing queues, this stays a plain server
 * component re-fetching GET /admin/users on navigation.
 */
export function UserFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function setSearchDebounced(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => setParam("search", value),
      SEARCH_DEBOUNCE_MS,
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <label className="border-border bg-card focus-within:ring-ring/40 flex h-9 items-center gap-2 rounded-lg border px-3 focus-within:ring-3">
        <MagnifyingGlassIcon
          className="text-ink/35 size-4 shrink-0"
          aria-hidden="true"
        />
        <input
          type="search"
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => setSearchDebounced(e.target.value)}
          placeholder="Search name, email, or id"
          className="text-ink placeholder:text-ink/35 w-48 bg-transparent text-sm outline-none"
        />
      </label>

      <select
        aria-label="Filter by account status"
        className={SELECT_CLASS}
        value={searchParams.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
      >
        <option value="">All statuses</option>
        {ACCOUNT_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
