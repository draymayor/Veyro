import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ADMIN_ENTRY_PATH,
  POST_AUTH_ENTRY_PATH,
} from "@/lib/auth/post-auth-redirect";
import { SelectCountryForm } from "./select-country-form";

// Server-side gate, run before anything client-side ever mounts: a country
// already set on the profile must never be re-shown or re-written here, no
// matter how the user arrived at this URL (direct navigation, back button,
// a stale bookmark from before onboarding finished, or a same-email
// different-auth-method case where Supabase's account-linking behavior
// isn't something this app's correctness can depend on, per
// docs/product-rules.md rule 13b). This check has to hold independent of
// whichever caller sent the user here, so it lives here rather than only
// in each caller (auth/callback/route.ts, login, verify-email).
export default async function SelectCountryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("country, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  // Admin accounts never go through country selection at all
  // (docs/context.md's Admin Authentication Architecture: an admin's row
  // stays minimal, no country, no onboarding). Checked ahead of the
  // country check below since an admin's country is null by design, which
  // would otherwise look identical to a genuinely incomplete signup.
  if (profile?.is_admin) {
    redirect(ADMIN_ENTRY_PATH);
  }

  if (profile?.country) {
    redirect(POST_AUTH_ENTRY_PATH);
  }

  return <SelectCountryForm />;
}
