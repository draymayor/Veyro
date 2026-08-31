"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api-client";
import type { AdminTradeStatus } from "@/lib/admin/trades/types";

const ACTIONABLE_STATUSES: AdminTradeStatus[] = [
  "submitted",
  "under_review",
  "awaiting_deposit_confirmation",
  "disputed",
];

/**
 * Approve/Reject for a single trade (docs/admin-guide.md's Trade Review
 * section). Approve hits POST /admin/trades/:id/approve, which is also
 * where the wallet_transactions credit actually happens server-side
 * (product-rules.md rules 7-8), this component only triggers it and
 * reflects the result, it never computes or displays a credit amount
 * itself. Reject requires a reason (rejection_reason is a required column
 * on the trade once rejected), collected via a small dialog rather than a
 * bare prompt() so the admin can see what they're about to submit.
 */
export function TradeActions({
  tradeId,
  status,
}: {
  tradeId: string;
  status: AdminTradeStatus;
}) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ACTIONABLE_STATUSES.includes(status)) {
    return null;
  }

  async function handleApprove() {
    setError(null);
    setApproving(true);
    try {
      await authFetch(`/admin/trades/${tradeId}/approve`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not approve this trade.",
      );
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="text-error text-sm">{error}</p> : null}
      <div className="flex gap-2">
        <Button onClick={handleApprove} disabled={approving} className="flex-1">
          {approving ? "Approving..." : "Approve"}
        </Button>
        <Button
          variant="destructive"
          onClick={() => setRejectOpen(true)}
          disabled={approving}
          className="flex-1"
        >
          Reject
        </Button>
      </div>

      <RejectDialog
        tradeId={tradeId}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
      />
    </div>
  );
}

function RejectDialog({
  tradeId,
  open,
  onOpenChange,
}: {
  tradeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetAndClose() {
    setReason("");
    setError(null);
    onOpenChange(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Enter a reason for the user.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authFetch(`/admin/trades/${tradeId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      resetAndClose();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not reject this trade.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(next) : resetAndClose())}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content className="bg-background data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="font-heading text-ink text-lg font-semibold">
              Reject Trade
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="text-ink/40 hover:text-ink transition-colors"
            >
              <XMarkIcon className="size-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-ink text-sm font-medium">Reason</span>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this trade being rejected? The user will see this."
                className="border-border bg-card text-ink focus-visible:border-ring rounded-xl border px-3 py-2 text-sm outline-none"
              />
            </label>

            {error ? <p className="text-error text-sm">{error}</p> : null}

            <Button
              type="submit"
              variant="destructive"
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Rejecting..." : "Reject Trade"}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
