-- Tracks per-(network, provider) detection-capacity health, kept deliberately
-- separate from crypto_assets.is_active (docs/planning-history.md's capacity
-- monitoring design, 2026-09-07): is_active is an admin's durable business
-- decision about whether an asset/network is offered at all, and nothing but
-- the admin should ever change it. This table is the automation's own
-- state - which network+provider pairs are currently unable to reliably
-- detect deposits - so a provider rate-limit trip and its later auto-recovery
-- never touch, read as, or overwrite the admin's is_active setting. A network
-- is only depositable when both are true; see the depositable check added to
-- crypto-addresses.service.ts and the manual-deposit admin filter.
create table public.network_availability (
  id uuid primary key default uuid_generate_v4(),
  network_code text not null,
  provider text not null,
  status text not null default 'available'
    check (status in ('available', 'degraded', 'unavailable')),
  reason text,
  disabled_at timestamptz,
  auto_recovery_at timestamptz,
  consecutive_failures integer not null default 0,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (network_code, provider)
);

-- Scheduled recovery-probe job scans for due retries.
create index network_availability_recovery_due_idx
  on public.network_availability (auto_recovery_at)
  where status = 'unavailable';

alter table public.network_availability enable row level security;

-- No client policy at all, same as admin_actions: only the backend
-- (service role) reads/writes this. The admin dashboard gets it via the
-- existing apps/api REST endpoints, not a direct client-side Supabase
-- query, so no "public read" policy is needed here the way crypto_assets
-- has one for the public rates page.
