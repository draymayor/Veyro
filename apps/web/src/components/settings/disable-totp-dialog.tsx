"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { createClient } from "@/lib/supabase/client";
import { OtpInput, emptyOtp } from "@/components/auth/otp-input";
import { Button } from "@/components/ui/button";

interface DisableTotpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factorId: string;
  onDisabled: () => void;
}

/**
 * Re-authentication required to disable, per the task spec: Supabase Auth
 * itself enforces this at the API level (unenroll() requires an aal2
 * session for a verified factor), so re-entering a fresh code here is what
 * actually earns that aal2, not just a UI formality.
 */
export function DisableTotpDialog({
  open,
  onOpenChange,
  factorId,
  onDisabled,
}: DisableTotpDialogProps) {
  const [digits, setDigits] = useState(emptyOtp(6));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const code = digits.join("");
    if (code.length !== 6) {
      setError("Enter the full 6-digit code.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (verifyError) {
      setError(verifyError.message);
      setDigits(emptyOtp(6));
      setSubmitting(false);
      return;
    }

    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId,
    });

    setSubmitting(false);

    if (unenrollError) {
      setError(unenrollError.message);
      return;
    }

    onDisabled();
    handleOpenChange(false);
  }

  // Resets on close (any reason: success, cancel, overlay click, Escape)
  // rather than on open, so the form is always blank next time it opens
  // without needing an effect for it.
  function handleOpenChange(next: boolean) {
    if (!next) {
      setDigits(emptyOtp(6));
      setError(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content className="bg-background data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="font-heading text-ink text-lg font-semibold">
              Disable Two-Factor Authentication
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="text-ink/40 hover:text-ink transition-colors"
            >
              <XMarkIcon className="size-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-ink/60 text-sm">
              For your security, confirm it&apos;s you by entering a current
              code from your authenticator app.
            </p>
            <OtpInput
              length={6}
              digits={digits}
              onChange={setDigits}
              disabled={submitting}
            />
            {error ? <p className="text-error text-sm">{error}</p> : null}
            <Button
              type="submit"
              size="lg"
              variant="destructive"
              disabled={submitting}
              className="mt-1 w-full"
            >
              {submitting ? "Disabling..." : "Disable 2FA"}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
