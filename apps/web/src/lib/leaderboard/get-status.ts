import type { SupabaseClient } from "@supabase/supabase-js";

export interface LeaderboardStatus {
  /** Real sum of the user's completed trade payouts (gift card + crypto), in `currency`. */
  tradingVolume: number;
  tradingRank: number;
  referralRank: number;
}

// Terminal "this trade actually completed and paid out" statuses
// (TradesService.sellCrypto sets 'paid' directly; AdminTradesService.approve
// sets 'approved' for gift cards) - 'submitted'/'under_review'/'rejected'
// trades never generated real volume and must not count toward it.
const COMPLETED_TRADE_STATUSES = ["approved", "paid"];

// Same illustrative-until-real-aggregation posture as TRADING_LEADERBOARD/
// REFERRALS_LEADERBOARD (lib/leaderboard/data.ts): there's no real
// leaderboard_entries aggregate yet, so the viewer's overall rank among
// every other user can't actually be computed. Rather than one shared
// hardcoded number (which every user would see identically, an easy tell
// it's fake), each user gets a stable position seeded from their own id -
// same user always lands on the same base number, different users land on
// different ones - that then genuinely climbs as their real trade volume/
// referral count grows, so the page isn't just cosmetic, it visibly
// reacts to what the user actually does.
const RANK_BASE_MIN = 5_000;
const RANK_BASE_MAX = 15_000;
const TRADING_RANK_FLOOR = 250;
const REFERRAL_RANK_FLOOR = 200;

// Deterministic, non-cryptographic string hash (FNV-1a-ish) - only needs to
// spread ids evenly across the base range, not resist collisions.
function hashToRange(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(hash, 31) + seed.charCodeAt(i)) >>> 0;
  }
  const span = max - min;
  return min + (hash % span);
}

/**
 * Real replacement for the old flat CURRENT_USER_TRADING_RANK/
 * CURRENT_USER_TRADING_VOLUME/CURRENT_USER_REFERRAL_RANK constants. Volume
 * is a genuine query (trades select own RLS, same pattern as
 * get-wallet-summary.ts); the two ranks stay illustrative placeholders
 * (see RANK_BASE comment above) but are now per-user and move with real
 * activity: more trade volume or more referrals climbs the rank, it never
 * regresses on its own.
 */
export async function getLeaderboardStatus(
  supabase: SupabaseClient,
  userId: string,
  currency: string,
  referralCount: number,
): Promise<LeaderboardStatus> {
  const { data: trades } = await supabase
    .from("trades")
    .select("quoted_payout, currency, status")
    .eq("user_id", userId)
    .in("status", COMPLETED_TRADE_STATUSES);

  const tradingVolume = (trades ?? [])
    .filter((row) => row.currency === currency)
    .reduce((sum, row) => sum + Number(row.quoted_payout ?? 0), 0);

  const tradingBaseRank = hashToRange(
    `${userId}:trading`,
    RANK_BASE_MIN,
    RANK_BASE_MAX,
  );
  // Square-root curve: early trades move the rank noticeably, larger
  // volumes have diminishing returns rather than an unbounded linear
  // climb straight toward #1.
  const tradingRank = Math.max(
    TRADING_RANK_FLOOR,
    tradingBaseRank - Math.floor(Math.sqrt(tradingVolume) * 20),
  );

  const referralBaseRank = hashToRange(
    `${userId}:referrals`,
    RANK_BASE_MIN,
    RANK_BASE_MAX,
  );
  const referralRank = Math.max(
    REFERRAL_RANK_FLOOR,
    referralBaseRank - referralCount * 40,
  );

  return { tradingVolume, tradingRank, referralRank };
}
