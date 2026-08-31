"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { authFetch } from "@/lib/api-client";
import { OtpInput, emptyOtp } from "@/components/auth/otp-input";
import { Button } from "@/components/ui/button";
import { ForgotPinDialog } from "@/components/settings/forgot-pin-dialog";

interface WithdrawalPinGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once the PIN is confirmed correct; caller proceeds with the withdrawal. */
  onVerified: () => void;
}

type Step = "loading" | "not-set" | "enter" | "locked";

/**
 * The mandatory per-withdrawal PIN check (docs/product-rules.md rule 18a):
 * every withdrawal, every user, regardless of TOTP enrollment. Deliberately
 * separate from the account-recovery TOTP/backup-code flow in Settings.
 */
export function WithdrawalPinGateDialog({
  open,
  onOpenChange,
  onVerified,
}: WithdrawalPinGateDialogProps) {
  const [step, setStep] = useState<Step>("loading");
  const [digits, setDigits] = useState(emptyOtp(4));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  // Only the status fetch itself lives in the effect; the synchronous field
  // resets happen in handleOpenChange below (an event handler, not an
  // effect), so there's no setState-before-await inside the effect body.
  useEffect(() => {
    if (!open) return;

    async function checkStatus() {
      try {
        const status = await authFetch<{
          isSet: boolean;
          lockedUntil: string | null;
        }>("/withdrawal-pin/status");
        if (!status.isSet) {
          setStep("not-set");
        } else if (status.lockedUntil) {
          setStep("locked");
        } else {
          setStep("enter");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setStep("enter");
      }
    }

    void checkStatus();
  }, [open]);

  function handleOpenChange(next: boolean) {
    if (next) {
      setStep("loading");
      setDigits(emptyOtp(4));
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const pin = digits.join("");
    if (pin.length !== 4) {
      setError("Enter your 4-digit PIN.");
      return;
    }

    setSubmitting(true);
    try {
      await authFetch("/withdrawal-pin/verify", {
        method: "POST",
        body: JSON.stringify({ pin }),
      });
      onVerified();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Incorrect PIN.";
      setError(message);
      setDigits(emptyOtp(4));
      if (message.toLowerCase().includes("locked")) {
        setStep("locked");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/30" />
          <Dialog.Content className="bg-background data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="font-heading text-ink text-lg font-semibold">
                Confirm Withdrawal PIN
              </Dialog.Title>
              <Dialog.Close
                aria-label="Close"
                className="text-ink/40 hover:text-ink transition-colors"
              >
                <XMarkIcon className="size-5" />
              </Dialog.Close>
            </div>

            {step === "loading" ? (
              <p className="text-ink/60 py-6 text-center text-sm">
                Checking...
              </p>
            ) : null}

            {step === "not-set" ? (
              <div className="flex flex-col items-center gap-4 py-2 text-center">
                <p className="text-ink/60 text-sm">
                  Set a withdrawal PIN in Settings before you can withdraw.
                </p>
                <Button asChild size="lg" className="w-full">
                  <Link href="/settings" onClick={() => onOpenChange(false)}>
                    Go to Settings
                  </Link>
                </Button>
              </div>
            ) : null}

            {step === "locked" ? (
              <div className="flex flex-col items-center gap-4 py-2 text-center">
                <p className="text-error text-sm">
                  {error ??
                    "Too many incorrect attempts. Try again later, or reset your PIN."}
                </p>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    onOpenChange(false);
                    setForgotOpen(true);
                  }}
                >
                  Reset PIN
                </Button>
              </div>
            ) : null}

            {step === "enter" ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <p className="text-ink/60 text-sm">
                  Enter your 4-digit withdrawal PIN to continue.
                </p>
                <OtpInput
                  length={4}
                  digits={digits}
                  onChange={setDigits}
                  disabled={submitting}
                />
                {error ? <p className="text-error text-sm">{error}</p> : null}
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? "Confirming..." : "Confirm"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    setForgotOpen(true);
                  }}
                  className="text-primary text-center text-xs font-medium hover:underline"
                >
                  Forgot your PIN?
                </button>
              </form>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ForgotPinDialog
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        onReset={() => {}}
      />
    </>
  );
}
