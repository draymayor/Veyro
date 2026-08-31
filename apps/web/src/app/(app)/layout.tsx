import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app/app-shell";
import { ADMIN_ENTRY_PATH } from "@/lib/auth/post-auth-redirect";

// Every route under this group requires a signed-in session, so none of
// it should ever appear in search results, no matter what links to it.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Gate order mirrors apps/api/src/auth/auth.service.ts (bootstrapOAuth/me):
// no session -> /login, admin identity -> /admin/dashboard (checked before
// any consumer onboarding gate, and on every request under this layout, so
// an admin session can never reach a consumer route just by navigating to
// one directly, per docs/context.md's Admin Authentication Architecture),
// unverified email -> /verify-email (email/password accounts only, Google
// is pre-verified), no country set -> /select-country.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // TOTP is account-recovery only (docs/product-rules.md rule 18a) but still
  // gates entry to every route under this layout: without this check, a
  // session that only reached aal1 (password/OAuth, MFA not yet challenged)
  // could bypass /mfa-challenge by navigating straight to an app URL.
  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
    redirect("/mfa-challenge");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("email_verified_at, country, profile_image_url, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_admin) {
    redirect(ADMIN_ENTRY_PATH);
  }

  const provider = user.app_metadata?.provider ?? "email";

  if (provider !== "google" && !profile?.email_verified_at) {
    redirect("/verify-email");
  }

  if (!profile?.country) {
    redirect("/select-country");
  }

  const fullName =
    (user.user_metadata?.full_name as string | undefined)?.trim() || null;

  return (
    <AppShell
      user={{
        id: user.id,
        email: user.email ?? "",
        fullName,
        profileImageUrl: profile?.profile_image_url ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
