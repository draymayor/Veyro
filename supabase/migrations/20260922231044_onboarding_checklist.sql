
-- New-user onboarding checklist (dashboard widget): verify email, claim a
-- bonus, make a first deposit, set a withdrawal PIN. Every step's
-- completion is read off state that already exists elsewhere
-- (email_verified_at, earn_bonus_claims/welcome_bonus_claims,
-- crypto_wallet_transactions, withdrawal_pin_set_at) - this column is only
-- for the one piece of state that doesn't already exist: whether the user
-- dismissed the widget early, before completing every step.
alter table public.users
  add column onboarding_dismissed_at timestamptz;
