-- Reconciled (2026-09-05): applied directly against the live database on
-- 2026-09-04 (not via the Supabase CLI), so it was missing a local file
-- entirely - caught by the Migration Drift Check. Content below pulled
-- verbatim from supabase_migrations.schema_migrations.statements for
-- version 20260904233804, confirmed before writing this file, not
-- guessed. Restores 5 sweep thresholds to the exact values they were
-- originally seeded at in 20260826230218_sweeper_tables.sql (btc, ltc,
-- doge, evm_native, trx) - notably NOT touching
-- sweep_min_threshold_erc20_token (still drifted at the time, replaced
-- entirely by 20260905000000_erc20_sweep_fee_multiple_threshold.sql) or
-- sweep_min_threshold_trc20_token (addressed separately, see
-- 20260904233825_fix_token_sweep_thresholds.sql).

update public.platform_settings set value = '0.0005' where key = 'sweep_min_threshold_btc';
update public.platform_settings set value = '0.01' where key = 'sweep_min_threshold_ltc';
update public.platform_settings set value = '50' where key = 'sweep_min_threshold_doge';
update public.platform_settings set value = '0.005' where key = 'sweep_min_threshold_evm_native';
update public.platform_settings set value = '20' where key = 'sweep_min_threshold_trx';
