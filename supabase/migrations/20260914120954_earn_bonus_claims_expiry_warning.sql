
-- Tracks whether the "expires tomorrow" reminder email has already gone
-- out for a claim, so EarnExpiryWarningService's poller can never send it
-- twice for the same claim even if it finds the same row again before
-- expiry (crash/restart, overlapping ticks, multiple instances).
alter table public.earn_bonus_claims
  add column expiry_warning_sent_at timestamptz;

-- The poller's query is "still claimed, warning not yet sent, expiring
-- within a day" - all three narrow the same small index well.
create index on public.earn_bonus_claims (status, expiry_warning_sent_at, expires_at);
