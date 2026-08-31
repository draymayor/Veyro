"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { authFetch } from "@/lib/api-client";
import { OtpInput, emptyOtp } from "@/components/auth/otp-input";
import { Button } from "@/components/ui/button";

interface WithdrawalPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "setup" when no PIN exists yet, "change" when one is already set. */
  mode: "setup" | "change";
  onSaved: () => void;
  onForgotPin?: () => void;
}

/**
 * Setup and change share this one form (docs/product-rules.md rule 18a):
 * setup only asks for a new PIN entered twice, change also requires the
 * current PIN first. Deliberately separate from TOTP, this PIN is what
 * actually gets checked before every withdrawal, not an account-recovery
 * mechanism.
 */
export function WithdrawalPinDialog({
  open,
  onOpenChange,
  mode,
  onSaved,
  onForgotPin,
}: WithdrawalPinDialogProps) {
  const [currentPin, setCurrentPin] = useState(emptyOtp(4));
  const [newPin, setNewPin] = useState(emptyOtp(4));
  const [confirmPin, setConfirmPin] = useState(emptyOtp(4));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resets on close (any reason) rather than on open, so the form is
  // always blank next time it opens without needing an effect for it.
  function handleOpenChange(next: boolean) {
    if (!next) {
      setCurrentPin(emptyOtp(4));
      setNewPin(emptyOtp(4));
      setConfirmPin(emptyOtp(4));
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const newPinCode = newPin.join("");
    const confirmPinCode = confirmPin.join("");

    if (newPinCode.length !== 4) {
      setError("Enter a 4-digit PIN.");
      return;
    }
    if (newPinCode !== confirmPinCode) {
      setError("PINs don't match.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "setup") {
        await authFetch("/withdrawal-pin/set", {
          method: "POST",
          body: JSON.stringify({ pin: newPinCode, confirmPin: confirmPinCode }),
        });
      } else {
        const currentPinCode = currentPin.join("");
        if (currentPinCode.length !== 4) {
          setError("Enter your current 4-digit PIN.");
          setSubmitting(false);
          return;
        }
        await authFetch("/withdrawal-pin/change", {
          method: "POST",
          body: JSON.stringify({
            currentPin: currentPinCode,
            newPin: newPinCode,
            confirmNewPin: confirmPinCode,
          }),
        });
      }
      onSaved();
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content className="bg-background data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="font-heading text-ink text-lg font-semibold">
              {mode === "setup"
                ? "Set Withdrawal PIN"
                : "Change Withdrawal PIN"}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="text-ink/40 hover:text-ink transition-colors"
            >
              <XMarkIcon className="size-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <p className="text-ink/60 text-sm">
              This 4-digit PIN confirms every withdrawal, separate from your
              password and two-factor authentication.
            </p>

            {mode === "change" ? (
              <PinField
                label="Current PIN"
                digits={currentPin}
                onChange={setCurrentPin}
                disabled={submitting}
              />
            ) : null}
            <PinField
              label="New PIN"
              digits={newPin}
              onChange={setNewPin}
              disabled={submitting}
            />
            <PinField
              label="Confirm New PIN"
              digits={confirmPin}
              onChange={setConfirmPin}
              disabled={submitting}
            />

            {error ? <p className="text-error text-sm">{error}</p> : null}

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="w-full"
            >
              {submitting
                ? "Saving..."
                : mode === "setup"
                  ? "Set PIN"
                  : "Save New PIN"}
            </Button>

            {mode === "change" && onForgotPin ? (
              <button
                type="button"
                onClick={() => {
                  handleOpenChange(false);
                  onForgotPin();
                }}
                className="text-primary text-center text-xs font-medium hover:underline"
              >
                Forgot your PIN?
              </button>
            ) : null}
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PinField({
  label,
  digits,
  onChange,
  disabled,
}: {
  label: string;
  digits: string[];
  onChange: (digits: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="text-ink mb-2 text-sm font-medium">{label}</p>
      <OtpInput
        length={4}
        digits={digits}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
