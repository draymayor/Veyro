// Careers/Scout program (docs/database-schema.md's Careers / Scout program
// section). Fixed platform list from the application form spec - kept here
// as the one server-side source of truth so ScoutService can validate
// submitted platform keys without trusting client input.
export const SCOUT_PLATFORM_KEYS = [
  'reddit',
  'x_twitter',
  'threads',
  'facebook',
  'discord',
  'telegram',
  'tiktok',
  'quora',
  'linkedin',
  'instagram_status',
] as const;

export type ScoutPlatformKey = (typeof SCOUT_PLATFORM_KEYS)[number];

export const SCOUT_SETTING_KEYS = {
  dailyRateUsd: 'scout_daily_rate_usd',
  minLinksPerDay: 'scout_min_links_per_day',
  requiredPaidDays: 'scout_required_paid_days',
  maxPendingDaysBeforeBlock: 'scout_max_pending_days_before_block',
} as const;

// A scout day stays open for a full 24h from opened_at regardless of how
// fast the link minimum is hit - see ScoutService's class-level comment.
// Not a platform_setting since it's a fixed program rule, not something
// admins are expected to tune per-cohort like the link/day counts above.
export const SCOUT_DAY_DURATION_MS = 24 * 60 * 60 * 1000;

// Matches the values seeded live in platform_settings (docs/database-schema.md);
// only ever used if a row is somehow missing.
export const SCOUT_SETTING_FALLBACKS = {
  dailyRateUsd: 240,
  minLinksPerDay: 10,
  requiredPaidDays: 30,
  maxPendingDaysBeforeBlock: 5,
};
