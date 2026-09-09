
create table public.earn_bonus_claims (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  bonus_amount_usd numeric not null check (bonus_amount_usd in (50, 100)),
  required_trade_volume_usd numeric not null check (required_trade_volume_usd in (100, 150)),
  status text not null default 'claimed' check (status in ('claimed', 'unlocked', 'paid', 'expired')),
  claimed_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '3 days'),
  unlocked_at timestamptz,
  paid_at timestamptz,
  wallet_transaction_id uuid references public.wallet_transactions(id)
);

create index on public.earn_bonus_claims (status, expires_at);

alter table public.earn_bonus_claims enable row level security;

create policy "earn_bonus_claims select own" on public.earn_bonus_claims
  for select using (auth.uid() = user_id);

-- No client insert/update/delete: claim/unlock/pay transitions are
-- backend-only (service role), same pattern as every financial-state
-- table in this system.
