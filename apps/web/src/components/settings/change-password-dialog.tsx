"use client";

import { useState, type ReactNode } from "react";
import { Dialog } from "radix-ui";
import { XMarkIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { Button } from "@/components/ui/button";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Centered dialog, matching the Important Network Notice pattern already
 * used in the crypto sell flow, since this is a deliberate action the
 * user opens, not a pick-one-of-a-few sheet. Submission is a stub: no
 * real API call yet (a real change-password endpoint would go where
 * handleSubmit's setTimeout is), just enough structure to wire in later
 * without a rebuild.
 */
export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function resetAndClose() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(false);
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    // Stub: no backend endpoint wired yet, simulates a successful save.
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
    }, 600);
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
              Change Password
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="text-ink/40 hover:text-ink transition-colors"
            >
              <XMarkIcon className="size-5" />
            </Dialog.Close>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="bg-success/10 text-success flex size-11 items-center justify-center rounded-full">
                <CheckCircleIcon className="size-6" aria-hidden="true" />
              </span>
              <p className="text-ink text-sm font-medium">Password updated.</p>
              <Button size="lg" className="mt-2 w-full" onClick={resetAndClose}>
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="Current Password">
                <PasswordInput
                  id="current-password"
                  required
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  autoComplete="current-password"
                />
              </Field>
              <Field label="New Password">
                <PasswordInput
                  id="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={setNewPassword}
                  autoComplete="new-password"
                />
                <PasswordStrength password={newPassword} />
              </Field>
              <Field label="Confirm New Password">
                <PasswordInput
                  id="confirm-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                />
              </Field>

              {error ? <p className="text-error text-sm">{error}</p> : null}

              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="mt-1 w-full"
              >
                {submitting ? "Saving..." : "Save Password"}
              </Button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-ink text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
