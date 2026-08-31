"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/api-client";
import { ACCOUNT_STATUS_OPTIONS } from "@/lib/admin/users/filters";
import type { AccountStatus } from "@/lib/admin/users/types";

const SELECT_CLASS =
  "border-border bg-card text-ink h-9 rounded-lg border px-3 text-sm font-medium outline-none focus-visible:border-ring disabled:opacity-50";

/**
 * Editable account_status (docs/admin-guide.md's User Management section:
 * "Account status (active/restricted/banned), editable here"). This is the
 * broad account-wide restriction, distinct from the narrower
 * withdrawals_suspended toggle (SuspendWithdrawalsButton) shown alongside
 * it.
 */
export function AccountStatusSelect({
  userId,
  status,
}: {
  userId: string;
  status: AccountStatus;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: string) {
    setError(null);
    setSaving(true);
    try {
      await authFetch(`/admin/users/${userId}/account-status`, {
        method: "POST",
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update account status.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        aria-label="Account status"
        className={SELECT_CLASS}
        value={status}
        disabled={saving}
        onChange={(e) => handleChange(e.target.value)}
      >
        {ACCOUNT_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-error text-xs">{error}</p> : null}
    </div>
  );
}
