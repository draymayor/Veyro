alter table public.crypto_assets
  add column if not exists deposit_memo text;

insert into public.crypto_assets (symbol, network, deposit_address, deposit_memo, margin_percentage, is_active) values
  ('BTC',  'BTC',              '1KMjMLpKTMNaGFxtg3aU8nz3SQsQghxErG',                      null,        3.0, true),
  ('ETH',  'Ethereum (ERC20)', '0xecd8402e6bc53cfbeaad35187da50267571f3e1f',               null,        3.0, true),
  ('USDT', 'TRON (TRC20)',     'TSht7mqArKdGqd9eJX6jMkUDr19rvsVzyL',                      null,        3.0, true),
  ('USDT', 'Ethereum (ERC20)', '0xecd8402e6bc53cfbeaad35187da50267571f3e1f',               null,        3.0, true),
  ('BNB',  'BSC (BEP20)',      '0xecd8402e6bc53cfbeaad35187da50267571f3e1f',               null,        3.0, true),
  ('XRP',  'XRP',              'rJn2zAPdFA193sixJwuFixRkYDUtx3apQh',                      '501539705', 3.0, true),
  ('DOGE', 'Dogecoin',         'DRm1kiNhNkDQhVZvt7VQzmhNWuWWuaYqSc',                      null,        3.0, true),
  ('POL',  'Polygon PoS',      '0xecd8402e6bc53cfbeaad35187da50267571f3e1f',               null,        3.0, true),
  ('POL',  'Ethereum (ERC20)', '0xecd8402e6bc53cfbeaad35187da50267571f3e1f',               null,        3.0, true),
  ('AVAX', 'AVAX',             'X-avax1my8e0s2dm9jm2mc3ym37vku4c5qh5m4h97cl3y',           null,        3.0, true),
  ('CELO', 'CELO',             '0xecd8402e6bc53cfbeaad35187da50267571f3e1f',               null,        3.0, true),
  ('FLR',  'FLR',              '0xecd8402e6bc53cfbeaad35187da50267571f3e1f',               null,        3.0, true),
  ('ETC',  'Ethereum Classic', '0xecd8402e6bc53cfbeaad35187da50267571f3e1f',               null,        3.0, true),
  ('KAIA', 'KAIA',             '0xecd8402e6bc53cfbeaad35187da50267571f3e1f',               null,        3.0, true),
  ('XDC',  'XDC',              'xdc535581a0f58b61251fd7fddbe28d55e2d3b5a519',              null,        3.0, true),
  ('LTC',  'LTC',              'LT3iUrt6ysiDjDajh5xN53DArzgzngFw2c',                       null,        3.0, true),
  ('BCH',  'Bitcoin Cash',     '1DvcBpsnbyNP2EU7e5veoKpu8xa7bkPMdm',                       null,        3.0, true),
  ('XLM',  'Stellar Lumens',   'GDT7ARDYZRBXXYOCSQ3MUMISTITSSRWZI6KR2A5L5Q3KB4QIZHGYMTIH', '11616779',  3.0, true),
  ('USDC', 'Ethereum (ERC20)', '0xecd8402e6bc53cfbeaad35187da50267571f3e1f',               null,        3.0, true),
  ('TRX',  'TRON (TRC20)',     'TSht7mqArKdGqd9eJX6jMkUDr19rvsVzyL',                       null,        3.0, true);
