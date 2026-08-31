"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const SELECT_CLASS =
  "border-border bg-card text-ink h-9 rounded-lg border px-3 text-sm font-medium outline-none focus-visible:border-ring";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "success", label: "Success" },
];

/**
 * Status filter for the referrals table below, same URL-driven pattern as
 * the admin Payout Processing queue's WithdrawalFilters: a plain select
 * that pushes ?status= onto the URL, the page (a server component)
 * re-fetches GET /referrals/table on navigation.
 */
export function ReferralFilters() {
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
      <option value="">All</option>
      {STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
