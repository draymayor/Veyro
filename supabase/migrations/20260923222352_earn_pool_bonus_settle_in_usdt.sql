-- Earn pool bonus has the same USD/USDT bug the Welcome bonus had
-- (20260923221146_welcome_bonus_settle_in_usdt.sql): platform_settings
-- stores the tier/pool amounts as USD-labeled figures that EarnService.claim
-- then FX-converts into the user's fiat wallet, only relabeling the display
-- as USDT. Unlike the Welcome bonus, no reconciliation is needed here - the
-- two existing earn_bonus_claims rows both predate this crediting code
-- entirely (traced: neither has a wallet_transaction_id, and the user's
-- full fiat ledger has no matching credit around either claim date) and
-- were never actually paid out.
--
-- required_deposit_usd is untouched - that's a real-dollar deposit-value
-- unlock threshold, unrelated to what currency the bonus itself settles in.

UPDATE platform_settings
SET key = 'earn_tier1_bonus_usdt'
WHERE key = 'earn_tier1_bonus_usd';

UPDATE platform_settings
SET key = 'earn_tier2_bonus_usdt'
WHERE key = 'earn_tier2_bonus_usd';

UPDATE platform_settings
SET key = 'earn_pool_total_usdt'
WHERE key = 'earn_pool_total_usd';

-- Linkage for the USDT credit going forward (replaces wallet_transaction_id,
-- which pointed at the fiat ledger, kept in place only as a historical
-- column - both existing rows have it null already, see above).
ALTER TABLE earn_bonus_claims
  ADD COLUMN crypto_wallet_transaction_id uuid REFERENCES crypto_wallet_transactions(id);

-- No crypto_wallet_transactions_type_check change needed - 'bonus_credit'
-- was already added for the Welcome bonus fix and covers this too.
