-- Split out from the old 0011_totp_backup_codes_and_withdrawal_pin.sql to
-- match what is actually applied on the live project as its own migration
-- (see the migration drift reconciliation in docs/deployment.md's
-- Supabase section).
--
-- Reuses email_otps rather than a new table (see database-schema.md): the
-- 'withdrawal_confirmation' purpose is a PIN-reset verification path, not
-- a per-withdrawal fallback.

alter table public.email_otps drop constraint email_otps_purpose_check;
alter table public.email_otps
  add constraint email_otps_purpose_check
  check (purpose in ('signup_verification', 'password_reset', 'withdrawal_confirmation'));
