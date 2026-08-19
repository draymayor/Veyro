import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app/app-shell";

// Every route under this group requires a signed-in session, so none of
// it should ever appear in search results, no matter what links to it.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Gate order mirrors apps/api/src/auth/auth.service.ts (bootstrapOAuth/me):
// no session -> /login, unverified email -> /verify-email (email/password
// accounts only, Google is pre-verified), no country set -> /select-country.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("email_verified_at, country")
    .eq("id", user.id)
    .maybeSingle();

  const provider = user.app_metadata?.provider ?? "email";

  if (provider !== "google" && !profile?.email_verified_at) {
    redirect("/verify-email");
  }

  if (!profile?.country) {
    redirect("/select-country");
  }

  return <AppShell>{children}</AppShell>;
}
