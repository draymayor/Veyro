-- Split out from the old 0011_totp_backup_codes_and_withdrawal_pin.sql to
-- match what is actually applied on the live project as its own migration
-- (see the migration drift reconciliation in docs/deployment.md's
-- Supabase section).
--
-- Withdrawal PIN: separate, user-set 4-digit PIN required before every
-- withdrawal, independent of TOTP enrollment status (product-rules.md
-- rule 18a).

alter table public.users
  add column if not exists withdrawal_pin_hash text,
  add column if not exists withdrawal_pin_set_at timestamptz,
  add column if not exists withdrawal_pin_failed_attempts int not null default 0,
  add column if not exists withdrawal_pin_locked_until timestamptz;
