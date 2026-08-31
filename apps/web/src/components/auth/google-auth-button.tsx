"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/auth/google-icon";

export function GoogleAuthButton({
  label,
  referredByCode,
}: {
  label: string;
  // Google's OAuth metadata can never carry a custom field the way
  // email/password signUp()'s options.data can (raw_user_meta_data is
  // whatever Google returns), so the referral code can't travel through
  // Supabase Auth for this path. Stashed in a short-lived cookie instead,
  // read server-side by auth/callback/route.ts once the account exists.
  referredByCode?: string | null;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    if (referredByCode) {
      document.cookie = `veyro_ref_code=${encodeURIComponent(referredByCode)}; path=/; max-age=600; SameSite=Lax`;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setLoading(false);
    }
    // On success the browser is redirected to Google, so there is nothing
    // further to do here.
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="border-border bg-background hover:bg-secondary text-ink flex w-full items-center justify-center gap-3 rounded-lg border py-3 text-sm font-medium transition-colors disabled:opacity-60"
    >
      <GoogleIcon className="text-lg" />
      {loading ? "Redirecting..." : label}
    </button>
  );
}
