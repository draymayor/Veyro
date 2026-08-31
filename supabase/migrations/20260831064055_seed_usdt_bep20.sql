-- Reconciles local migration files with what is actually live (see
-- 20260826230218_sweeper_tables.sql and 20260830212843_deactivate_dropped_coins.sql
-- for earlier instances of this same pattern). This change was applied
-- directly against the database and recorded under this version/name; this
-- file's content is the verbatim statements pulled from
-- supabase_migrations.schema_migrations for this version.

insert into public.crypto_assets (symbol, network, network_code, deposit_address, margin_percentage, is_active) values
  ('USDT', 'BSC (BEP20)', 'BEP20', '0xecd8402e6bc53cfbeaad35187da50267571f3e1f', 3.0, true);
