"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { authFetch } from "@/lib/api-client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { userLabel } from "@/lib/admin/users/display";
import type { AdminUserListItem } from "@/lib/admin/users/types";

const SEARCH_DEBOUNCE_MS = 400;

const INPUT_CLASS =
  "border-border bg-card text-ink placeholder:text-ink/35 h-9 w-full min-w-[220px] rounded-lg border px-3 text-sm outline-none focus-visible:border-ring";

interface TransactionUserFilterProps {
  initialSelectedUser: AdminUserListItem | null;
}

// User filter for the All Transactions View (docs/admin-guide.md): search
// by email or ID against the same GET /admin/users?search= endpoint the
// Manual Deposit form's UserSearchField uses, but URL-param-driven (userId)
// like every other filter on this page rather than local component state,
// so a selected user survives a refresh and combines with type/source/date
// filters in the querystring. initialSelectedUser is resolved server-side
// in page.tsx from ?userId= so the chip renders correctly on first load.
// The caller keys this component by the userId param so a navigation that
// changes it (e.g. Clear) remounts with a fresh initial state instead of
// syncing state from a prop effect.
export function TransactionUserFilter({
  initialSelectedUser,
}: TransactionUserFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selected, setSelected] = useState<AdminUserListItem | null>(
    initialSelectedUser,
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUserListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
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

  function selectUser(user: AdminUserListItem | null) {
    setSelected(user);
    setQuery("");
    setResults(null);

    const params = new URLSearchParams(searchParams.toString());
    if (user) {
      params.set("userId", user.id);
    } else {
      params.delete("userId");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  if (selected) {
    return (
      <div className="border-border bg-card flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
        <div className="min-w-0">
          <p className="text-ink truncate text-sm font-medium">
            {userLabel(selected.display_name, selected.id)}
          </p>
          <p className="text-ink/50 truncate text-xs">
            {selected.email ?? "No email on file"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => selectUser(null)}
          className="text-primary shrink-0 text-xs font-medium hover:underline"
        >
          Clear
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
                onClick={() => selectUser(user)}
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
