-- Admin-tunable minimum crypto withdrawal amounts, per user-facing asset
-- symbol (docs/database-schema.md). Same platform_settings pattern as the
-- existing sweep_min_threshold_* rows (20260826230218_sweeper_tables.sql),
-- but a distinct key family: sweep_min_threshold_* governs whether it's
-- worth Veyro's own cost to consolidate a deposit on-chain, while
-- withdrawal_min_* governs the smallest amount a user may request out -
-- a user-facing usability floor (just "not a dust amount"), not an
-- internal cost floor. No such minimum existed anywhere before this
-- migration - confirmed live against platform_settings before writing
-- this file.
--
-- Values are native-unit amounts calibrated against live prices shown on
-- the admin Rate Management page on 2026-09-23 (BTC ~$84,317, ETH
-- ~$2,673, BNB ~$765.60, DOGE ~$0.0922, POL ~$0.1005, AVAX ~$10.31, CELO
-- ~$0.0895, FLR ~$0.0070, ETC ~$8.72, KAIA ~$0.0323, XDC ~$0.0297, LTC
-- ~$60.95, USDT/USDC ~$1, TRX ~$0.3404), deliberately landing in a real
-- but small ~$0.10-$1.00 range (a "not dust" floor, not a "meaningful
-- withdrawal" floor) - BTC sits at the top of that range since it's the
-- highest-value asset supported, everything else scales down from there.
-- These can land below the corresponding sweep_min_threshold_* for that
-- chain (e.g. withdrawal_min_btc is well under sweep_min_threshold_btc)
-- since the two floors now serve different purposes; that's expected, not
-- a bug. Price-sensitive - revisit as prices move, same as any
-- admin-tunable rate.
insert into public.platform_settings (key, value) values
  ('withdrawal_min_btc', '0.00001'),  -- ~$0.84
  ('withdrawal_min_eth', '0.0003'),   -- ~$0.80
  ('withdrawal_min_usdt', '0.5'),     -- ~$0.50
  ('withdrawal_min_bnb', '0.0007'),   -- ~$0.54
  ('withdrawal_min_doge', '2'),       -- ~$0.18
  ('withdrawal_min_pol', '1.5'),      -- ~$0.15
  ('withdrawal_min_avax', '0.03'),    -- ~$0.31
  ('withdrawal_min_celo', '1.5'),     -- ~$0.13
  ('withdrawal_min_flr', '15'),       -- ~$0.11
  ('withdrawal_min_etc', '0.035'),    -- ~$0.31
  ('withdrawal_min_kaia', '3'),       -- ~$0.10
  ('withdrawal_min_xdc', '3.5'),      -- ~$0.10
  ('withdrawal_min_ltc', '0.008'),    -- ~$0.49
  ('withdrawal_min_usdc', '0.5'),     -- ~$0.50
  ('withdrawal_min_trx', '0.6')       -- ~$0.20
on conflict (key) do nothing;
