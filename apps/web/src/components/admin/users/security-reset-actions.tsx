"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api-client";

/**
 * Security override/reset capability (docs/admin-guide.md's User
 * Management section): for a user fully locked out of both their
 * authenticator and their backup codes, admin can clear their TOTP
 * enrollment and/or their withdrawal PIN so they can set fresh ones. Both
 * are sensitive, so both require a reason and are logged server-side via
 * admin_actions (AdminUsersService.resetTotp / resetWithdrawalPin) - this
 * component can't skip that, the reason field is required to submit either
 * dialog.
 */
export function SecurityResetActions({ userId }: { userId: string }) {
  const [totpOpen, setTotpOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="destructive" onClick={() => setTotpOpen(true)}>
        Reset TOTP enrollment
      </Button>
      <Button variant="destructive" onClick={() => setPinOpen(true)}>
        Reset withdrawal PIN
      </Button>

      <ResetDialog
        title="Reset TOTP Enrollment"
        description="This removes the user's authenticator app enrollment entirely. They'll be able to log in with just their password and re-enroll a fresh authenticator from Settings."
        endpoint={`/admin/users/${userId}/reset-totp`}
        open={totpOpen}
        onOpenChange={setTotpOpen}
      />
      <ResetDialog
        title="Reset Withdrawal PIN"
        description="This clears the user's withdrawal PIN. They'll be prompted to set a new one before their next withdrawal."
        endpoint={`/admin/users/${userId}/reset-withdrawal-pin`}
        open={pinOpen}
        onOpenChange={setPinOpen}
      />
    </div>
  );
}

function ResetDialog({
  title,
  description,
  endpoint,
  open,
  onOpenChange,
}: {
  title: string;
  description: string;
  endpoint: string;
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
      setError("Enter a reason for this action.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      resetAndClose();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not complete this action.",
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
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="text-ink/40 hover:text-ink transition-colors"
            >
              <XMarkIcon className="size-5" />
            </Dialog.Close>
          </div>

          <p className="text-ink/60 mb-4 text-sm leading-relaxed">
            {description}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-ink text-sm font-medium">Reason</span>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this reset needed? Logged for audit."
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
              {submitting ? "Saving..." : "Confirm Reset"}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
