/**
 * Illustrative Leaderboard data: weekly trading-volume and referral
 * rankings (docs/context.md's Leaderboard section). No backend wiring
 * yet, this stands in for `leaderboard_entries`
 * (docs/database-schema.md), the periodically-computed aggregate over
 * `trades` and `referrals` for the current week. Trading volume already
 * combines gift card and crypto trades into one number per user, exactly
 * as the real aggregate will, so swapping this constant for a real query
 * shouldn't require touching the components that render it.
 */

export const LEADERBOARD_PERIOD_LABEL = "This Week";
// Display currency for the ranking stats below, defaults to USD per
// docs/product-rules.md rule 13, same cosmetic-display-currency concept
// used on the Home/Assets balance cards, never a real wallet currency.
export const LEADERBOARD_CURRENCY = "USD";

export interface LeaderboardUser {
  id: string;
  email: string;
}

export interface TradingLeaderboardEntry {
  rank: number;
  user: LeaderboardUser;
  volume: number;
}

export interface ReferralLeaderboardEntry {
  rank: number;
  user: LeaderboardUser;
  referralCount: number;
}

// The viewer's own rank and stat, illustrative until real aggregation is
// wired in. Identity (id/email/avatar) deliberately isn't included here,
// unlike the other rows: the viewer's row always uses their actual signed-in
// AppUser (see LeaderboardPage), so their avatar matches Profile, the
// sidebar, and everywhere else it's shown, one source of truth, not a
// second placeholder identity that could drift from the real one.
export const CURRENT_USER_TRADING_RANK = 47;
export const CURRENT_USER_TRADING_VOLUME = 128_400;
export const CURRENT_USER_REFERRAL_RANK = 132;
export const CURRENT_USER_REFERRAL_COUNT = 1;

export const TRADING_LEADERBOARD: TradingLeaderboardEntry[] = [
  {
    rank: 1,
    user: { id: "u-1", email: "chidera.okafor@gmail.com" },
    volume: 3_842_000,
  },
  {
    rank: 2,
    user: { id: "u-2", email: "amara.nwosu@yahoo.com" },
    volume: 3_210_500,
  },
  {
    rank: 3,
    user: { id: "u-3", email: "tunde.balogun@gmail.com" },
    volume: 2_875_000,
  },
  {
    rank: 4,
    user: { id: "u-4", email: "funmi.adeyemi@outlook.com" },
    volume: 2_340_800,
  },
  {
    rank: 5,
    user: { id: "u-5", email: "emeka.eze@gmail.com" },
    volume: 1_980_200,
  },
  {
    rank: 6,
    user: { id: "u-6", email: "bisi.oladipo@gmail.com" },
    volume: 1_705_000,
  },
  {
    rank: 7,
    user: { id: "u-7", email: "kelechi.nnamdi@yahoo.com" },
    volume: 1_412_600,
  },
  {
    rank: 8,
    user: { id: "u-8", email: "zainab.suleiman@gmail.com" },
    volume: 1_188_400,
  },
  {
    rank: 9,
    user: { id: "u-9", email: "victor.okoye@gmail.com" },
    volume: 964_100,
  },
  {
    rank: 10,
    user: { id: "u-10", email: "hauwa.bello@outlook.com" },
    volume: 812_700,
  },
];

export const REFERRALS_LEADERBOARD: ReferralLeaderboardEntry[] = [
  {
    rank: 1,
    user: { id: "u-1", email: "chidera.okafor@gmail.com" },
    referralCount: 34,
  },
  {
    rank: 2,
    user: { id: "u-11", email: "seun.adebayo@gmail.com" },
    referralCount: 29,
  },
  {
    rank: 3,
    user: { id: "u-4", email: "funmi.adeyemi@outlook.com" },
    referralCount: 25,
  },
  {
    rank: 4,
    user: { id: "u-12", email: "ifeoma.chukwu@yahoo.com" },
    referralCount: 21,
  },
  {
    rank: 5,
    user: { id: "u-6", email: "bisi.oladipo@gmail.com" },
    referralCount: 18,
  },
  {
    rank: 6,
    user: { id: "u-13", email: "damola.fashola@gmail.com" },
    referralCount: 15,
  },
  {
    rank: 7,
    user: { id: "u-2", email: "amara.nwosu@yahoo.com" },
    referralCount: 12,
  },
  {
    rank: 8,
    user: { id: "u-14", email: "ngozi.eze@outlook.com" },
    referralCount: 9,
  },
  {
    rank: 9,
    user: { id: "u-9", email: "victor.okoye@gmail.com" },
    referralCount: 7,
  },
  {
    rank: 10,
    user: { id: "u-15", email: "yusuf.ibrahim@gmail.com" },
    referralCount: 5,
  },
];
