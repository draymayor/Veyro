create extension if not exists "uuid-ossp";

-- Users (extends auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  country text,
  currency text,
  kyc_status text not null default 'not_started' check (kyc_status in ('not_started','manual_reviewed')),
  account_status text not null default 'active' check (account_status in ('active','restricted','banned')),
  referral_code text unique,
  referred_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

-- Gift card brands
create table public.gift_card_brands (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Gift card rates
create table public.gift_card_rates (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references public.gift_card_brands(id),
  country text not null,
  card_type text not null check (card_type in ('physical','e-code')),
  min_denomination numeric not null,
  max_denomination numeric not null,
  rate numeric not null,
  currency text not null,
  is_active boolean not null default true,
  effective_from timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Crypto assets (static deposit addresses, V1 no-custody model)
create table public.crypto_assets (
  id uuid primary key default uuid_generate_v4(),
  symbol text not null,
  network text not null,
  deposit_address text not null,
  is_active boolean not null default true,
  unique (symbol, network)
);

-- Trades (gift_card + crypto, discriminated)
create table public.trades (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id),
  asset_type text not null check (asset_type in ('gift_card','crypto')),
  status text not null check (status in (
    'awaiting_deposit_confirmation','submitted','under_review',
    'approved','rejected','paid','disputed','cancelled'
  )),
  rejection_reason text,

  rate_id uuid,
  rate_value numeric not null,
  asset_amount numeric not null,
  quoted_payout numeric not null,
  currency text not null,

  gift_card_brand_id uuid references public.gift_card_brands(id),
  card_country text,
  card_type text,
  card_code text,
  card_pin text,

  crypto_asset_id uuid references public.crypto_assets(id),
  tx_hash text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz
);

-- Trade files
create table public.trade_files (
  id uuid primary key default uuid_generate_v4(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  file_type text not null check (file_type in ('card_image','receipt','deposit_proof_screenshot')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- Wallets (cached balance, derived from ledger)
create table public.wallets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id),
  currency text not null,
  balance numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, currency)
);

-- Withdrawals
create table public.withdrawals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id),
  amount numeric not null,
  method text not null check (method in ('bank_transfer','paypal','crypto')),
  status text not null default 'requested' check (status in ('requested','processing','paid','failed')),
  bank_details jsonb,
  paypal_email text,
  crypto_asset_id uuid references public.crypto_assets(id),
  crypto_payout_address text,
  transaction_reference text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references public.users(id)
);

-- Wallet ledger (append-only, source of truth)
create table public.wallet_transactions (
  id uuid primary key default uuid_generate_v4(),
  wallet_id uuid not null references public.wallets(id),
  trade_id uuid references public.trades(id),
  withdrawal_id uuid references public.withdrawals(id),
  type text not null check (type in ('credit','debit')),
  amount numeric not null,
  balance_after numeric not null,
  created_at timestamptz not null default now()
);

-- Referrals
create table public.referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_id uuid not null references public.users(id),
  referred_id uuid not null references public.users(id),
  bonus_amount numeric,
  bonus_paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- Admin audit log
create table public.admin_actions (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references public.users(id),
  action_type text not null,
  target_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

-- Indexes for common lookups
create index on public.trades (user_id);
create index on public.trades (status);
create index on public.wallet_transactions (wallet_id);
create index on public.withdrawals (user_id);
create index on public.gift_card_rates (brand_id, country, card_type);
