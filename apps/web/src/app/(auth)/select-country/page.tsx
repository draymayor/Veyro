"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { findCountry } from "@/lib/countries";
import { CountrySelect } from "@/components/auth/country-select";

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

export default function SelectCountryPage() {
  const router = useRouter();
  const [country, setCountry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const selectedCountry = findCountry(country);
    if (!selectedCountry) {
      setError("Please select your country.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError("Your session expired. Please log in again.");
      setSubmitting(false);
      return;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/users/me`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country: selectedCountry.code,
          currency: selectedCountry.currency,
        }),
      },
    );

    if (!res.ok) {
      setError("Something went wrong on our end. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push("/home");
  }

  return (
    <div className="bg-background flex min-h-screen w-full items-center justify-center p-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_20px_45px_rgba(28,27,41,0.08)] sm:p-10"
      >
        <motion.div variants={itemVariants} className="mb-6 text-center">
          <h2 className="font-heading text-ink mb-2 text-3xl font-medium tracking-tight">
            Where are you based?
          </h2>
          <p className="text-[15px] text-neutral-500">
            Your country sets the currency your Veyro wallet holds and pays out
            in.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
            <label htmlFor="country" className="text-ink text-sm font-medium">
              Country
            </label>
            <CountrySelect id="country" value={country} onChange={setCountry} />
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
              disabled={!country || submitting}
              className="bg-primary hover:bg-primary/90 w-full rounded-lg py-3.5 text-sm font-medium text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Continue"}
            </button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
