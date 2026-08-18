"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/auth/google-icon";

export function GoogleAuthButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
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
      className="border-border bg-background hover:bg-secondary flex w-full items-center justify-center gap-3 rounded-lg border py-3 text-sm font-medium text-ink transition-colors disabled:opacity-60"
    >
      <GoogleIcon className="text-lg" />
      {loading ? "Redirecting..." : label}
    </button>
  );
}
