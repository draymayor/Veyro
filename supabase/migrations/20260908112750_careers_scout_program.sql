
create table public.scout_applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  applied_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id),
  rejection_reason text,
  unique (user_id)
);

create table public.scout_days (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'pending_review', 'approved', 'rejected')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id),
  rejection_reason text,
  payout_amount_usd numeric,
  wallet_transaction_id uuid references public.wallet_transactions(id)
);

create index on public.scout_days (user_id, status);

create table public.scout_link_submissions (
  id uuid primary key default uuid_generate_v4(),
  scout_day_id uuid not null references public.scout_days(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  url text not null,
  platform text,
  focus_tag text check (focus_tag in ('recruit_scouts', 'recruit_users', null)),
  submitted_at timestamptz not null default now(),
  link_status text not null default 'pending' check (link_status in ('pending', 'approved', 'rejected')),
  rejection_reason text
);

create index on public.scout_link_submissions (scout_day_id);

alter table public.scout_applications enable row level security;
alter table public.scout_days enable row level security;
alter table public.scout_link_submissions enable row level security;

create policy "scout_applications select own" on public.scout_applications
  for select using (auth.uid() = user_id);
create policy "scout_days select own" on public.scout_days
  for select using (auth.uid() = user_id);
create policy "scout_link_submissions select own" on public.scout_link_submissions
  for select using (auth.uid() = user_id);

-- No client insert/update/delete on any of the three: application
-- submission, link submission, day-closing, and all admin review
-- actions are backend-only (service role), same pattern as every
-- financial-state table in this system.

insert into public.platform_settings (key, value) values
  ('scout_daily_rate_usd', '240'),
  ('scout_min_links_per_day', '10'),
  ('scout_required_paid_days', '30'),
  ('scout_max_pending_days_before_block', '5')
on conflict (key) do nothing;
