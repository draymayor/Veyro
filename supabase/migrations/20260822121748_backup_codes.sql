-- Split out from the old 0011_totp_backup_codes_and_withdrawal_pin.sql to
-- match what is actually applied on the live project as its own migration
-- (see the migration drift reconciliation in docs/deployment.md's
-- Supabase section).
--
-- TOTP account-recovery backup codes (docs/database-schema.md's
-- backup_codes table).

create table public.backup_codes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.backup_codes (user_id);

alter table public.backup_codes enable row level security;
-- No client access at all, generated once at TOTP enrollment and
-- consumed only through backend-verified withdrawal confirmation or
-- account recovery, same as email_otps.
