-- Reconciles local migration files with what is actually live (see
-- 20260826230218_sweeper_tables.sql and 20260830212843_deactivate_dropped_coins.sql
-- for earlier instances of this same pattern). This change was applied
-- directly against the database and recorded under this version/name; this
-- file's content is the verbatim statements pulled from
-- supabase_migrations.schema_migrations for this version.
--
-- Adds ETH/USDT/USDC deposit rows for the three L2 networks the sweeper's
-- EVM adapter now covers (Arbitrum One, Optimism, Base), sharing the same
-- deposit address as their L1 counterparts since all EVM chains derive
-- identical addresses from the same xpub.

insert into public.crypto_assets (symbol, network, network_code, deposit_address, margin_percentage, is_active) values
  ('ETH',  'Arbitrum One', 'Arbitrum', '0xecd8402e6bc53cfbeaad35187da50267571f3e1f', 3.0, true),
  ('ETH',  'Optimism',     'Optimism', '0xecd8402e6bc53cfbeaad35187da50267571f3e1f', 3.0, true),
  ('ETH',  'Base',         'Base',     '0xecd8402e6bc53cfbeaad35187da50267571f3e1f', 3.0, true),
  ('USDT', 'Arbitrum One', 'Arbitrum', '0xecd8402e6bc53cfbeaad35187da50267571f3e1f', 3.0, true),
  ('USDT', 'Optimism',     'Optimism', '0xecd8402e6bc53cfbeaad35187da50267571f3e1f', 3.0, true),
  ('USDT', 'Base',         'Base',     '0xecd8402e6bc53cfbeaad35187da50267571f3e1f', 3.0, true),
  ('USDC', 'Arbitrum One', 'Arbitrum', '0xecd8402e6bc53cfbeaad35187da50267571f3e1f', 3.0, true),
  ('USDC', 'Optimism',     'Optimism', '0xecd8402e6bc53cfbeaad35187da50267571f3e1f', 3.0, true),
  ('USDC', 'Base',         'Base',     '0xecd8402e6bc53cfbeaad35187da50267571f3e1f', 3.0, true);
