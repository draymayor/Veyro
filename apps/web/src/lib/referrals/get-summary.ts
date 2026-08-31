import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/seo/public-pages";
import { LEADERBOARD_PERIOD_LABEL } from "@/lib/leaderboard/data";
import type {
  ReferralActivityItem,
  ReferralActivityStatus,
  ReferralSummary,
} from "./data";

export type { ReferralSummary } from "./data";

const DAY_MS = 24 * 60 * 60 * 1000;
// Matches the Leaderboard's own ranking window (LEADERBOARD_PERIOD_LABEL is
// "This Week"), so a referral counted in this tile means the same thing as
// it does there.
const PERIOD_DAYS = 7;

function relativeLabel(dateIso: string): string {
  const days = Math.floor((Date.now() - new Date(dateIso).getTime()) / DAY_MS);
  if (days < 1) return "today";
  if (days < 7) return days === 1 ? "1 day ago" : `${days} days ago`;
  if (days < 30) {
    const weeks = Math.max(1, Math.round(days / 7));
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  if (days < 365) {
    const months = Math.max(1, Math.round(days / 30));
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }
  const years = Math.max(1, Math.round(days / 365));
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

/**
 * Real replacement for the placeholder REFERRAL_SNAPSHOT/REFERRAL_STATS/
 * REFERRAL_ACTIVITY constants that used to live in
 * lib/dashboard/placeholder-data.ts and lib/referrals/data.ts. Queries
 * `users.referral_code` and `referrals` directly (same direct-Supabase-
 * query pattern the Home, Referrals, and Leaderboard pages already use for
 * platform_settings/profile data), relying on the existing "referrals
 * select own" RLS policy (supabase/migrations/20260812233403_rls_policies.sql) that
 * scopes rows to `auth.uid() = referrer_id`.
 */
export async function getReferralSummary(
  supabase: SupabaseClient,
  userId: string,
  bonusAmountUsd: number,
): Promise<ReferralSummary> {
  const { data: profile } = await supabase
    .from("users")
    .select("referral_code")
    .eq("id", userId)
    .maybeSingle();

  const code: string = profile?.referral_code ?? "";
  const link = code ? `${SITE_URL}/signup?ref=${code}` : SITE_URL;

  const { data: referrals } = await supabase
    .from("referrals")
    .select("id, bonus_amount, bonus_paid_at, created_at")
    .eq("referrer_id", userId)
    .order("created_at", { ascending: false });

  if (!referrals?.length) {
    return {
      code,
      link,
      totalReferrals: 0,
      totalEarnedUsd: 0,
      potentialEarningUsd: 0,
      periodReferralCount: 0,
      periodLabel: LEADERBOARD_PERIOD_LABEL,
      activity: [],
    };
  }

  const periodCutoff = Date.now() - PERIOD_DAYS * DAY_MS;
  let totalEarnedUsd = 0;
  let pendingCount = 0;
  let periodReferralCount = 0;

  const activity: ReferralActivityItem[] = referrals.map((row) => {
    const status: ReferralActivityStatus = row.bonus_paid_at
      ? "first_trade_completed"
      : "signed_up";

    if (row.bonus_amount && row.bonus_paid_at) {
      totalEarnedUsd += Number(row.bonus_amount);
    } else {
      pendingCount += 1;
    }
    if (new Date(row.created_at as string).getTime() >= periodCutoff) {
      periodReferralCount += 1;
    }

    return {
      id: row.id as string,
      status,
      joinedRelative: relativeLabel(row.created_at as string),
    };
  });

  return {
    code,
    link,
    totalReferrals: referrals.length,
    totalEarnedUsd,
    // Sum of platform_settings.referral_bonus_usd for every referral still
    // pending (docs/context.md's Referrals page section), a flat per-
    // referral bonus amount rather than a stored per-row value.
    potentialEarningUsd: pendingCount * bonusAmountUsd,
    periodReferralCount,
    periodLabel: LEADERBOARD_PERIOD_LABEL,
    activity,
  };
}
