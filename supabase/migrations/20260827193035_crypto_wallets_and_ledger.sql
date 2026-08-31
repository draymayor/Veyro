-- Real held per-user crypto balances (docs/database-schema.md, product-rules.md
-- rules 6a/16): a confirmed deposit credits this table directly and never
-- touches the fiat wallets table at all. Selling is a later, separate,
-- user-initiated instant conversion that debits this table and credits
-- wallets in one atomic action. Withdrawing debits this table directly.
-- Mirrors the wallets/wallet_transactions pattern exactly, keyed by
-- user_id + symbol directly (not a wallet_id FK) since there is no
-- multi-row-per-user concept here beyond one row per symbol.

create table public.crypto_wallets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  symbol text not null,
  balance numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, symbol)
);
create index on public.crypto_wallets (user_id);

create table public.crypto_wallet_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  symbol text not null,
  type text not null check (type in ('deposit', 'sell_conversion_debit', 'withdrawal', 'admin_credit', 'admin_debit')),
  amount numeric not null,
  balance_after numeric not null,
  related_trade_id uuid references public.trades(id),
  related_withdrawal_id uuid references public.withdrawals(id),
  created_at timestamptz not null default now()
);
create index on public.crypto_wallet_transactions (user_id);
create index on public.crypto_wallet_transactions (related_trade_id);
create index on public.crypto_wallet_transactions (related_withdrawal_id);

alter table public.crypto_wallets enable row level security;
alter table public.crypto_wallet_transactions enable row level security;

-- Read only, no client writes at all - same posture as wallets/
-- wallet_transactions and user_crypto_addresses. Only the backend
-- (service role) ever credits/debits these.
create policy "crypto_wallets select own" on public.crypto_wallets
  for select using (auth.uid() = user_id);

create policy "crypto_wallet_transactions select own" on public.crypto_wallet_transactions
  for select using (auth.uid() = user_id);
