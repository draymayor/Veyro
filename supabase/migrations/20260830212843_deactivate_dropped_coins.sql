-- Reconciles local migration files with what is actually live (exactly
-- the kind of drift docs/deployment.md's migration-drift-check exists to
-- catch - see 20260826230218_sweeper_tables.sql for the earlier instance
-- of this same pattern). Two separate migration files were drafted
-- locally (one for XRP/XLM, one for BCH) but never actually applied -
-- the change instead landed live, in one combined statement, applied
-- directly against the database and recorded under this version/name.
-- This file's content is the verbatim statements pulled from
-- supabase_migrations.schema_migrations for this version, so local now
-- matches what's actually running rather than describing a change that
-- was only ever drafted.
--
-- XRP, Stellar, and Bitcoin Cash were all dropped from the supported coin
-- list (docs/planning-history.md's Sweeper section): none of the three
-- has a local-mnemonic wallet-provider in Tatum's current SDK, only
-- server-side REST generation - a materially different trust model than
-- every other supported chain. Deactivating rather than deleting,
-- consistent with how the earlier-dropped SOL rows were handled.

update public.crypto_assets
set is_active = false
where symbol in ('BCH', 'XRP', 'XLM');

delete from public.platform_settings
where key in ('sweep_min_threshold_bch', 'sweep_min_threshold_xrp', 'sweep_min_threshold_xlm');
