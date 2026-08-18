alter table public.users enable row level security;
alter table public.trades enable row level security;
alter table public.trade_files enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.withdrawals enable row level security;
alter table public.referrals enable row level security;
alter table public.gift_card_brands enable row level security;
alter table public.gift_card_rates enable row level security;
alter table public.crypto_assets enable row level security;
alter table public.admin_actions enable row level security;

-- users: read/update own profile
create policy "users select own" on public.users for select using (auth.uid() = id);
create policy "users update own" on public.users for update using (auth.uid() = id);

-- trades: read own; insert own; no client-side update (status transitions are backend-only via service role)
create policy "trades select own" on public.trades for select using (auth.uid() = user_id);
create policy "trades insert own" on public.trades for insert with check (auth.uid() = user_id);

-- trade_files: read/insert own, via parent trade ownership
create policy "trade_files select own" on public.trade_files for select
  using (exists (select 1 from public.trades t where t.id = trade_id and t.user_id = auth.uid()));
create policy "trade_files insert own" on public.trade_files for insert
  with check (exists (select 1 from public.trades t where t.id = trade_id and t.user_id = auth.uid()));

-- wallets: read only, no client writes at all
create policy "wallets select own" on public.wallets for select using (auth.uid() = user_id);

-- wallet_transactions: read only, no client writes at all
create policy "wallet_transactions select own" on public.wallet_transactions for select
  using (exists (select 1 from public.wallets w where w.id = wallet_id and w.user_id = auth.uid()));

-- withdrawals: read own; insert own (request); no client-side update (processing is backend-only)
create policy "withdrawals select own" on public.withdrawals for select using (auth.uid() = user_id);
create policy "withdrawals insert own" on public.withdrawals for insert with check (auth.uid() = user_id);

-- referrals: read where user is referrer or referred
create policy "referrals select own" on public.referrals for select
  using (auth.uid() = referrer_id or auth.uid() = referred_id);

-- gift_card_brands, gift_card_rates, crypto_assets: public read (needed for public rates/sell pages)
create policy "gift_card_brands public read" on public.gift_card_brands for select using (true);
create policy "gift_card_rates public read" on public.gift_card_rates for select using (is_active = true);
create policy "crypto_assets public read" on public.crypto_assets for select using (is_active = true);

-- admin_actions: no client access at all (no policy = no access under RLS by default)

-- Follow-up hardening applied live on 2026-08-12 (originally its own migration,
-- folded in here since it's RLS-related): the auto-enable-RLS helper function
-- should not be directly callable by client roles.
revoke execute on function public.rls_auto_enable() from anon, authenticated;
