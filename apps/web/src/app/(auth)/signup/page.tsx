"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { findCountry } from "@/lib/countries";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { CountrySelect } from "@/components/auth/country-select";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { GiftCardFan } from "@/components/home/gift-card-fan";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Your password must be at least 8 characters.");
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms to continue.");
      return;
    }
    const selectedCountry = findCountry(country);
    if (!selectedCountry) {
      setError("Please select your country.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          country: selectedCountry.code,
          currency: selectedCountry.currency,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    const accessToken = data.session?.access_token;
    if (!accessToken) {
      setError("Something went wrong on our end. Please try again.");
      setSubmitting(false);
      return;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/otp/send`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!res.ok) {
      setError("Something went wrong on our end. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <div className="bg-background text-ink flex min-h-screen w-full flex-col font-sans antialiased lg:flex-row">
      {/* Left visual panel */}
      <div
        className="relative flex w-full flex-col justify-between overflow-hidden p-8 md:p-12 lg:min-h-screen lg:w-1/2"
        style={{
          backgroundImage:
            "linear-gradient(160deg, #1C1B29 0%, #26243a 55%, #E8674A 145%)",
        }}
      >
        <div className="relative z-10 flex items-center justify-between">
          <span className="font-heading text-background flex items-center gap-2 text-lg font-semibold tracking-tight md:text-xl">
            <Image
              src="/veyro_logos/veyro-mark.png"
              alt=""
              width={24}
              height={24}
              className="size-6"
            />
            Veyro
          </span>
          <Link
            href="/"
            className="text-background/90 hover:text-background flex items-center gap-2 text-xs font-medium transition-colors md:text-sm"
          >
            <ArrowLeft className="size-4" />
            Back to Website
          </Link>
        </div>

        <div className="relative z-10 -mx-4 mt-8 hidden lg:mt-0 lg:block">
          <GiftCardFan />
        </div>

        <div className="relative z-10 mt-8 lg:mt-0">
          <h1 className="text-background mb-4 max-w-xl text-4xl leading-[1.1] font-medium tracking-tight sm:text-5xl lg:text-6xl">
            Turn what you
            <br />
            have into cash.
          </h1>
          <p className="text-background/85 max-w-md text-base leading-relaxed sm:text-lg">
            See your rate instantly. Get paid the moment we confirm.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-col items-center justify-center bg-white p-6 sm:p-12 lg:w-1/2">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md md:max-w-lg xl:max-w-xl"
        >
          <motion.div variants={itemVariants} className="mb-6">
            <h2 className="font-heading text-ink mb-2 text-3xl font-medium tracking-tight">
              Create your account
            </h2>
            <p className="text-[15px] text-neutral-500">
              See your rate before you submit anything.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-6">
            <GoogleAuthButton label="Sign up with Google" />
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="relative mb-6 flex items-center"
          >
            <div className="grow border-t border-neutral-200"></div>
            <span className="px-4 text-[13px] text-neutral-400">or</span>
            <div className="grow border-t border-neutral-200"></div>
          </motion.div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <motion.div
              variants={itemVariants}
              className="flex flex-col gap-1.5"
            >
              <label htmlFor="name" className="text-ink text-sm font-medium">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="focus:border-primary focus:ring-primary w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:outline-none"
              />
            </motion.div>

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

            <motion.div
              variants={itemVariants}
              className="flex flex-col gap-1.5"
            >
              <label
                htmlFor="password"
                className="text-ink text-sm font-medium"
              >
                Password
              </label>
              <PasswordInput
                id="password"
                required
                minLength={8}
                value={password}
                onChange={setPassword}
                placeholder="Enter your password"
                autoComplete="new-password"
              />
              <PasswordStrength password={password} />
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex flex-col gap-1.5"
            >
              <label
                htmlFor="country"
                className="text-ink text-sm font-medium"
              >
                Country
              </label>
              <CountrySelect id="country" value={country} onChange={setCountry} />
              <p className="text-xs text-neutral-400">
                This sets your wallet currency.
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mt-1 flex items-start gap-3"
            >
              <div className="flex h-5 items-center">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="text-primary focus:ring-primary h-4 w-4 rounded border-neutral-300"
                />
              </div>
              <label htmlFor="terms" className="text-sm text-neutral-600">
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="text-ink font-medium underline underline-offset-2"
                >
                  Terms
                </Link>
              </label>
            </motion.div>

            {error && (
              <motion.p variants={itemVariants} className="text-sm text-[#C24E3D]">
                {error}
              </motion.p>
            )}

            <motion.div variants={itemVariants} className="mt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 w-full rounded-lg py-3.5 text-sm font-medium text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {submitting ? "Creating account..." : "Sign Up"}
              </button>
            </motion.div>
          </form>

          <motion.div variants={itemVariants} className="mt-6 text-[13px] text-neutral-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-ink font-semibold hover:underline"
            >
              Log in
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
