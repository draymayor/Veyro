
insert into public.consolidation_wallets (chain, address, is_active) values
  ('BTC',  'bc1qy7x9rwwsl040yvsqzn3z7pzu6kfqqnlh7hdqtf', true),
  ('LTC',  'ltc1qnz7puz5tsrxlqhalype5g8ka9wc6mpaq2mwlpf', true),
  ('DOGE', 'DJUj8Gat7zQjgs1kihJrQxMuEmdwaT7jij', true),
  ('EVM',  '0xEFBd08FeE5ef5675f2b58130A7FDF12Ff8b56Fd8', true),
  ('TRON', 'THBtaNXhWjzyE5ncfHxU7RYJNH3s6cfvXc', true);

insert into public.platform_settings (key, value) values
  ('crypto_withdrawal_signing_mode', 'manual')
on conflict (key) do nothing;
