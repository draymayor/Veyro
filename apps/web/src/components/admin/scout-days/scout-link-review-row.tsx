"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/admin/trades/display";
import type { AdminScoutLink } from "@/lib/admin/scout-days/types";

const STATUS_TONE = {
  pending: { label: "Pending", tone: "neutral" as const },
  approved: { label: "Approved", tone: "success" as const },
  rejected: { label: "Rejected", tone: "error" as const },
};

const FOCUS_TAG_LABEL: Record<string, string> = {
  recruit_scouts: "Recruiting scouts",
  recruit_users: "Recruiting users",
};

/**
 * One link submission row inside the Scout Day Review detail page. Each
 * link is reviewed individually (docs/database-schema.md's Careers / Scout
 * program section, Part D2) before the day itself is approved/rejected -
 * same approve/reject-with-reason shape as TradeActions, scoped per link.
 */
export function ScoutLinkReviewRow({
  dayId,
  link,
}: {
  dayId: string;
  link: AdminScoutLink;
}) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { label, tone } = STATUS_TONE[link.link_status];

  async function handleApprove() {
    setError(null);
    setApproving(true);
    try {
      await authFetch(
        `/admin/scout-days/${dayId}/links/${link.id}/approve`,
        { method: "POST" },
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not approve this link.",
      );
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="border-border flex flex-col gap-2 rounded-xl border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="text-primary block truncate text-sm font-medium hover:underline"
          >
            {link.url}
          </a>
          <p className="text-ink/50 mt-0.5 text-xs">
            {[
              link.platform,
              link.focus_tag ? FOCUS_TAG_LABEL[link.focus_tag] : null,
              formatDateTime(link.submitted_at),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <StatusBadge label={label} tone={tone} />
      </div>

      {link.link_status === "rejected" && link.rejection_reason ? (
        <p className="text-error text-xs">{link.rejection_reason}</p>
      ) : null}

      {link.link_status === "pending" ? (
        <>
          {error ? <p className="text-error text-xs">{error}</p> : null}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={approving}
              className="flex-1"
            >
              {approving ? "Approving..." : "Approve"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setRejectOpen(true)}
              disabled={approving}
              className="flex-1"
            >
              Reject
            </Button>
          </div>
        </>
      ) : null}

      <RejectLinkDialog
        dayId={dayId}
        linkId={link.id}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
      />
    </div>
  );
}

function RejectLinkDialog({
  dayId,
  linkId,
  open,
  onOpenChange,
}: {
  dayId: string;
  linkId: string;
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
      setError("Enter a reason.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authFetch(`/admin/scout-days/${dayId}/links/${linkId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      resetAndClose();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not reject this link.",
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
              Reject Link
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
                placeholder="Why is this link being rejected?"
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
              {submitting ? "Rejecting..." : "Reject Link"}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
