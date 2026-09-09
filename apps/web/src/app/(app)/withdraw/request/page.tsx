import type { Metadata } from "next";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { WithdrawRequestForm } from "@/components/withdraw/withdraw-request-form";
import { createClient } from "@/lib/supabase/server";
import { findCountry } from "@/lib/countries";
import { getWalletBalance } from "@/lib/dashboard/get-wallet-balance";
import { getScoutWithdrawalLock } from "@/lib/scout/get-withdrawal-lock";

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

  const walletBalance = user
    ? await getWalletBalance(supabase, user.id, walletCurrency)
    : 0;

  // Scout withdrawal lock (docs/database-schema.md's Careers / Scout
  // program section): the amount ever paid out via approved scout_days
  // must stay in the wallet until 30 approved days exist. The real
  // enforcement is server-side (WithdrawalsService.create) regardless of
  // what's shown here - this only makes the lock visible before submit
  // rather than only as a submit-time error.
  const scoutLock = user
    ? await getScoutWithdrawalLock(supabase, user.id)
    : null;
  const availableBalance = scoutLock
    ? Math.max(walletBalance - scoutLock.lockedAmount, 0)
    : walletBalance;

  return (
    <>
      <InnerPageHeader title="Withdraw Fiat" backHref="/home" />
      <main className="mx-auto max-w-md px-4 pt-4 pb-16 sm:px-6">
        {scoutLock ? (
          <div className="bg-secondary mb-4 rounded-2xl p-4">
            <p className="text-ink text-sm">
              Your scout earnings become withdrawable once you&apos;ve
              completed {scoutLock.requiredDays} paid days (currently{" "}
              {scoutLock.approvedDays}/{scoutLock.requiredDays}).
            </p>
          </div>
        ) : null}
        <WithdrawRequestForm
          walletCurrency={walletCurrency}
          availableBalance={availableBalance}
        />
      </main>
    </>
  );
}
