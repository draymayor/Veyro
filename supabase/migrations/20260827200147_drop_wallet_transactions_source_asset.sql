-- Superseded by crypto_wallets/crypto_wallet_transactions
-- (20260827193035_crypto_wallets_and_ledger.sql): a manual crypto deposit
-- now credits crypto_wallets directly rather than converting to fiat and
-- recording the original asset alongside a wallet_transactions row, so
-- these columns (added earlier the same day, never used in a released
-- build) are dead.
alter table public.wallet_transactions
  drop column source_asset_symbol,
  drop column source_asset_network,
  drop column source_asset_amount;
