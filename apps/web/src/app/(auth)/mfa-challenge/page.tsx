"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { authFetch } from "@/lib/api-client";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { OtpInput, emptyOtp } from "@/components/auth/otp-input";
import { POST_AUTH_ENTRY_PATH } from "@/lib/auth/post-auth-redirect";

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

/**
 * The login-time TOTP challenge (docs/product-rules.md rule 18a: account
 * recovery only, so this screen only ever gates entry into the app, never a
 * withdrawal). Reached from /login and the Google OAuth callback once
 * supabase.auth.mfa.getAuthenticatorAssuranceLevel() reports the session
 * needs aal2. Relies on the session created by the first factor, so there's
 * no email/password to re-collect here, just the second factor.
 */
export default function MfaChallengePage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [digits, setDigits] = useState(emptyOtp(6));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!aal || aal.nextLevel === aal.currentLevel) {
        // Nothing to challenge (no MFA, or already aal2), so don't strand
        // the user here if they navigate to this URL directly.
        await proceedAfterAuth();
        return;
      }

      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];
      if (!totpFactor) {
        await proceedAfterAuth();
        return;
      }

      setFactorId(totpFactor.id);
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function proceedAfterAuth() {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const me = res.ok ? await res.json() : null;

    if (me && !me.emailVerified) {
      router.replace(
        `/verify-email?email=${encodeURIComponent(session.user.email ?? "")}`,
      );
      return;
    }

    router.replace(POST_AUTH_ENTRY_PATH);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!factorId) return;
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

    await proceedAfterAuth();
  }

  async function handleRecover(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!backupCode.trim()) {
      setError("Enter a backup code.");
      return;
    }

    setSubmitting(true);
    try {
      await authFetch("/auth/backup-codes/recover", {
        method: "POST",
        body: JSON.stringify({ code: backupCode.trim() }),
      });
      // Redeeming a backup code removes the TOTP factor and, per Supabase,
      // logs out other sessions, so the cleanest path is a fresh login
      // rather than trusting this session's stale tokens.
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login?recovered=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-white" />
    );
  }

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
            Two-factor verification
          </h2>
          <p className="text-[15px] text-neutral-500">
            {useBackupCode
              ? "Enter one of your backup codes."
              : "Enter the 6-digit code from your authenticator app."}
          </p>
        </motion.div>

        {useBackupCode ? (
          <form onSubmit={handleRecover} className="flex flex-col gap-6">
            <motion.input
              variants={itemVariants}
              type="text"
              autoFocus
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              placeholder="XXXXX-XXXXX"
              className="focus:border-primary focus:ring-primary w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-center font-mono text-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:outline-none"
            />
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
                {submitting ? "Verifying..." : "Recover Account"}
              </button>
            </motion.div>
            <motion.div
              variants={itemVariants}
              className="text-center text-[13px] text-neutral-600"
            >
              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(false);
                  setError(null);
                }}
                className="text-ink font-semibold hover:underline"
              >
                Use your authenticator app instead
              </button>
            </motion.div>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="flex flex-col gap-6">
            <motion.div variants={itemVariants}>
              <OtpInput
                length={6}
                digits={digits}
                onChange={setDigits}
                disabled={submitting}
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
                {submitting ? "Verifying..." : "Verify"}
              </button>
            </motion.div>
            <motion.div
              variants={itemVariants}
              className="text-center text-[13px] text-neutral-600"
            >
              Lost your authenticator?{" "}
              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(true);
                  setError(null);
                }}
                className="text-ink font-semibold hover:underline"
              >
                Use a backup code
              </button>
            </motion.div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
