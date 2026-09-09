"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api-client";
import type {
  AdminScoutDayStatus,
  ScoutLinkStatus,
} from "@/lib/admin/scout-days/types";

/**
 * Approve/Reject for the day AS A WHOLE, only reachable once every link has
 * been individually reviewed (docs/database-schema.md's Careers / Scout
 * program section, Part D2 - the backend enforces this too, this is just
 * the matching UI gate). Approving is the event that credits the wallet
 * server-side (AdminScoutDaysService.approveDay); this component never
 * computes or displays that amount itself.
 */
export function ScoutDayActions({
  dayId,
  status,
  linkStatuses,
}: {
  dayId: string;
  status: AdminScoutDayStatus;
  linkStatuses: ScoutLinkStatus[];
}) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "pending_review") return null;

  const allReviewed = linkStatuses.every((s) => s !== "pending");

  async function handleApprove() {
    setError(null);
    setApproving(true);
    try {
      await authFetch(`/admin/scout-days/${dayId}/approve`, {
        method: "POST",
      });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not approve this day.",
      );
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {!allReviewed ? (
        <p className="text-ink/50 text-sm">
          Review every submitted link above before deciding on the day.
        </p>
      ) : null}
      {error ? <p className="text-error text-sm">{error}</p> : null}
      <div className="flex gap-2">
        <Button
          onClick={handleApprove}
          disabled={approving || !allReviewed}
          className="flex-1"
        >
          {approving ? "Approving..." : "Approve Day"}
        </Button>
        <Button
          variant="destructive"
          onClick={() => setRejectOpen(true)}
          disabled={approving || !allReviewed}
          className="flex-1"
        >
          Reject Day
        </Button>
      </div>

      <RejectDayDialog
        dayId={dayId}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
      />
    </div>
  );
}

function RejectDayDialog({
  dayId,
  open,
  onOpenChange,
}: {
  dayId: string;
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
      setError("Enter a reason for the scout.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authFetch(`/admin/scout-days/${dayId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      resetAndClose();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not reject this day.",
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
              Reject Day
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
                placeholder="Why is this day being rejected? The scout will see this. No payout will be credited and it won't count toward their 30-day total."
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
              {submitting ? "Rejecting..." : "Reject Day"}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
