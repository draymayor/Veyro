/**
 * `signed_up`: referred user completed signup only.
 * `first_trade_completed`: referred user made a deposit/first trade, the
 * bonus-triggering activity (docs/product-rules.md), so `bonus_paid_at` is set.
 */
export type ReferralActivityStatus = "signed_up" | "first_trade_completed";

export interface ReferralActivityItem {
  id: string;
  status: ReferralActivityStatus;
  /**
   * Relative label only ("2 weeks ago"), never an exact timestamp, per
   * docs/product-rules.md's privacy rule: with a small referral list, an
   * exact join time could narrow down who a referred user is. Computed
   * server-side in get-summary.ts so this rule holds regardless of what a
   * component does with the prop, not just by convention.
   */
  joinedRelative: string;
}

export interface ReferralSummary {
  code: string;
  link: string;
  totalReferrals: number;
  totalEarnedUsd: number;
  /**
   * Sum of platform_settings.referral_bonus_usd for every referral still
   * pending (bonus_paid_at is null), not yet earned. Distinct from
   * totalEarnedUsd, which only counts referrals whose bonus has actually
   * been paid.
   */
  potentialEarningUsd: number;
  /** Referrals whose referred user joined within periodLabel's window. */
  periodReferralCount: number;
  periodLabel: string;
  activity: ReferralActivityItem[];
}

export type ReferralRowStatus = "pending" | "success";

/** One row of the Referrals page's table (docs/context.md). */
export interface ReferralTableRow {
  id: string;
  /** "User <8-char id>", the same format shown for a user on admin pages, never the referred user's email. */
  referredUserIdLabel: string;
  joinedAt: string;
  status: ReferralRowStatus;
  country: string | null;
}
