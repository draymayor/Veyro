import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getReferralSummary } from "@/lib/referrals/get-summary";
import { ReferralTeaserCard } from "@/components/leaderboard/referral-teaser-card";
import { LeaderboardTabs } from "@/components/leaderboard/leaderboard-tabs";
import { TradingPanel } from "@/components/leaderboard/trading-panel";
import { ReferralsPanel } from "@/components/leaderboard/referrals-panel";
import { StaggerIn, StaggerItem } from "@/components/dashboard/stagger-in";
import type { AppUser } from "@/components/app/app-user";

export const metadata: Metadata = {
  title: "Leaderboard",
};

const REFERRAL_BONUS_FALLBACK_USD = 10;

// Main tab page (Home, Leaderboard, Assets), so it keeps the standard
// TopBar like Home and Assets do, not an InnerPageHeader, per
// design-principles.md's Navigation Chrome section. TopBar already
// applies that per-route, so nothing extra is needed here.
export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // AppLayout already redirects unauthenticated/incomplete profiles before
  // this page renders, so these should always resolve. Mirrors AppLayout's
  // own AppUser construction exactly, so the viewer's leaderboard row uses
  // the identical id/photo the sidebar, top bar, and Profile page use, one
  // avatar source of truth rather than a second placeholder identity.
  const { data: profile } = user
    ? await supabase
        .from("users")
        .select("profile_image_url")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const currentUser: AppUser = {
    id: user?.id ?? "",
    email: user?.email ?? "",
    fullName:
      (user?.user_metadata?.full_name as string | undefined)?.trim() || null,
    profileImageUrl: profile?.profile_image_url ?? null,
  };

  // platform_settings is public-read (docs/database-schema.md), so the
  // referral bonus is fetched here rather than hardcoded, admin can change
  // it without a code change. Falls back to the documented seed value only
  // if the row is somehow missing, never as the primary source.
  const { data: bonusSetting } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "referral_bonus_usd")
    .maybeSingle();

  const bonusAmountUsd = bonusSetting?.value
    ? Number(bonusSetting.value)
    : REFERRAL_BONUS_FALLBACK_USD;

  const referralSummary = user
    ? await getReferralSummary(supabase, user.id, bonusAmountUsd)
    : null;

  return (
    <main className="mx-auto max-w-7xl px-4 pt-3 pb-6 sm:px-6 lg:px-8 lg:py-8">
      <StaggerIn className="flex flex-col gap-6">
        <StaggerItem>
          <ReferralTeaserCard
            bonusAmountUsd={bonusAmountUsd}
            referralCount={referralSummary?.totalReferrals ?? 0}
            link={referralSummary?.link ?? ""}
          />
        </StaggerItem>

        {/* Mobile: switchable tabs, one panel visible at a time. */}
        <StaggerItem className="lg:hidden">
          <LeaderboardTabs currentUser={currentUser} />
        </StaggerItem>

        {/* Desktop: both panels side by side, always visible, no tab
            switching. A visible divider (not just the gap) between them
            gives the two panels a clear structural boundary on top of
            their already-distinct icon badges. */}
        <StaggerItem className="lg:divide-border hidden gap-6 lg:grid lg:grid-cols-2 lg:divide-x">
          <TradingPanel currentUser={currentUser} />
          <ReferralsPanel currentUser={currentUser} />
        </StaggerItem>
      </StaggerIn>
    </main>
  );
}
