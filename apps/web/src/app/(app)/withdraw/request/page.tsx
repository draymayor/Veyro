import type { Metadata } from "next";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { WithdrawRequestForm } from "@/components/withdraw/withdraw-request-form";
import { createClient } from "@/lib/supabase/server";
import { findCountry } from "@/lib/countries";
import { getWalletBalance } from "@/lib/dashboard/get-wallet-balance";

export const metadata: Metadata = {
  title: "Withdraw Fiat",
};

// Bank/PayPal withdrawal, its own dedicated page distinct from the Crypto
// Withdrawal flow at /withdraw/crypto (docs/context.md): saved-account
// destination picker rather than an address/network form, so the two never
// share a component with method tabs.
export default async function WithdrawRequestPage() {
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
  const walletCurrency =
    profile?.currency ?? findCountry(profile?.country ?? "")?.currency ?? "USD";

  const availableBalance = user
    ? await getWalletBalance(supabase, user.id, walletCurrency)
    : 0;

  return (
    <>
      <InnerPageHeader title="Withdraw Fiat" backHref="/home" />
      <main className="mx-auto max-w-md px-4 pt-4 pb-16 sm:px-6">
        <WithdrawRequestForm
          walletCurrency={walletCurrency}
          availableBalance={availableBalance}
        />
      </main>
    </>
  );
}
