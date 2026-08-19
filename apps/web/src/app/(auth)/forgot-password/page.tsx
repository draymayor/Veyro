"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "motion/react";
import { getApiBaseUrl } from "@/lib/api-base-url";

const REDIRECT_DELAY_MS = 1600;

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

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sent) return;
    const timer = setTimeout(() => {
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    }, REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [sent, email, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch(`${getApiBaseUrl()}/auth/password-reset/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      setError("Something went wrong on our end. Please try again.");
      setSubmitting(false);
      return;
    }

    // Same response and copy whether or not this email has a Veyro account,
    // so this step can never be used to check which emails are registered.
    setSent(true);
  }

  return (
    <div className="bg-background flex min-h-screen w-full items-center justify-center p-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_20px_45px_rgba(28,27,41,0.08)] sm:p-10"
      >
        {sent ? (
          <motion.div variants={itemVariants} className="text-center">
            <h2 className="font-heading text-ink mb-2 text-3xl font-medium tracking-tight">
              Check your email
            </h2>
            <p className="text-[15px] text-neutral-500">
              If an account exists for that email, we&apos;ve sent a code to
              reset your password.
            </p>
            <Link
              href={`/reset-password?email=${encodeURIComponent(email)}`}
              className="text-primary mt-6 inline-block text-sm font-semibold hover:underline"
            >
              Enter your code
            </Link>
          </motion.div>
        ) : (
          <>
            <motion.div variants={itemVariants} className="mb-6 text-center">
              <h2 className="font-heading text-ink mb-2 text-3xl font-medium tracking-tight">
                Reset your password
              </h2>
              <p className="text-[15px] text-neutral-500">
                Enter the email on your Veyro account. We&apos;ll send a code to
                reset your password.
              </p>
            </motion.div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <motion.div
                variants={itemVariants}
                className="flex flex-col gap-1.5"
              >
                <label htmlFor="email" className="text-ink text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="focus:border-primary focus:ring-primary w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:outline-none"
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

              <motion.div variants={itemVariants}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/90 w-full rounded-lg py-3.5 text-sm font-medium text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {submitting ? "Sending..." : "Send Reset Code"}
                </button>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="text-center text-[13px] text-neutral-600"
              >
                <Link
                  href="/login"
                  className="text-ink font-semibold hover:underline"
                >
                  Back to Login
                </Link>
              </motion.div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
