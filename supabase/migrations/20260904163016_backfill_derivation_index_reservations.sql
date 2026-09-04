-- Backfills user_derivation_index_reservations from every address already
-- live in user_crypto_addresses. That table (20260831073305_fix_derivation_index_scoping.sql)
-- was created to make CryptoAddressesService.reserveDerivationIndex
-- collision-safe, but was never backfilled with the indices addresses
-- already used before the service switched to reading from it - confirmed
-- empty (0 rows) via a live production check tonight. Every reservation
-- lookup since has computed "max index already reserved" against an
-- effectively-empty table, defaulting new users back to index 0 in
-- whichever address group they touch first - a real address collision
-- with whichever existing user already sits at index 0 there, confirmed
-- live: a freshly created test user requesting a first-ever TRC20 address
-- got back the exact same address (TNrYjqhtgzJxThygwhvsGBm4cDQ3ogWbEM) as
-- an existing real user's TRX/USDT-TRC20 address.
--
-- address_group here mirrors CHAIN_CONFIGS in
-- apps/api/src/crypto-addresses/chain-config.ts exactly: every EVM chain
-- (ERC20/BEP20/Polygon/Avalanche/Celo/Flare/Fantom/Cronos/Ethereum
-- Classic/Kaia/XDC Network/Arbitrum/Optimism/Base) shares one address
-- group ('evm-shared'), since they all derive the identical address from
-- the same master xpub at a given index; every other network
-- (Bitcoin/Litecoin/Dogecoin/TRC20) is its own group. Getting this mapping
-- wrong here would just reintroduce the same class of bug via bad data
-- instead of missing data.
--
-- Bare ON CONFLICT DO NOTHING (no target list): safe against BOTH of the
-- table's constraints - the (user_id, address_group) primary key (a user
-- already reserved this group, e.g. via EVM address reuse producing
-- several user_crypto_addresses rows at the same index) and the
-- (address_group, derivation_index) unique constraint (would only fire
-- for a genuine historical cross-user collision at the same index in the
-- same group - none exist in current live data, verified separately, but
-- this must not raise instead of skip if one somehow does).
insert into public.user_derivation_index_reservations
  (user_id, address_group, derivation_index)
select distinct
  uca.user_id,
  case uca.network
    when 'ERC20' then 'evm-shared'
    when 'BEP20' then 'evm-shared'
    when 'Polygon' then 'evm-shared'
    when 'Avalanche' then 'evm-shared'
    when 'Celo' then 'evm-shared'
    when 'Flare' then 'evm-shared'
    when 'Fantom' then 'evm-shared'
    when 'Cronos' then 'evm-shared'
    when 'Ethereum Classic' then 'evm-shared'
    when 'Kaia' then 'evm-shared'
    when 'XDC Network' then 'evm-shared'
    when 'Arbitrum' then 'evm-shared'
    when 'Optimism' then 'evm-shared'
    when 'Base' then 'evm-shared'
    else uca.network
  end as address_group,
  uca.derivation_index
from public.user_crypto_addresses uca
where uca.derivation_index is not null
on conflict do nothing;
