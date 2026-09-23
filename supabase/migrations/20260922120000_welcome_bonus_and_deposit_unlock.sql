
-- Welcome bonus program + switching both bonus programs' unlock condition
-- from trade volume to real crypto deposit volume (gift-card trade volume
-- no longer counts toward unlocking a bonus - see docs/database-schema.md).
-- Both bonuses now credit the wallet the instant they're granted and rely
-- on the withdrawal-time "locked floor" mechanic (the same one
-- ScoutService.getWithdrawalLock already proves out) instead of holding
-- the credit back until unlock - see BonusWithdrawalLockService.

create table public.welcome_bonus_claims (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  bonus_amount_usd numeric not null check (bonus_amount_usd > 0),
  required_deposit_usd numeric not null check (required_deposit_usd > 0),
  status text not null default 'granted' check (status in ('granted', 'unlocked')),
  granted_at timestamptz not null default now(),
  unlocked_at timestamptz,
  wallet_transaction_id uuid references public.wallet_transactions(id),
  reminder_1_sent_at timestamptz,
  reminder_2_sent_at timestamptz
);

create index on public.welcome_bonus_claims (status);

alter table public.welcome_bonus_claims enable row level security;

create policy "welcome_bonus_claims select own" on public.welcome_bonus_claims
  for select using (auth.uid() = user_id);

-- No client insert/update/delete: granted at signup completion and
-- unlocked by the deposit-confirmation path, both backend-only (service
-- role), same posture as earn_bonus_claims.

-- earn_bonus_claims: the unlock condition is now "deposit_usd worth of
-- real crypto deposits since claimed_at", not trade volume - rename the
-- column so its name still describes what it actually gates. The CHECK
-- constraint (> 0) carries over unchanged since it never encoded the old
-- meaning, just a positive amount.
alter table public.earn_bonus_claims
  rename column required_trade_volume_usd to required_deposit_usd;

-- Same two-reminder-then-stop cadence as welcome_bonus_claims, replacing
-- the old expiry_warning_sent_at flow: the pool bonus no longer expires
-- once claimed (see BonusReminderService), it just reminds at day 2 and
-- day 4 if the deposit requirement still isn't met, then stops.
alter table public.earn_bonus_claims
  add column reminder_1_sent_at timestamptz,
  add column reminder_2_sent_at timestamptz;

-- NOTE: expires_at, expiry_warning_sent_at and the 'expired'/'paid'
-- status values are left in place for historical rows (pre-existing
-- claims already resolved under the old trade-volume/expiry design) -
-- new code (EarnService, BonusReminderService) simply stops writing to
-- them. earn_bonus_claims_one_active_per_user (status in ('claimed',
-- 'unlocked')) is unchanged and still correct: since nothing forfeits
-- back out of that set anymore, it now behaves as "one claim ever" in
-- practice, matching the "claimed once" product rule.

insert into public.platform_settings (key, value) values
  ('welcome_bonus_usd', '20'),
  ('welcome_bonus_required_deposit_usd', '50')
on conflict (key) do nothing;
