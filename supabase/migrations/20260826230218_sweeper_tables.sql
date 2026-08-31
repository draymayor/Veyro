-- Sweeper infrastructure (docs/planning-history.md's Sweeper section). This
-- reconciles an incomplete sweep_log table that had been created directly
-- against this project (network/failure_reason columns, no sweep_group,
-- no indexes) without a matching committed migration ever landing for it -
-- exactly the kind of drift docs/deployment.md's migration-drift-check
-- exists to catch. Table had 0 rows, so this is a pure schema reshape, no
-- data migration needed. (sweep_log_status_check already existed with the
-- exact values this design needs, so it's left as-is, not recreated.)

alter table public.sweep_log rename column network to chain;
alter table public.sweep_log rename column failure_reason to error_message;
alter table public.sweep_log add column if not exists sweep_group text;
alter table public.sweep_log add column if not exists fee_estimate numeric;

update public.sweep_log set sweep_group = 'evm' where sweep_group is null;
alter table public.sweep_log alter column sweep_group set not null;
alter table public.sweep_log add constraint sweep_log_sweep_group_check check (sweep_group in ('utxo', 'evm'));

create index if not exists sweep_log_chain_created_at_idx on public.sweep_log (chain, created_at desc);
create index if not exists sweep_log_from_address_idx on public.sweep_log (from_address);

-- consolidation_wallets did not exist at all - net new.
create table if not exists public.consolidation_wallets (
  id uuid primary key default uuid_generate_v4(),
  chain text not null unique,
  address text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.consolidation_wallets enable row level security;

-- Fee-aware minimum sweep thresholds - none of these rows existed yet.
insert into public.platform_settings (key, value) values
  ('sweep_min_threshold_btc', '0.0005'),
  ('sweep_min_threshold_ltc', '0.01'),
  ('sweep_min_threshold_bch', '0.001'),
  ('sweep_min_threshold_doge', '50'),
  ('sweep_min_threshold_evm_native', '0.005'),
  ('sweep_min_threshold_erc20_token', '25'),
  ('sweep_min_threshold_trx', '20'),
  ('sweep_min_threshold_trc20_token', '5'),
  ('sweep_min_threshold_xrp', '5'),
  ('sweep_min_threshold_xlm', '10')
on conflict (key) do nothing;
