"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { authFetch } from "@/lib/api-client";
import { OtpInput, emptyOtp } from "@/components/auth/otp-input";
import { Button } from "@/components/ui/button";

interface ForgotPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
}

type Step = "request" | "code" | "new-pin";

/**
 * The withdrawal PIN's forgot-PIN path: sends an email_otps code with
 * purpose='withdrawal_confirmation' (docs/database-schema.md), which is a
 * repurposed PIN-reset verification step, not a per-withdrawal fallback and
 * unrelated to TOTP backup codes.
 */
export function ForgotPinDialog({
  open,
  onOpenChange,
  onReset,
}: ForgotPinDialogProps) {
  const [step, setStep] = useState<Step>("request");
  const [codeDigits, setCodeDigits] = useState(emptyOtp(6));
  const [newPin, setNewPin] = useState(emptyOtp(4));
  const [confirmPin, setConfirmPin] = useState(emptyOtp(4));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resets on close (any reason) rather than on open, so the flow is
  // always back at step one next time it opens without needing an effect.
  function handleOpenChange(next: boolean) {
    if (!next) {
      setStep("request");
      setCodeDigits(emptyOtp(6));
      setNewPin(emptyOtp(4));
      setConfirmPin(emptyOtp(4));
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleSendCode() {
    setError(null);
    setSubmitting(true);
    try {
      await authFetch("/withdrawal-pin/forgot/request", { method: "POST" });
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResending(true);
    try {
      await authFetch("/withdrawal-pin/forgot/resend", { method: "POST" });
      setCodeDigits(emptyOtp(6));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setResending(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const code = codeDigits.join("");
    if (code.length !== 6) {
      setError("Enter the full 6-digit code.");
      return;
    }

    setSubmitting(true);
    try {
      await authFetch("/withdrawal-pin/forgot/verify", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setStep("new-pin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setCodeDigits(emptyOtp(6));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetNewPin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const pin = newPin.join("");
    const confirm = confirmPin.join("");

    if (pin.length !== 4) {
      setError("Enter a 4-digit PIN.");
      return;
    }
    if (pin !== confirm) {
      setError("PINs don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await authFetch("/withdrawal-pin/forgot/confirm", {
        method: "POST",
        body: JSON.stringify({
          code: codeDigits.join(""),
          newPin: pin,
          confirmNewPin: confirm,
        }),
      });
      onReset();
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
              Reset Withdrawal PIN
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="text-ink/40 hover:text-ink transition-colors"
            >
              <XMarkIcon className="size-5" />
            </Dialog.Close>
          </div>

          {step === "request" ? (
            <div className="flex flex-col gap-4">
              <p className="text-ink/60 text-sm">
                We&apos;ll send a 6-digit code to your email to confirm
                it&apos;s you before setting a new PIN.
              </p>
              {error ? <p className="text-error text-sm">{error}</p> : null}
              <Button
                size="lg"
                disabled={submitting}
                className="w-full"
                onClick={handleSendCode}
              >
                {submitting ? "Sending..." : "Send Code"}
              </Button>
            </div>
          ) : null}

          {step === "code" ? (
            <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
              <p className="text-ink/60 text-sm">
                Enter the 6-digit code we sent to your email.
              </p>
              <OtpInput
                length={6}
                digits={codeDigits}
                onChange={setCodeDigits}
                disabled={submitting}
              />
              {error ? <p className="text-error text-sm">{error}</p> : null}
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="w-full"
              >
                {submitting ? "Verifying..." : "Verify Code"}
              </Button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-primary text-center text-xs font-medium hover:underline disabled:opacity-60"
              >
                {resending ? "Sending..." : "Resend code"}
              </button>
            </form>
          ) : null}

          {step === "new-pin" ? (
            <form onSubmit={handleSetNewPin} className="flex flex-col gap-5">
              <p className="text-ink/60 text-sm">Set your new 4-digit PIN.</p>
              <div>
                <p className="text-ink mb-2 text-sm font-medium">New PIN</p>
                <OtpInput
                  length={4}
                  digits={newPin}
                  onChange={setNewPin}
                  disabled={submitting}
                />
              </div>
              <div>
                <p className="text-ink mb-2 text-sm font-medium">
                  Confirm New PIN
                </p>
                <OtpInput
                  length={4}
                  digits={confirmPin}
                  onChange={setConfirmPin}
                  disabled={submitting}
                />
              </div>
              {error ? <p className="text-error text-sm">{error}</p> : null}
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="w-full"
              >
                {submitting ? "Saving..." : "Save New PIN"}
              </Button>
            </form>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
