create table public.user_crypto_addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  symbol text not null,
  network text not null,
  address text not null,
  derivation_index integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, symbol, network)
);

create index on public.user_crypto_addresses (user_id);
create index on public.user_crypto_addresses (address);

alter table public.user_crypto_addresses enable row level security;

create policy "user_crypto_addresses select own" on public.user_crypto_addresses
  for select using (auth.uid() = user_id);

-- No client insert/update/delete: addresses are only ever generated
-- and written by the backend (service role) via Tatum, deterministic
-- from the master xpub + derivation_index, never client-controlled.
