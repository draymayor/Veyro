"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api-client";
import type {
  AdminWithdrawalStatus,
  CryptoSigningStatus,
} from "@/lib/admin/withdrawals/types";

/**
 * Mark processing/paid/failed for a single withdrawal
 * (docs/admin-guide.md's Payout Processing section: all payouts are sent
 * manually outside the platform, this only records what the admin did).
 * Paid requires a transaction_reference note, enforced server-side in
 * AdminWithdrawalsService.markPaid, this dialog just can't submit without
 * one either. Failed requires a reason, surfaced to the user through the
 * existing notifications system (category 'wallet') by the backend.
 */
export function WithdrawalActions({
  withdrawalId,
  status,
  cryptoSigningStatus,
}: {
  withdrawalId: string;
  status: AdminWithdrawalStatus;
  cryptoSigningStatus?: CryptoSigningStatus;
}) {
  const router = useRouter();
  const [startingProcessing, setStartingProcessing] = useState(false);
  const [approvingSigning, setApprovingSigning] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);
  const [failedOpen, setFailedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "paid" || status === "failed") {
    return null;
  }

  async function handleMarkProcessing() {
    setError(null);
    setStartingProcessing(true);
    try {
      await authFetch(`/admin/withdrawals/${withdrawalId}/processing`, {
        method: "POST",
      });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not mark this withdrawal processing.",
      );
    } finally {
      setStartingProcessing(false);
    }
  }

  // The signing-mode approval gate (docs/database-schema.md's Withdrawal
  // signing mode section): distinct from Mark Processing above, which
  // governs the separate requires-approval gate on the request itself.
  // Approving here only flips crypto_signing_status to 'ready_to_sign' - no
  // automated signer consumes that yet, so this withdrawal still needs the
  // normal Mark Paid step once someone (or eventually a signer) actually
  // sends the funds.
  async function handleApproveSigning() {
    setError(null);
    setApprovingSigning(true);
    try {
      await authFetch(`/admin/withdrawals/${withdrawalId}/approve-signing`, {
        method: "POST",
      });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not approve this withdrawal for signing.",
      );
    } finally {
      setApprovingSigning(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {cryptoSigningStatus ? (
        <SigningStatusBadge status={cryptoSigningStatus} />
      ) : null}
      {error ? <p className="text-error text-sm">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {status === "requested" ? (
          <Button onClick={handleMarkProcessing} disabled={startingProcessing}>
            {startingProcessing ? "Starting..." : "Mark Processing"}
          </Button>
        ) : null}
        {cryptoSigningStatus === "awaiting_approval" ? (
          <Button onClick={handleApproveSigning} disabled={approvingSigning}>
            {approvingSigning ? "Approving..." : "Approve for Signing"}
          </Button>
        ) : null}
        {status === "processing" ? (
          <Button onClick={() => setPaidOpen(true)}>Mark Paid</Button>
        ) : null}
        <Button variant="destructive" onClick={() => setFailedOpen(true)}>
          Mark Failed
        </Button>
      </div>

      <MarkPaidDialog
        withdrawalId={withdrawalId}
        open={paidOpen}
        onOpenChange={setPaidOpen}
      />
      <MarkFailedDialog
        withdrawalId={withdrawalId}
        open={failedOpen}
        onOpenChange={setFailedOpen}
      />
    </div>
  );
}

function SigningStatusBadge({ status }: { status: CryptoSigningStatus }) {
  if (status === "awaiting_approval") {
    return (
      <p className="bg-secondary text-ink/60 w-fit rounded-full px-2.5 py-1 text-xs font-medium">
        Awaiting admin approval to sign
      </p>
    );
  }
  if (status === "ready_to_sign") {
    return (
      <p className="bg-secondary text-ink/60 w-fit rounded-full px-2.5 py-1 text-xs font-medium">
        Ready to sign — no automated signer yet, send manually and Mark Paid
      </p>
    );
  }
  return null;
}

function MarkPaidDialog({
  withdrawalId,
  open,
  onOpenChange,
}: {
  withdrawalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [transactionReference, setTransactionReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetAndClose() {
    setTransactionReference("");
    setError(null);
    onOpenChange(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transactionReference.trim()) {
      setError("Enter the transaction reference for this payout.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authFetch(`/admin/withdrawals/${withdrawalId}/paid`, {
        method: "POST",
        body: JSON.stringify({
          transactionReference: transactionReference.trim(),
        }),
      });
      resetAndClose();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not mark this withdrawal paid.",
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
              Mark Paid
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
              <span className="text-ink text-sm font-medium">
                Transaction reference
              </span>
              <input
                required
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                placeholder="Bank transfer ref, PayPal txn id, or crypto tx hash"
                className="border-border bg-card text-ink focus-visible:border-ring rounded-xl border px-3 py-2 text-sm outline-none"
              />
            </label>

            {error ? <p className="text-error text-sm">{error}</p> : null}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Saving..." : "Mark Paid"}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MarkFailedDialog({
  withdrawalId,
  open,
  onOpenChange,
}: {
  withdrawalId: string;
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
      await authFetch(`/admin/withdrawals/${withdrawalId}/failed`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      resetAndClose();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not mark this withdrawal failed.",
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
              Mark Failed
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
                placeholder="Why did this payout fail? The user will see this."
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
              {submitting ? "Saving..." : "Mark Failed"}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
