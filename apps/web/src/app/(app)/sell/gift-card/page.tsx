import type { Metadata } from "next";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { GiftCardBrandList } from "@/components/sell/gift-card/brand-list";
import { createClient } from "@/lib/supabase/server";
import { findCountry } from "@/lib/countries";

export const metadata: Metadata = {
  title: "Sell Gift Cards",
};

export default async function SellGiftCardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("users")
        .select("country, currency")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  // AppLayout already redirects unauthenticated/incomplete profiles before
  // this page renders, so profile.currency should always be set. The
  // country-derived fallback only guards against that assumption drifting.
  const homeCurrency =
    profile?.currency ?? findCountry(profile?.country ?? "")?.currency ?? "USD";

  return (
    <>
      <InnerPageHeader title="Sell Gift Cards" backHref="/home" />
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-16 sm:px-6">
        <GiftCardBrandList homeCurrency={homeCurrency} />
      </main>
    </>
  );
}
