-- General-purpose store for admin-tunable global values (docs/database-schema.md),
-- not per-asset/per-trade settings, those stay in their own tables (e.g.
-- crypto_assets.margin_percentage). First consumer: the Leaderboard page's
-- referral teaser card, which reads referral_bonus_usd instead of hardcoding it.
create table public.platform_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id)
);

alter table public.platform_settings enable row level security;

-- Public read (needed for display, e.g. the referral card's "$X per referral"
-- text), admin-only write via backend service role, no client write policy.
create policy "platform_settings public read" on public.platform_settings
  for select using (true);

insert into public.platform_settings (key, value) values
  ('referral_bonus_usd', '10')
on conflict (key) do nothing;
