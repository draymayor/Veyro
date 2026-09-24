-- Welcome bonus was designed to settle in USDT like every other bonus
-- program, but was actually crediting the user's fiat wallet (FX-converted
-- from a USD-labeled setting). This migration:
--   1. Renames the platform_settings key so it's read as a literal USDT
--      amount going forward, not a USD figure to be converted.
--   2. Adds a crypto_wallet_transaction_id linkage on welcome_bonus_claims
--      for the USDT credit (replaces wallet_transaction_id, which pointed
--      at the fiat ledger, for all new grants).
--   3. Widens the crypto ledger's type check to allow a 'bonus_credit' row.
-- wallet_transaction_id is left in place (nullable) purely as a historical/
-- audit trail of the pre-fix fiat credits this migration reconciles below.

UPDATE platform_settings
SET key = 'welcome_bonus_usdt'
WHERE key = 'welcome_bonus_usd';

ALTER TABLE welcome_bonus_claims
  ADD COLUMN crypto_wallet_transaction_id uuid REFERENCES crypto_wallet_transactions(id);

ALTER TABLE crypto_wallet_transactions
  DROP CONSTRAINT crypto_wallet_transactions_type_check,
  ADD CONSTRAINT crypto_wallet_transactions_type_check
    CHECK (type = ANY (ARRAY[
      'deposit'::text,
      'sell_conversion_debit'::text,
      'withdrawal'::text,
      'admin_credit'::text,
      'admin_debit'::text,
      'webhook_deposit'::text,
      'reorg_reversal'::text,
      'bonus_credit'::text
    ]));

-- Reconciliation: every welcome_bonus_claims row granted before this fix has
-- a wallet_transaction_id (fiat credit) but no crypto_wallet_transaction_id.
-- For each one: reverse the exact fiat amount that was credited (read off
-- the ledger row itself, not recomputed via FX, so it can't drift from what
-- actually happened), then credit the claim's bonus_amount_usd as real USDT
-- to the user's crypto wallet, and relink the claim. Written as a loop over
-- the general condition, not any specific row id, so it's safe to rerun
-- (a claim already reconciled has crypto_wallet_transaction_id set and is
-- skipped) and self-contained if more such rows ever turn up.
DO $$
DECLARE
  claim RECORD;
  fiat_balance numeric;
  new_fiat_balance numeric;
  crypto_balance numeric;
  new_crypto_balance numeric;
  crypto_credit_id uuid;
BEGIN
  FOR claim IN
    SELECT wbc.id, wbc.user_id, wbc.bonus_amount_usd,
           wt.id AS fiat_wallet_transaction_id, wt.amount AS fiat_amount,
           wt.wallet_id AS fiat_wallet_id
    FROM welcome_bonus_claims wbc
    JOIN wallet_transactions wt ON wt.id = wbc.wallet_transaction_id
    WHERE wbc.wallet_transaction_id IS NOT NULL
      AND wbc.crypto_wallet_transaction_id IS NULL
  LOOP
    -- 1. Reverse the fiat credit.
    SELECT balance INTO fiat_balance FROM wallets WHERE id = claim.fiat_wallet_id;
    new_fiat_balance := fiat_balance - claim.fiat_amount;

    INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after)
    VALUES (claim.fiat_wallet_id, 'debit', claim.fiat_amount, new_fiat_balance);

    UPDATE wallets
    SET balance = new_fiat_balance, updated_at = now()
    WHERE id = claim.fiat_wallet_id;

    -- 2. Credit the real USDT crypto wallet instead.
    INSERT INTO crypto_wallets (user_id, symbol, balance)
    VALUES (claim.user_id, 'USDT', 0)
    ON CONFLICT (user_id, symbol) DO NOTHING;

    SELECT balance INTO crypto_balance
    FROM crypto_wallets
    WHERE user_id = claim.user_id AND symbol = 'USDT';
    new_crypto_balance := crypto_balance + claim.bonus_amount_usd;

    INSERT INTO crypto_wallet_transactions (user_id, symbol, type, amount, balance_after)
    VALUES (claim.user_id, 'USDT', 'bonus_credit', claim.bonus_amount_usd, new_crypto_balance)
    RETURNING id INTO crypto_credit_id;

    UPDATE crypto_wallets
    SET balance = new_crypto_balance, updated_at = now()
    WHERE user_id = claim.user_id AND symbol = 'USDT';

    -- 3. Relink the claim to the new USDT credit.
    UPDATE welcome_bonus_claims
    SET crypto_wallet_transaction_id = crypto_credit_id
    WHERE id = claim.id;
  END LOOP;
END $$;
