"use client";

import { useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { XMarkIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { createClient } from "@/lib/supabase/client";
import { authFetch } from "@/lib/api-client";
import { OtpInput, emptyOtp } from "@/components/auth/otp-input";
import { Button } from "@/components/ui/button";

interface EnrollTotpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnrolled: () => void;
}

type Step = "loading" | "scan" | "backup-codes" | "error";

/**
 * Account-recovery 2FA only (docs/product-rules.md rule 18a), never used for
 * withdrawals. Enroll/challenge/verify go straight through supabase-js's
 * auth.mfa.* API, no backend round trip needed for the TOTP factor itself.
 * Backup codes are the one piece that needs the backend (service role write
 * to backup_codes), fetched right after verify() succeeds.
 */
export function EnrollTotpDialog({
  open,
  onOpenChange,
  onEnrolled,
}: EnrollTotpDialogProps) {
  const [step, setStep] = useState<Step>("loading");
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [digits, setDigits] = useState(emptyOtp(6));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [savedConfirmed, setSavedConfirmed] = useState(false);

  // Only the enroll() call itself lives in the effect (subscribing to an
  // external system on open); the synchronous field resets happen in
  // handleOpenChange below, an event handler rather than an effect, so
  // there's no setState-before-await inside the effect body.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function startEnrollment() {
      const supabase = createClient();
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });
      if (cancelled) return;
      if (enrollError || !data) {
        setError(enrollError?.message ?? "Could not start 2FA setup.");
        setStep("error");
        return;
      }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setStep("scan");
    }

    void startEnrollment();

    return () => {
      cancelled = true;
    };
  }, [open]);

  // If the dialog closes before verification finishes, drop the unverified
  // factor so it doesn't linger and count against the 10-factor limit.
  async function cleanupUnverifiedFactor(
    currentFactorId: string,
    currentStep: Step,
  ) {
    if (!currentFactorId || currentStep === "backup-codes") return;
    const supabase = createClient();
    await supabase.auth.mfa
      .unenroll({ factorId: currentFactorId })
      .catch(() => {});
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      setStep("loading");
      setError(null);
      setDigits(emptyOtp(6));
      setSavedConfirmed(false);
    } else {
      void cleanupUnverifiedFactor(factorId, step);
    }
    onOpenChange(next);
  }

  async function handleVerify(e: React.FormEvent) {
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

    try {
      const result = await authFetch<{ codes: string[] }>(
        "/auth/backup-codes/generate",
        { method: "POST" },
      );
      setBackupCodes(result.codes);
      setStep("backup-codes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDone() {
    onEnrolled();
    handleOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content className="bg-background data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="font-heading text-ink text-lg font-semibold">
              {step === "backup-codes"
                ? "Save your backup codes"
                : "Enable Two-Factor Authentication"}
            </Dialog.Title>
            {step !== "backup-codes" ? (
              <button
                type="button"
                aria-label="Close"
                onClick={() => handleOpenChange(false)}
                className="text-ink/40 hover:text-ink transition-colors"
              >
                <XMarkIcon className="size-5" />
              </button>
            ) : null}
          </div>

          {step === "loading" ? (
            <p className="text-ink/60 py-8 text-center text-sm">
              Setting up...
            </p>
          ) : null}

          {step === "error" ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-error text-sm">{error}</p>
              <Button
                size="lg"
                className="w-full"
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
            </div>
          ) : null}

          {step === "scan" ? (
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <p className="text-ink/60 text-sm">
                Scan this QR code with your authenticator app (Google
                Authenticator, Authy, 1Password, etc).
              </p>
              {qrCode ? (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCode}
                    alt="Scan with your authenticator app"
                    className="border-border size-40 rounded-xl border bg-white p-2"
                  />
                </div>
              ) : null}
              <div className="bg-secondary rounded-xl p-3 text-center">
                <p className="text-ink/45 mb-1 text-xs">
                  Can&apos;t scan? Enter this code manually:
                </p>
                <p className="text-ink font-mono text-xs font-medium break-all">
                  {secret}
                </p>
              </div>
              <div>
                <p className="text-ink mb-2 text-sm font-medium">
                  Enter the 6-digit code from your app
                </p>
                <OtpInput
                  length={6}
                  digits={digits}
                  onChange={setDigits}
                  disabled={submitting}
                />
              </div>
              {error ? <p className="text-error text-sm">{error}</p> : null}
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="mt-1 w-full"
              >
                {submitting ? "Verifying..." : "Enable 2FA"}
              </Button>
            </form>
          ) : null}

          {step === "backup-codes" ? (
            <div className="flex flex-col gap-4">
              <div className="border-error/30 bg-error/10 flex items-start gap-2 rounded-xl border p-3">
                <ExclamationTriangleIcon className="text-error mt-0.5 size-4 shrink-0" />
                <p className="text-ink/70 text-xs">
                  Save these codes somewhere safe. Each can be used once to
                  recover your account if you lose access to your authenticator
                  app. They won&apos;t be shown again.
                </p>
              </div>
              <div className="bg-secondary grid grid-cols-2 gap-2 rounded-xl p-4 font-mono text-sm">
                {backupCodes.map((code) => (
                  <span key={code} className="text-ink">
                    {code}
                  </span>
                ))}
              </div>
              <label className="text-ink/70 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={savedConfirmed}
                  onChange={(e) => setSavedConfirmed(e.target.checked)}
                  className="size-4"
                />
                I&apos;ve saved these codes somewhere safe
              </label>
              <Button
                size="lg"
                disabled={!savedConfirmed}
                className="w-full"
                onClick={handleDone}
              >
                Done
              </Button>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
