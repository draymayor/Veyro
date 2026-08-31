-- Backfilled to match what is actually applied on the live project (see
-- the migration drift reconciliation in docs/deployment.md's Supabase
-- section) — this predates the drift check and was applied directly,
-- without ever being captured as a local file.

revoke execute on function public.rls_auto_enable() from anon, authenticated;
