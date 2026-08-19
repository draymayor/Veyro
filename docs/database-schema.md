# Veyro — Database Schema

Postgres via Supabase. Core principle throughout: **wallet balance is derived from an immutable ledger, never stored as a directly-editable column**, and **trades reference locked rate snapshots, never live rate lookups**.

## Core Tables

### `users` (extends Supabase `auth.users`)
```
id                uuid (PK, = auth.users.id)
country           text
currency          text            -- derived from country at signup
kyc_status        text            -- 'not_started' | 'manual_reviewed' (no automated provider in V1)
account_status    text            -- 'active' | 'restricted' | 'banned'
referral_code     text unique
referred_by       uuid (FK -> users.id, nullable)
email_verified_at timestamptz (nullable)  -- set once OTP verification completes (email/password signups); Google OAuth users are pre-verified by Google
created_at        timestamptz
```

**`handle_new_user` trigger:** fires `AFTER INSERT ON auth.users`, automatically creates the matching `public.users` row (with a generated `referral_code`, and `country`/`currency` copied from the signup form's metadata passed to Supabase Auth's signUp call) the moment Supabase Auth creates an account. This was written into an early migration but never actually deployed to the live project until a signup bug surfaced it — and even once deployed, an initial version missed copying country/currency (violating rule 13 below), fixed in a follow-up migration. Always verify migration files match what's actually applied to the live database, don't assume the file existing locally means it ran, and don't assume "deployed" means "complete," test the actual resulting data.

### `gift_card_brands`
```
id                uuid (PK)
name              text            -- e.g. 'Amazon'
is_active         boolean
created_at        timestamptz
```

### `gift_card_rates`
```
id                uuid (PK)
brand_id          uuid (FK -> gift_card_brands.id)
country           text
card_type         text            -- 'physical' | 'e-code'
min_denomination  numeric
max_denomination  numeric
rate              numeric         -- payout rate per unit face value
currency          text
is_active         boolean
effective_from    timestamptz
created_at        timestamptz
```

### `crypto_assets`
```
id                uuid (PK)
symbol            text            -- e.g. 'USDT'
network           text            -- e.g. 'TRC20', 'ERC20' — never assume interchangeable
deposit_address    text           -- Veyro's static published address for this asset/network
is_active         boolean
```

### `trades`
Single table for both gift card and crypto trades, discriminated by `asset_type`.
```
id                    uuid (PK)
user_id               uuid (FK -> users.id)
asset_type            text        -- 'gift_card' | 'crypto'
status                text        -- 'awaiting_deposit_confirmation' (crypto only) |
                                   -- 'submitted' | 'under_review' | 'approved' | 'rejected' |
                                   -- 'paid' | 'disputed' | 'cancelled'
rejection_reason      text (nullable)

-- Rate snapshot (immutable once set)
rate_id               uuid        -- FK to gift_card_rates.id OR a crypto rate snapshot source
rate_value             numeric
asset_amount           numeric
quoted_payout          numeric
currency               text

-- Gift card specific (nullable if asset_type = crypto)
gift_card_brand_id     uuid (FK -> gift_card_brands.id, nullable)
card_country            text (nullable)
card_type                text (nullable)
card_code                text (nullable, access-restricted)
card_pin                 text (nullable, access-restricted)

-- Crypto specific (nullable if asset_type = gift_card)
crypto_asset_id         uuid (FK -> crypto_assets.id, nullable)
tx_hash                  text (nullable)

created_at              timestamptz
updated_at              timestamptz
reviewed_by             uuid (FK -> users.id, nullable)  -- admin who reviewed
reviewed_at             timestamptz (nullable)
```

### `trade_files`
```
id                uuid (PK)
trade_id          uuid (FK -> trades.id)
file_type         text        -- 'card_image' | 'receipt' | 'deposit_proof_screenshot'
storage_path      text        -- Supabase Storage path
created_at        timestamptz
```

### `wallets`
```
id                uuid (PK)
user_id           uuid (FK -> users.id)
currency          text        -- user's primary currency
balance           numeric     -- CACHED/derived value, reconciled from wallet_transactions, never edited directly
updated_at        timestamptz
```

### `wallet_transactions` (the ledger — source of truth)
```
id                uuid (PK)
wallet_id         uuid (FK -> wallets.id)
trade_id          uuid (FK -> trades.id, nullable)      -- populated for trade-credit entries
withdrawal_id     uuid (FK -> withdrawals.id, nullable) -- populated for withdrawal-debit entries
type              text        -- 'credit' | 'debit'
amount            numeric
balance_after     numeric     -- running balance snapshot for audit
created_at        timestamptz
```

### `withdrawals`
```
id                    uuid (PK)
user_id               uuid (FK -> users.id)
amount                numeric
method                text        -- 'bank_transfer' | 'paypal' | 'crypto'
status                text        -- 'requested' | 'processing' | 'paid' | 'failed'
-- Method-specific payout details (manual processing in V1, no gateway)
bank_details          jsonb (nullable)   -- varies per country, stored flexibly
paypal_email          text (nullable)
crypto_asset_id       uuid (FK -> crypto_assets.id, nullable)
crypto_payout_address text (nullable)
transaction_reference text (nullable)    -- filled in manually by admin on completion
created_at            timestamptz
processed_at          timestamptz (nullable)
processed_by          uuid (FK -> users.id, nullable)  -- admin who processed
```

### `referrals`
```
id                uuid (PK)
referrer_id       uuid (FK -> users.id)
referred_id       uuid (FK -> users.id)
bonus_amount      numeric (nullable)
bonus_paid_at     timestamptz (nullable)
created_at        timestamptz
```

### `leaderboard_entries`
Materialized/aggregated view rather than a manually written table — computed periodically (e.g. weekly) from `trades` and `referrals`. Not detailed further here; implementation detail for `api-spec.md` / backend.

### `email_otps`
```
id                uuid (PK)
user_id           uuid (FK -> users.id, nullable — set once account exists)
email             text
code_hash         text        -- hashed, never store raw OTP code
purpose           text        -- 'signup_verification' | 'password_reset'
attempts          int         -- default 0, track failed verify attempts
expires_at        timestamptz
verified_at       timestamptz (nullable)
created_at        timestamptz
```
No client access at all (RLS enabled, zero policies) — verification happens through the backend (service role) only. `purpose` distinguishes a signup verification code from a password reset code so one can never be used to satisfy the other.

### `admin_actions` (audit log)
```
id                uuid (PK)
admin_id          uuid (FK -> users.id)
action_type       text        -- 'trade_approved' | 'trade_rejected' | 'rate_changed' | 'withdrawal_processed' | etc.
target_id         uuid        -- trade_id, rate_id, withdrawal_id, etc.
notes             text (nullable)
created_at        timestamptz
```

## Key Constraints & Notes

- `trades.rate_value`, `asset_amount`, `quoted_payout` are copied at submission time — never recalculated from `gift_card_rates` after the fact.
- `wallet_transactions` is append-only. No update/delete on existing rows — corrections happen via new offsetting entries, never edits.
- `crypto_assets.deposit_address` is static per asset/network in V1 (no per-user address generation) — this table is small and admin-managed.
- Row-Level Security (Supabase): users can only read their own `trades`, `wallets`, `wallet_transactions`, `withdrawals`; admin role bypasses via service role or dedicated admin policies.
