-- Reconciles local migration files with what is actually live (see
-- 20260826231604_crypto_assets_network_code.sql and
-- 20260831002348_seed_l2_network_pairs.sql for earlier instances of this
-- same pattern). Applied directly against the database and recorded under
-- this version/name; this file's content is the verbatim statement pulled
-- from supabase_migrations.schema_migrations for this version.
--
-- platform_settings.referral_bonus_usd was live at 0.001 (rounding to $0
-- on the Referrals page's 0-decimal formatter, reading as a stale/frozen
-- card even though the underlying query was live and correct) - corrected
-- to the intended $10 per referral.

update public.platform_settings
set value = '10'
where key = 'referral_bonus_usd';
