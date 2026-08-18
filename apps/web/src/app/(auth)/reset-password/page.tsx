"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, type Variants } from "motion/react";
import { OtpInput, emptyOtp } from "@/components/auth/otp-input";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";

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

async function postJson(path: string, body: object) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const responseBody = await res.json().catch(() => null);
    throw new Error(
      responseBody?.message ??
        "Something went wrong on our end. Please try again.",
    );
  }
  return res;
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [step, setStep] = useState<"code" | "password">("code");
  const [digits, setDigits] = useState<string[]>(emptyOtp(CODE_LENGTH));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (step !== "code") return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const expired = secondsLeft === 0;
  const code = digits.join("");

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (code.length !== CODE_LENGTH) {
      setError("Enter the full 6-digit code.");
      return;
    }

    setSubmitting(true);
    try {
      await postJson("/auth/password-reset/verify", { email, code });
      setStep("password");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong on our end. Please try again.",
      );
      setDigits(emptyOtp(CODE_LENGTH));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setError(null);
    setResending(true);

    try {
      await postJson("/auth/password-reset/resend", { email });
      setDigits(emptyOtp(CODE_LENGTH));
      setSecondsLeft(EXPIRY_SECONDS);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong on our end. Please try again.",
      );
    } finally {
      setResending(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await postJson("/auth/password-reset/confirm", { email, code, password });
      router.push("/login?reset=success");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong on our end. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-background flex min-h-screen w-full items-center justify-center p-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_20px_45px_rgba(28,27,41,0.08)] sm:p-10"
      >
        {step === "code" ? (
          <>
            <motion.div variants={itemVariants} className="mb-6 text-center">
              <h2 className="font-heading text-ink mb-2 text-3xl font-medium tracking-tight">
                Enter your code
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

            <form onSubmit={handleVerifyCode} className="flex flex-col gap-6">
              <motion.div variants={itemVariants}>
                <OtpInput
                  length={CODE_LENGTH}
                  digits={digits}
                  onChange={setDigits}
                  disabled={expired || submitting}
                />
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="text-center text-sm"
              >
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
                  {submitting ? "Verifying..." : "Verify Code"}
                </button>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="flex items-center justify-center gap-1 text-center text-[13px] text-neutral-600"
              >
                <span>Didn&apos;t get a code?</span>
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
          </>
        ) : (
          <>
            <motion.div variants={itemVariants} className="mb-6 text-center">
              <h2 className="font-heading text-ink mb-2 text-3xl font-medium tracking-tight">
                Choose a new password
              </h2>
              <p className="text-[15px] text-neutral-500">
                Create a new password for your Veyro account.
              </p>
            </motion.div>

            <form
              onSubmit={handleResetPassword}
              className="flex flex-col gap-4"
            >
              <motion.div
                variants={itemVariants}
                className="flex flex-col gap-1.5"
              >
                <label
                  htmlFor="password"
                  className="text-ink text-sm font-medium"
                >
                  New Password
                </label>
                <PasswordInput
                  id="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={setPassword}
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                />
                <PasswordStrength password={password} />
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="flex flex-col gap-1.5"
              >
                <label
                  htmlFor="confirmPassword"
                  className="text-ink text-sm font-medium"
                >
                  Confirm Password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                />
              </motion.div>

              {error && (
                <motion.p
                  variants={itemVariants}
                  className="text-center text-sm text-[#C24E3D]"
                >
                  {error}
                </motion.p>
              )}

              <motion.div variants={itemVariants} className="mt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/90 w-full rounded-lg py-3.5 text-sm font-medium text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {submitting ? "Resetting..." : "Reset Password"}
                </button>
              </motion.div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
