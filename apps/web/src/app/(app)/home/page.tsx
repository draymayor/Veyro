import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { findCountry } from "@/lib/countries";
import { getReferralSummary } from "@/lib/referrals/get-summary";
import { getWalletSummary } from "@/lib/dashboard/get-wallet-summary";
import { getTransactionHistory } from "@/lib/dashboard/get-transaction-history";
import { getAllCryptoWalletBalances } from "@/lib/dashboard/get-crypto-wallet-balance";
import { getNotifications } from "@/lib/notifications/get-notifications";
import { getEarnStatus } from "@/lib/earn/get-status";
import { getOnboardingStatus } from "@/lib/onboarding/get-status";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { OnboardingChecklistCard } from "@/components/dashboard/onboarding-checklist-card";
import { SellEntryCards } from "@/components/dashboard/sell-entry-cards";
import { EarnBanner } from "@/components/dashboard/earn-banner";
import { ScoutBanner } from "@/components/dashboard/scout-banner";
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

  // Mobile-only Scout discovery card (bottom nav stays at 4 core tabs) -
  // shown to anyone not yet an approved scout, same "not_applied/pending/
  // rejected all still see it" posture as the in-app explainer at /scout.
  const { data: scoutApplication } = user
    ? await supabase
        .from("scout_applications")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };
  const showScoutBanner = scoutApplication?.status !== "approved";

  // AppLayout already redirects unauthenticated/incomplete profiles before
  // this page renders, so profile.currency should always be set. The
  // country-derived fallback only guards against that assumption drifting.
  const homeCurrency =
    profile?.currency ?? findCountry(profile?.country ?? "")?.currency ?? "USD";

  // Home's balance card never shows the trend chart, but it does show
  // today's P&L, so this still needs the fuller wallet summary (same call
  // Assets makes), just without ever passing its `history` down.
  const [
    walletSummary,
    transactions,
    notifications,
    cryptoBalances,
    earnStatus,
    onboardingStatus,
  ] = await Promise.all([
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
    user ? getAllCryptoWalletBalances(supabase, user.id) : Promise.resolve([]),
    getEarnStatus(supabase),
    getOnboardingStatus(supabase),
  ]);

  // Never shown once every step is complete - computed server-side so the
  // widget just doesn't render rather than flashing and disappearing
  // client-side.
  const showOnboardingChecklist =
    onboardingStatus.steps.length > 0 &&
    onboardingStatus.steps.some((step) => !step.completed);

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
          {showOnboardingChecklist ? (
            <StaggerItem>
              <OnboardingChecklistCard steps={onboardingStatus.steps} />
            </StaggerItem>
          ) : null}
          <StaggerItem>
            <SellEntryCards />
          </StaggerItem>
          <StaggerItem>
            <EarnBanner poolTotalUsd={earnStatus.poolTotalUsd} />
          </StaggerItem>
          {showScoutBanner ? (
            <StaggerItem>
              <ScoutBanner />
            </StaggerItem>
          ) : null}
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
