-- Adds a stable internal chain identifier alongside crypto_assets.network,
-- which now holds clean user-facing display strings (e.g. "Ethereum
-- (ERC20)", "Polygon PoS") seeded directly against this project. Code that
-- needs to resolve a chain's derivation config (CHAIN_CONFIGS in
-- apps/api/src/crypto-addresses/chain-config.ts) or record custody state
-- (user_crypto_addresses.network, which the sweeper also reads) uses
-- network_code, never the display string - see docs/planning-history.md.
alter table public.crypto_assets add column if not exists network_code text;

update public.crypto_assets set network_code = case network
  when 'AVAX' then 'Avalanche'
  when 'Bitcoin Cash' then 'Bitcoin Cash'
  when 'BSC (BEP20)' then 'BEP20'
  when 'BTC' then 'Bitcoin'
  when 'CELO' then 'Celo'
  when 'Dogecoin' then 'Dogecoin'
  when 'Ethereum Classic' then 'Ethereum Classic'
  when 'Ethereum (ERC20)' then 'ERC20'
  when 'FLR' then 'Flare'
  when 'KAIA' then 'Kaia'
  when 'LTC' then 'Litecoin'
  when 'Polygon PoS' then 'Polygon'
  when 'TRON (TRC20)' then 'TRC20'
  when 'XDC' then 'XDC Network'
  when 'Stellar Lumens' then 'Stellar'
  when 'XRP' then 'XRP Ledger'
  else null
end
where network_code is null;

-- Fail loudly rather than silently leaving a row unmapped.
do $$
declare
  unmapped_count int;
begin
  select count(*) into unmapped_count from public.crypto_assets where network_code is null;
  if unmapped_count > 0 then
    raise exception '% crypto_assets row(s) have no network_code mapping - extend the case statement above', unmapped_count;
  end if;
end $$;

alter table public.crypto_assets alter column network_code set not null;
