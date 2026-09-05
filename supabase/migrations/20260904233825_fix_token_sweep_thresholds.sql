-- Reconciled (2026-09-05): applied directly against the live database on
-- 2026-09-04 (not via the Supabase CLI), so it was missing a local file
-- entirely - caught by the Migration Drift Check. Content below pulled
-- verbatim from supabase_migrations.schema_migrations.statements for
-- version 20260904233825, confirmed before writing this file, not
-- guessed. Unlike the prior migration (20260904233804), this is not a
-- restore to the original 20260826230218_sweeper_tables.sql seed value
-- ('5') - it deliberately sets sweep_min_threshold_trc20_token to '25'
-- instead.

update public.platform_settings set value = '25' where key = 'sweep_min_threshold_trc20_token';
