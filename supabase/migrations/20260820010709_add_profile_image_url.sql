-- Backfilled to match what is actually applied on the live project (see
-- the migration drift reconciliation in docs/deployment.md's Supabase
-- section) — this predates the drift check and was applied directly,
-- without ever being captured as a local file.

alter table public.users
  add column if not exists profile_image_url text;
