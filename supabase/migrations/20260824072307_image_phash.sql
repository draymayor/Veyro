-- Backfilled to match what is actually applied on the live project (see
-- the migration drift reconciliation in docs/deployment.md's Supabase
-- section) — this predates the drift check and was applied directly,
-- without ever being captured as a local file.

alter table public.trade_files
  add column if not exists image_phash text;

create index if not exists trade_files_phash_idx on public.trade_files (image_phash);
