"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api-client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { userLabel } from "@/lib/admin/users/display";
import type { AdminUserListItem } from "@/lib/admin/users/types";

const SEARCH_DEBOUNCE_MS = 400;

const INPUT_CLASS =
  "border-border bg-card text-ink placeholder:text-ink/35 h-10 w-full rounded-xl border px-3 text-sm outline-none focus-visible:border-ring";

interface UserSearchFieldProps {
  selected: AdminUserListItem | null;
  onSelect: (user: AdminUserListItem | null) => void;
}

/**
 * Search-by-email-or-ID user picker for Manual Deposit
 * (docs/admin-guide.md), reusing GET /admin/users?search= (the same query
 * User Management's list already supports) rather than a second search
 * endpoint. A selection replaces the input with a confirmed chip so the
 * form can't be submitted against a query string that never resolved to
 * an actual user.
 */
export function UserSearchField({ selected, onSelect }: UserSearchFieldProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUserListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    // Nothing to clear here: the dropdown below only renders while
    // query.trim() is non-empty (checked against the live query, not the
    // debounced one), so a stale results list from a prior search never
    // gets shown once the input is cleared.
    if (!debouncedQuery.trim()) return;

    let cancelled = false;

    async function search() {
      setLoading(true);
      try {
        const data = await authFetch<AdminUserListItem[]>(
          `/admin/users?search=${encodeURIComponent(debouncedQuery.trim())}`,
        );
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void search();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  if (selected) {
    return (
      <div className="border-border bg-card flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-ink truncate text-sm font-medium">
            {userLabel(selected.display_name, selected.id)}
          </p>
          <p className="text-ink/50 truncate text-xs">
            {selected.email ?? "No email on file"} · wallet currency{" "}
            {selected.currency ?? "unknown"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-primary shrink-0 text-xs font-medium hover:underline"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        className={INPUT_CLASS}
        placeholder="Search by email or user ID"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {query.trim() ? (
        <div className="border-border bg-card absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border shadow-lg">
          {loading ? (
            <p className="text-ink/50 px-3 py-2.5 text-sm">Searching...</p>
          ) : !results || results.length === 0 ? (
            <p className="text-ink/50 px-3 py-2.5 text-sm">
              No matching users.
            </p>
          ) : (
            results.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  onSelect(user);
                  setQuery("");
                  setResults(null);
                }}
                className="hover:bg-secondary/60 flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors"
              >
                <span className="text-ink text-sm font-medium">
                  {userLabel(user.display_name, user.id)}
                </span>
                <span className="text-ink/50 text-xs">
                  {user.email ?? "No email on file"}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
