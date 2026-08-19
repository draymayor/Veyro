"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, type Variants } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { OtpInput, emptyOtp } from "@/components/auth/otp-input";
import { getApiBaseUrl } from "@/lib/api-base-url";

const CODE_LENGTH = 6;
const EXPIRY_SECONDS = 10 * 60;
const RESEND_COOLDOWN_SECONDS = 60;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [digits, setDigits] = useState<string[]>(emptyOtp(CODE_LENGTH));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  async function getAccessToken(): Promise<string | null> {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const code = digits.join("");
    if (code.length !== CODE_LENGTH) {
      setError("Enter the full 6-digit code.");
      return;
    }

    setSubmitting(true);
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError("Your session expired. Please log in again.");
      setSubmitting(false);
      return;
    }

    const res = await fetch(`${getApiBaseUrl()}/auth/otp/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        body?.message ?? "Something went wrong on our end. Please try again.",
      );
      setDigits(emptyOtp(CODE_LENGTH));
      setSubmitting(false);
      return;
    }

    router.push("/home");
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setError(null);
    setResending(true);

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError("Your session expired. Please log in again.");
      setResending(false);
      return;
    }

    const res = await fetch(`${getApiBaseUrl()}/auth/otp/resend`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        body?.message ?? "Something went wrong on our end. Please try again.",
      );
      setResending(false);
      return;
    }

    setDigits(emptyOtp(CODE_LENGTH));
    setSecondsLeft(EXPIRY_SECONDS);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setResending(false);
  }

  const expired = secondsLeft === 0;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white p-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md p-8 sm:p-10"
      >
        <motion.div variants={itemVariants} className="mb-6 text-center">
          <h2 className="font-heading text-ink mb-2 text-3xl font-medium tracking-tight">
            Verify your email
          </h2>
          <p className="text-[15px] text-neutral-500">
            {email ? (
              <>
                Enter the 6-digit code we sent to{" "}
                <span className="text-ink font-medium">{email}</span>
              </>
            ) : (
              "Enter the 6-digit code we sent to your email."
            )}
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <motion.div variants={itemVariants}>
            <OtpInput
              length={CODE_LENGTH}
              digits={digits}
              onChange={setDigits}
              disabled={expired || submitting}
            />
          </motion.div>

          <motion.div variants={itemVariants} className="text-center text-sm">
            {expired ? (
              <span className="text-[#C24E3D]">
                This code has expired. Request a new one below.
              </span>
            ) : (
              <span className="text-neutral-500">
                Code expires in{" "}
                <span className="text-ink font-medium tabular-nums">
                  {formatTime(secondsLeft)}
                </span>
              </span>
            )}
          </motion.div>

          {error && (
            <motion.p
              variants={itemVariants}
              className="text-center text-sm text-[#C24E3D]"
            >
              {error}
            </motion.p>
          )}

          <motion.div variants={itemVariants}>
            <button
              type="submit"
              disabled={submitting || expired}
              className="bg-primary hover:bg-primary/90 w-full rounded-lg py-3.5 text-sm font-medium text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? "Verifying..." : "Verify Email"}
            </button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="text-center text-[13px] text-neutral-600"
          >
            Didn&apos;t get a code?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="text-ink font-semibold hover:underline disabled:cursor-not-allowed disabled:text-neutral-400 disabled:no-underline"
            >
              {resending
                ? "Sending..."
                : cooldown > 0
                  ? `Resend code (${cooldown}s)`
                  : "Resend code"}
            </button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
