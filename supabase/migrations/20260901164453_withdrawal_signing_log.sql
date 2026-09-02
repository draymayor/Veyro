
create table public.withdrawal_signing_log (
  id uuid primary key default uuid_generate_v4(),
  withdrawal_id uuid not null references public.withdrawals(id),
  chain text not null check (chain in ('BTC', 'LTC', 'DOGE', 'EVM', 'TRON')),
  from_address text not null,
  to_address text not null,
  amount numeric not null,
  tx_hash text,
  status text not null check (status in ('success', 'failed')),
  failure_reason text,
  created_at timestamptz not null default now()
);

create index on public.withdrawal_signing_log (withdrawal_id);

alter table public.withdrawal_signing_log enable row level security;
-- No client access at all, service role only, written by the
-- consolidator's own dedicated SA, same pattern as sweep_log.
