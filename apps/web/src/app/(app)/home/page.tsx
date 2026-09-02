import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { findCountry } from "@/lib/countries";
import { getReferralSummary } from "@/lib/referrals/get-summary";
import { getWalletSummary } from "@/lib/dashboard/get-wallet-summary";
import { getTransactionHistory } from "@/lib/dashboard/get-transaction-history";
import { getAllCryptoWalletBalances } from "@/lib/dashboard/get-crypto-wallet-balance";
import { getNotifications } from "@/lib/notifications/get-notifications";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { SellEntryCards } from "@/components/dashboard/sell-entry-cards";
import { RatesSection } from "@/components/dashboard/rates-section";
import { ReferralsWidget } from "@/components/dashboard/widgets/referrals-widget";
import { NotificationsWidget } from "@/components/dashboard/widgets/notifications-widget";
import { ActivityWidget } from "@/components/dashboard/widgets/activity-widget";
import { StaggerIn, StaggerItem } from "@/components/dashboard/stagger-in";

export const metadata: Metadata = {
  title: "Home",
};

const REFERRAL_BONUS_FALLBACK_USD = 10;

export default async function HomePage() {
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

  // ReferralsWidget only shows a referral count and link, never the
  // potential-earning figure, so this page doesn't need a real
  // platform_settings read just to satisfy getReferralSummary's signature.
  const referralSummary = user
    ? await getReferralSummary(supabase, user.id, REFERRAL_BONUS_FALLBACK_USD)
    : null;

  // AppLayout already redirects unauthenticated/incomplete profiles before
  // this page renders, so profile.currency should always be set. The
  // country-derived fallback only guards against that assumption drifting.
  const homeCurrency =
    profile?.currency ?? findCountry(profile?.country ?? "")?.currency ?? "USD";

  // Home's balance card never shows the trend chart, but it does show
  // today's P&L, so this still needs the fuller wallet summary (same call
  // Assets makes), just without ever passing its `history` down.
  const [walletSummary, transactions, notifications, cryptoBalances] =
    await Promise.all([
      user
        ? getWalletSummary(supabase, user.id, homeCurrency)
        : Promise.resolve({
            balance: 0,
            currency: homeCurrency,
            todayPnl: { amount: 0, percent: 0 },
          }),
      user
        ? getTransactionHistory(supabase, user.id, homeCurrency)
        : Promise.resolve([]),
      user ? getNotifications(supabase, user.id) : Promise.resolve([]),
      user
        ? getAllCryptoWalletBalances(supabase, user.id)
        : Promise.resolve([]),
    ]);

  return (
    <main className="mx-auto max-w-7xl px-4 pt-3 pb-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <StaggerIn className="flex min-w-0 flex-col gap-6">
          <StaggerItem>
            <BalanceCard
              homeCurrency={homeCurrency}
              balance={walletSummary.balance}
              cryptoBalances={cryptoBalances}
              todayPnl={walletSummary.todayPnl}
            />
          </StaggerItem>
          <StaggerItem>
            <SellEntryCards />
          </StaggerItem>
          <StaggerItem>
            <RatesSection homeCurrency={homeCurrency} />
          </StaggerItem>
        </StaggerIn>

        <StaggerIn className="hidden flex-col gap-4 lg:flex">
          <StaggerItem>
            <ReferralsWidget
              referralCount={referralSummary?.totalReferrals ?? 0}
              link={referralSummary?.link ?? ""}
            />
          </StaggerItem>
          <StaggerItem>
            <NotificationsWidget items={notifications} />
          </StaggerItem>
          <StaggerItem>
            <ActivityWidget items={transactions} />
          </StaggerItem>
        </StaggerIn>
      </div>
    </main>
  );
}
