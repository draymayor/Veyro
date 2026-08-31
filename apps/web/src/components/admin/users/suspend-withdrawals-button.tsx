"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api-client";

/**
 * users.withdrawals_suspended toggle (docs/admin-guide.md, product-rules.md
 * rule 18c): narrower than account_status, blocks new withdrawal
 * submissions only, doesn't otherwise restrict the user. Shared between
 * the Payout Processing queue (next to a user's withdrawal history) and
 * the User Management detail page, same endpoint from both places.
 */
export function SuspendWithdrawalsButton({
  userId,
  suspended,
}: {
  userId: string;
  suspended: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setSubmitting(true);
    try {
      await authFetch(`/admin/users/${userId}/withdrawals-suspended`, {
        method: "POST",
        body: JSON.stringify({ suspended: !suspended }),
      });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update this user's withdrawal access.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant={suspended ? "secondary" : "destructive"}
        onClick={handleClick}
        disabled={submitting}
      >
        {submitting
          ? "Saving..."
          : suspended
            ? "Unsuspend withdrawals"
            : "Suspend withdrawals"}
      </Button>
      {error ? <p className="text-error text-xs">{error}</p> : null}
    </div>
  );
}
