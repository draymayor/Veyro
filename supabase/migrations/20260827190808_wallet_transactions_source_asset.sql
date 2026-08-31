alter table public.wallet_transactions
  add column source_asset_symbol text,
  add column source_asset_network text,
  add column source_asset_amount numeric;

comment on column public.wallet_transactions.source_asset_symbol is 'Set only for a standalone manual crypto deposit (AdminDepositsService): the original crypto symbol credited, distinct from the fiat amount/balance_after columns which always record the wallet''s own currency.';
comment on column public.wallet_transactions.source_asset_network is 'Network the source_asset_symbol deposit was on (crypto_assets.network display string), set alongside source_asset_symbol.';
comment on column public.wallet_transactions.source_asset_amount is 'Original crypto quantity credited, set alongside source_asset_symbol - the fiat amount column is the converted/credited value, this is what the admin actually recorded receiving.';
