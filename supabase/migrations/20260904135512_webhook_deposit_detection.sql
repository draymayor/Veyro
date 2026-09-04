-- Webhook-based crypto deposit auto-crediting (docs/context.md /
-- product-rules.md "hybrid model" - webhook where covered, else admin
-- manual check; only the manual half existed before this). Confirmed
-- directly against the live Tatum dashboard (2026-09-04): the real
-- ADDRESS_TRANSACTION subscription cap on this account's FREE plan is 5
-- total, platform-wide, shared across every chain - not per-user or
-- per-chain. That scarcity is why coverage must be a stored fact
-- (tatum_subscription_id below), not something inferred at request time.

-- Non-null = this address has a live Tatum subscription watching it
-- (webhook-covered). Null = falls back to the existing admin
-- manual-check path exactly as before. Set once, right after the
-- subscription is successfully created in getOrCreateAddress - never
-- client-writable, same posture as every other column on this table.
alter table public.user_crypto_addresses
  add column tatum_subscription_id text;

-- Real-money deposit dedupe + confirmation tracking. Neither
-- crypto_wallets nor crypto_wallet_transactions has anywhere to record a
-- tx hash today, so there was previously no way to answer "have I
-- already credited this exact on-chain transaction" - this table is
-- that answer. UNIQUE(network, tx_hash, address) is the actual guard
-- against crediting the same deposit twice, whether from a genuine
-- Tatum webhook redelivery (they retry 3x on this plan) or any other
-- double-fire.
create table public.crypto_deposit_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  symbol text not null,
  network text not null,
  address text not null,
  tx_hash text not null,
  amount numeric not null,
  status text not null default 'pending_confirmation'
    check (status in ('pending_confirmation', 'credited', 'orphaned_reorg')),
  crypto_wallet_transaction_id uuid references public.crypto_wallet_transactions(id),
  created_at timestamptz not null default now(),
  credited_at timestamptz,
  unique (network, tx_hash, address)
);

create index on public.crypto_deposit_events (user_id);
create index on public.crypto_deposit_events (status);

alter table public.crypto_deposit_events enable row level security;

create policy "crypto_deposit_events select own" on public.crypto_deposit_events
  for select using (auth.uid() = user_id);

-- No client insert/update/delete: only the webhook handler and its
-- confirmation-depth poller (service role) ever write this table.

-- A webhook-driven credit is a genuinely distinct source from an
-- admin's manual confirmation, needs its own type for the admin-facing
-- All Transactions view and any future reconciliation to tell them
-- apart. 'reorg_reversal' covers the (rare, but real-money-relevant)
-- case where a previously-credited deposit's transaction is later found
-- to have been reorged out - see crypto_deposit_events.status
-- 'orphaned_reorg' above, which pairs with this.
alter table public.crypto_wallet_transactions
  drop constraint crypto_wallet_transactions_type_check;

alter table public.crypto_wallet_transactions
  add constraint crypto_wallet_transactions_type_check
  check (type in ('deposit', 'sell_conversion_debit', 'withdrawal', 'admin_credit', 'admin_debit', 'webhook_deposit', 'reorg_reversal'));
