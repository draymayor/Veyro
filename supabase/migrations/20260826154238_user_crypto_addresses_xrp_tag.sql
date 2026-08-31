-- XRP does not get a unique on-chain address per user like the other 6
-- chains: freezing a reserve for every generated address is prohibitively
-- expensive on the XRP Ledger, so Tatum's documented pattern is one shared
-- platform address with a destination_tag distinguishing each user's
-- deposits (docs/planning-history.md). destination_tag carries that value
-- for XRP rows; NULL for every chain that gets its own unique derived
-- address (BTC, ETH, BSC, TRON, SOL, DOGE).
alter table public.user_crypto_addresses
  add column destination_tag text;

-- derivation_index only applies to xpub-derived chains. XRP rows reuse the
-- shared platform address, so there is no derivation index to record.
alter table public.user_crypto_addresses
  alter column derivation_index drop not null;

-- One row per user per asset/network (docs/database-schema.md), enforced
-- at the DB level so a race between two concurrent "first visit" requests
-- can't insert two different addresses for the same user/asset/network.
alter table public.user_crypto_addresses
  add constraint user_crypto_addresses_user_symbol_network_key
  unique (user_id, symbol, network);

-- No two users may share a destination tag on the same shared-address
-- chain (XRP today, any future shared-tag chain later) - this is what
-- actually distinguishes their deposits, so a collision would misattribute
-- funds. Partial index: only applies where a tag is actually set.
create unique index user_crypto_addresses_destination_tag_unique
  on public.user_crypto_addresses (symbol, network, destination_tag)
  where destination_tag is not null;

-- No two users may reuse the same HD derivation index on the same chain -
-- that would derive the same on-chain address for both of them. Partial
-- index: only applies to xpub-derived rows.
create unique index user_crypto_addresses_network_derivation_index_unique
  on public.user_crypto_addresses (network, derivation_index)
  where derivation_index is not null;
