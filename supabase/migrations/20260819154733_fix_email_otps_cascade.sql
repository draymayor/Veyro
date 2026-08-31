-- Backfilled to match what is actually applied on the live project (see
-- the migration drift reconciliation in docs/deployment.md's Supabase
-- section) — this predates the drift check and was applied directly,
-- without ever being captured as a local file.

alter table public.email_otps drop constraint email_otps_user_id_fkey;
alter table public.email_otps
  add constraint email_otps_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;
