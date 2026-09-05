-- Second webhook provider alongside Tatum (see 20260904130630 for the
-- original tatum_subscription_id + crypto_deposit_events design). Tatum
-- stays exactly as-is for TRON. Alchemy's Address Activity webhook now
-- covers EVM chains instead, chosen per-address by whichever provider
-- that address's network is configured to use (config-driven, not a
-- schema-level distinction - see apps/api CHAIN_CONFIGS). Only 5 of the
-- 14 EVM chains are actually activated at launch (Ethereum, Polygon,
-- BSC, Arbitrum, Base - picked without real volume data yet, since
-- Alchemy's free tier is also a hard 5-webhooks-total cap and each
-- Address Activity webhook covers exactly one network, never multiple).
-- The remaining EVM chains fall back to the existing admin manual-check
-- path, same as BTC/LTC/DOGE always have, until a webhook slot is freed
-- or the account is upgraded - activating one is a config change, not a
-- migration.

-- Non-null = this address has a live Alchemy Address Activity webhook
-- watching it (webhook-covered) - specifically, holds that chain's
-- Alchemy webhook id, so a stuck/failed registration or a future
-- rotation/removal can find its way back to the right webhook. Null =
-- falls back to the existing admin manual-check path exactly as before,
-- identical posture to tatum_subscription_id. Set once, synchronously,
-- right after the address is created and registration succeeds -
-- registration failure leaves this null and the address simply falls
-- back to manual confirmation, it does not fail address creation.
alter table public.user_crypto_addresses
  add column alchemy_webhook_id text;
