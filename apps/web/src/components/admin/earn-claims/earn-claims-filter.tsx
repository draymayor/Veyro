"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const STATUS_OPTIONS = [
  { value: "claimed", label: "Claimed" },
  { value: "unlocked", label: "Unlocked" },
  { value: "paid", label: "Paid" },
  { value: "expired", label: "Expired" },
];

const SELECT_CLASS =
  "border-border bg-card text-ink h-9 rounded-lg border px-3 text-sm font-medium outline-none focus-visible:border-ring";

/** Status filter for the Earn Bonus Claims admin view, same URL-driven
 * approach as WithdrawalFilters. */
export function EarnClaimsFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setStatus(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      aria-label="Filter by status"
      className={SELECT_CLASS}
      value={searchParams.get("status") ?? ""}
      onChange={(e) => setStatus(e.target.value)}
    >
      <option value="">All statuses</option>
      {STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
