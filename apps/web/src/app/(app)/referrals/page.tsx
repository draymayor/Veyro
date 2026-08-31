import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getReferralSummary } from "@/lib/referrals/get-summary";
import { getReferralTable } from "@/lib/referrals/get-table";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { ReferralHeroCard } from "@/components/referrals/referral-hero-card";
import { ReferralStats } from "@/components/referrals/referral-stats";
import { ReferralActivityList } from "@/components/referrals/referral-activity-list";
import { ReferralFilters } from "@/components/referrals/referral-filters";
import { ReferralsTable } from "@/components/referrals/referrals-table";
import { StaggerIn, StaggerItem } from "@/components/dashboard/stagger-in";

export const metadata: Metadata = {
  title: "Referrals",
};

const REFERRAL_BONUS_FALLBACK_USD = 10;

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

// Standalone inner/drill-in page reached from the Leaderboard teaser card
// (docs/context.md: not a Leaderboard tab), so it uses InnerPageHeader
// rather than the main-tab TopBar, per design-principles.md's Navigation
// Chrome section.
export default async function ReferralsPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // platform_settings is public-read (docs/database-schema.md), fetched
  // here exactly the way the Leaderboard page fetches it for
  // ReferralTeaserCard, so both surfaces read the same admin-editable
  // value and update together if it ever changes, never hardcoded.
  const { data: bonusSetting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "referral_bonus_usd")
    .maybeSingle();

  const bonusAmountUsd = bonusSetting?.value
    ? Number(bonusSetting.value)
    : REFERRAL_BONUS_FALLBACK_USD;

  // AppLayout already redirects unauthenticated users before this page
  // renders, so user should always resolve here.
  const summary = user
    ? await getReferralSummary(supabase, user.id, bonusAmountUsd)
    : {
        code: "",
        link: "",
        totalReferrals: 0,
        totalEarnedUsd: 0,
        potentialEarningUsd: 0,
        periodReferralCount: 0,
        periodLabel: "This Week",
        activity: [],
      };

  // The table's country column needs the referred user's own users.country,
  // which "users select own" RLS hides from the referrer's request-scoped
  // client, so this goes through the backend (service-role, still scoped to
  // this user's own referrals) rather than get-summary.ts's direct queries.
  const tableRows = user ? await getReferralTable(supabase, status) : [];

  return (
    <>
      <InnerPageHeader title="Referrals" />
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-16 sm:px-6">
        <StaggerIn className="flex flex-col gap-6">
          <StaggerItem>
            <h2 className="font-heading text-ink text-xl font-semibold sm:text-2xl">
              Earn by inviting others.
            </h2>
          </StaggerItem>
          <StaggerItem>
            <ReferralHeroCard
              bonusAmountUsd={bonusAmountUsd}
              code={summary.code}
              link={summary.link}
            />
          </StaggerItem>
          <StaggerItem>
            {/* Told right where the referral link/code lives, since the
                bonus doesn't land the moment someone signs up. */}
            <p className="text-ink/50 -mt-2 text-center text-xs">
              Your ${bonusAmountUsd} becomes eligible once the referred user
              makes a deposit, not immediately at signup.
            </p>
          </StaggerItem>
          <StaggerItem>
            <ReferralStats
              totalReferrals={summary.totalReferrals}
              totalEarnedUsd={summary.totalEarnedUsd}
              potentialEarningUsd={summary.potentialEarningUsd}
              periodReferralCount={summary.periodReferralCount}
              periodLabel={summary.periodLabel}
            />
          </StaggerItem>
          <StaggerItem>
            <ReferralActivityList activity={summary.activity} />
          </StaggerItem>
          <StaggerItem>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-ink font-heading text-base font-medium">
                Filter
              </h2>
              <ReferralFilters />
            </div>
          </StaggerItem>
          <StaggerItem>
            <ReferralsTable rows={tableRows} />
          </StaggerItem>
        </StaggerIn>
      </main>
    </>
  );
}
