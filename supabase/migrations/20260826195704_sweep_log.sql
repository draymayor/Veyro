create table public.sweep_log (
  id uuid primary key default uuid_generate_v4(),
  symbol text not null,
  network text not null,
  from_address text not null,
  to_address text not null,
  amount numeric,
  tx_hash text,
  status text not null check (status in ('success', 'failed', 'skipped_below_threshold')),
  failure_reason text,
  created_at timestamptz not null default now()
);

create index on public.sweep_log (symbol, network, created_at);

alter table public.sweep_log enable row level security;

-- No client access at all (read or write), admin views this via the
-- backend using service role, never direct client queries. The
-- sweeper job itself writes here using its own dedicated service
-- account credentials, not the main API's.
