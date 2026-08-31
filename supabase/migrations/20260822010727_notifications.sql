-- Backfilled to match what is actually applied on the live project (see
-- the migration drift reconciliation in docs/deployment.md's Supabase
-- section) — this predates the drift check and was applied directly,
-- without ever being captured as a local file.

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  category text not null check (category in ('trades', 'wallet', 'referrals', 'account')),
  title text not null,
  body text not null,
  related_trade_id uuid references public.trades(id),
  related_withdrawal_id uuid references public.withdrawals(id),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.notifications (user_id, category);
create index on public.notifications (user_id, read_at);

alter table public.notifications enable row level security;

create policy "notifications select own" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifications update own read status" on public.notifications
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No insert/delete policies for clients: notifications are only ever
-- created by the backend (service role) in response to real events
-- (trade status changes, withdrawal updates, referral earnings).
