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
is_admin          boolean         -- default false, gates admin routes/endpoints, checked server-side only, no client write access, ogunnubimayowa@gmail.com set true directly
profile_image_url text (nullable)  -- set once user uploads a real photo via Profile page; while null, UI generates a deterministic DiceBear default avatar from the user's id, never stored
display_name     text (nullable)  -- editable on Profile page, added after initial build flagged this field was missing rather than silently inventing it
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
deposit_address    text           -- Veyro's fallback/admin-provided address for this asset/network, used until real per-user Tatum addresses are live (see user_crypto_addresses)
deposit_memo      text (nullable) -- required for shared-address chains (XRP destination tag, XLM memo), null otherwise
network_code      text            -- internal chain identifier matching CHAIN_CONFIGS keys in chain-config.ts (e.g. 'ERC20', 'TRC20', 'Bitcoin'), resolved from the human-readable `network` display string, code should always look this up rather than parsing/matching on `network` directly
margin_percentage numeric         -- default 3.0, admin-adjustable per asset; applied below live CoinGecko price when computing user payout
is_active         boolean
```
Originally seeded with 20 real fallback addresses across BTC, ETH, USDT×2 networks, BNB, XRP, DOGE, POL×2 networks, AVAX, CELO, FLR, ETC, KAIA, XDC, LTC, BCH, XLM, USDC, TRX. Since revised: XRP, XLM, BCH, and USDC-TRC20 were all deactivated (is_active = false, not deleted) after real verification found each had a genuinely different/broken trust model or, for USDC-TRC20, a defunct contract (Circle discontinued USDC on TRON in 2024/2025, confirmed against Circle's own announcement and Tronscan). Per the standing rule established during this work: any coin/network creating friction or a materially different trust model gets dropped rather than worked around, V2 can revisit properly. Separately, 9 new rows were added for ETH/USDT/USDC × Arbitrum One/Optimism/Base (all reusing the same EVM fallback address, correct since these are all EVM-compatible), closing a real gap where these were selectable in the UI but had no crypto_assets row at all, causing a 400 error. FTM and CRO were considered but never seeded, no real address was available for either. EVM-family coins (ETH, POL, CELO, FLR, ETC, KAIA, USDC, USDT's ERC20 leg, and the 9 new L2 rows) correctly share the same fallback address, per EVM's shared address-format property, not a data-entry error, each has its own correct `network_code` (e.g. 'Arbitrum', 'Optimism', 'Base'), never defaulted to 'ERC20'. `user_crypto_addresses.network` stores `network_code`, not the display string, for consistency with what the sweeper reads.

**Real per-user address generation status:** 5 real master seeds (BTC, LTC, DOGE, EVM-shared, TRON) exist in Secret Manager and have been used to derive and verify real xpubs (TATUM_BTC_XPUB, TATUM_LTC_XPUB, TATUM_DOGE_XPUB, TATUM_EVM_XPUB, TATUM_TRON_XPUB, all populated in apps/api/.env). Derivation paths for EVM (m/44'/60'/0'/0/{i}) and TRON (m/44'/195'/0'/0/{i}) have been independently verified to match Tatum's own generated addresses (6/6 checks passed across 3 indices each). A permanent verification script lives at apps/sweeper/scripts/verify-derivation.js. `deposit_address` on this table is NOT used by the real per-user address flow (that reads only `is_active`/`network_code` and derives via Tatum), it's a separate legacy/admin-facing fallback field shown in Rate Management, never fabricated, but not load-bearing for the actual deposit-address-generation path.

**Crypto payout formula:** `payout = amount * (coingecko_usd_price * (1 - margin_percentage/100)) * usd_to_wallet_currency_fx_rate`. Live CoinGecko price and live FX rate are both fetched/cached server-side (CoinGecko: 60s cache; FX: 3-6hr cache since FX moves far slower), margin is the only manually-set value, kept in this table rather than requiring admin to update raw crypto rates by hand the way gift card rates work.

**FX rate source:** two providers configured for redundancy — freecurrencyapi.com (primary, 1,000 free requests/month) and CurrencyFreaks (fallback, used if the primary is unavailable or its quota is exhausted). Both keys live in apps/api's environment, never exposed to the frontend.

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
image_phash       text (nullable)  -- perceptual hash computed at upload for card_image files, used to flag near-duplicate re-uploads (fraud detection, per admin-guide.md); NOT machine learning, a deterministic similarity fingerprint compared against existing hashes within a distance threshold
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

### `crypto_wallets` / `crypto_wallet_transactions` (real held crypto balances, mirrors the fiat pattern above)
```
crypto_wallets:
id                uuid (PK)
user_id           uuid (FK -> users.id on delete cascade)
symbol            text        -- tracked per symbol only, NOT per network — once credited, a balance is fungible regardless of which network it arrived on (per product-rules.md rule 16)
balance           numeric     -- cached, reconciled from crypto_wallet_transactions, never edited directly, same principle as fiat wallets
created_at / updated_at

crypto_wallet_transactions:
id                    uuid (PK)
user_id               uuid (FK -> users.id on delete cascade)
symbol                text
type                  text    -- 'deposit' | 'sell_conversion_debit' | 'withdrawal' | 'admin_credit' | 'admin_debit'
amount                numeric
balance_after         numeric
related_trade_id      uuid (FK -> trades.id, nullable)      -- links a sell_conversion_debit to its trade record
related_withdrawal_id uuid (FK -> withdrawals.id, nullable)
created_at            timestamptz
```
No client write access on either table, backend (service role) only. This is a genuinely separate model from the earlier "crypto sold directly to Veyro" approach: depositing credits crypto_wallets (does NOT touch fiat wallets at all), selling is a later, separate, user-initiated action that debits crypto_wallets and credits wallets in one atomic conversion, withdrawing debits crypto_wallets directly without ever touching fiat. See context.md's Private App Structure and product-rules.md rules 6a/16 for the full corrected flow.

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
DB constraint `referrals_no_self_referral` (`referrer_id != referred_id`) blocks the trivial self-referral case at the database level, not just app logic. Multi-account abuse (same person referring their own second account) is a harder problem, not solved here, V1 has no device/IP fingerprinting for this, flag as a real gap not a solved one.

**Status derivation for the Referrals page:** `bonus_paid_at IS NULL` = pending (counts toward "Potential Earning"), `bonus_paid_at IS NOT NULL` = success (counts toward "Total Earned"), `bonus_amount` holds the paid amount. A referral row is created at signup (referred user completes account creation); `bonus_amount`/`bonus_paid_at` get set only when the referred user's first trade is approved (their first real deposit), at which point the referrer's wallet is credited via wallet_transactions. This trigger-on-first-deposit logic is new work, not yet built as of this note.

### `leaderboard_entries`
Materialized/aggregated view rather than a manually written table — computed periodically (e.g. weekly) from `trades` and `referrals`. Not detailed further here; implementation detail for `api-spec.md` / backend.

### `email_otps`
```
id                uuid (PK)
user_id           uuid (FK -> users.id on delete cascade, nullable — set once account exists)
email             text
code_hash         text        -- hashed, never store raw OTP code
purpose           text        -- 'signup_verification' | 'password_reset' | 'withdrawal_confirmation'
attempts          int         -- default 0, track failed verify attempts
expires_at        timestamptz
verified_at       timestamptz (nullable)
created_at        timestamptz
```
No client access at all (RLS enabled, zero policies) — verification happens through the backend (service role) only. `purpose` distinguishes a signup verification code from a password reset code from a withdrawal confirmation code so none can ever be used to satisfy another. Withdrawal confirmation codes are deliberately kept separate from TOTP backup/recovery codes (see product-rules.md): backup codes are for full account-recovery emergencies (rare, high-value), withdrawal codes are for routine per-withdrawal confirmation (frequent, single-use), conflating the two would force frequent exposure of an account-recovery secret.

### `notifications`
```
id                    uuid (PK)
user_id               uuid (FK -> users.id on delete cascade)
category              text        -- 'trades' | 'wallet' | 'referrals' | 'account'
title                 text
body                  text
related_trade_id      uuid (FK -> trades.id, nullable)
related_withdrawal_id uuid (FK -> withdrawals.id, nullable)
read_at               timestamptz (nullable)
created_at            timestamptz
```
Client can SELECT own rows and UPDATE own rows (to mark read), no client INSERT/DELETE, notifications are only ever created by the backend (service role) in response to real events: trade status changes, withdrawal status changes, referral earnings, account/security events.

### `platform_settings`
```
key           text (PK)   -- e.g. 'referral_bonus_usd'
value         text
updated_at    timestamptz
updated_by    uuid (FK -> users.id, nullable)
```
Public read (needed for display, e.g. the referral card's "$X per referral" text), admin-only write via backend service role, no client write policy. Seeded with `referral_bonus_usd = 10`. General-purpose store for admin-tunable global values, not per-asset/per-trade settings (those stay in their own tables, e.g. `crypto_assets.margin_percentage`).

### `backup_codes`
```
id            uuid (PK)
user_id       uuid (FK -> users.id on delete cascade)
code_hash     text        -- hashed, never store raw code
used_at       timestamptz (nullable)
created_at    timestamptz
```
Generated once when a user enrolls TOTP (per product-rules.md), since Supabase Auth's MFA does not provide account-recovery codes itself. Scoped ONLY to account recovery (user has lost access to their authenticator app entirely, at login), each code is single-use, marked `used_at` on consumption. No client access, backend service role only. NOT used for routine withdrawal confirmation, see the separate withdrawal PIN below, deliberately decoupled since recovery is rare/emergency while withdrawals are frequent/routine.

**Withdrawal PIN (on `users`):**
```
withdrawal_pin_hash            text (nullable)  -- hashed 4-digit PIN, never plaintext
withdrawal_pin_set_at          timestamptz (nullable)
withdrawal_pin_failed_attempts int              -- default 0, resets on success
withdrawal_pin_locked_until    timestamptz (nullable)
```
A separate, user-set 4-digit PIN, distinct from TOTP/backup codes, required before every withdrawal executes, mandatory for all users regardless of TOTP enrollment status. Locks after repeated failed attempts (per product-rules.md rule 18a), reset via the existing `email_otps` `withdrawal_confirmation` purpose (repurposed as the PIN-reset verification path, not a per-withdrawal fallback).

### `support_messages` + `support_threads`
```
support_threads:
id            uuid (PK)
user_id       uuid (FK -> users.id on delete cascade, unique — one thread per user)
category      text        -- topic selected on first contact
status        text        -- 'open' | 'resolved'
created_at    timestamptz
updated_at    timestamptz

support_messages:
id            uuid (PK)
user_id       uuid (FK -> users.id on delete cascade)
sender        text        -- 'user' | 'admin'
body          text
read_at       timestamptz (nullable)
created_at    timestamptz
```
One continuous thread per user (no separate multi-ticket system in V1), but framed as a single ticket with a category and Open/Resolved status. First contact: user picks a category and sends a message, which opens the thread and sends the first message in one step. A trigger auto-reopens a resolved thread the instant the user sends a new message (not left to client trust). Client can INSERT only their own 'user'-sender messages, never 'admin'-sender ones (backend service role only for admin replies). Realtime enabled on support_messages for live chat updates, no polling.

### `user_crypto_addresses`
```
id                 uuid (PK)
user_id            uuid (FK -> users.id on delete cascade)
symbol             text        -- e.g. 'BTC', 'USDT'
network            text        -- e.g. 'TRC20', 'ERC20' — never assume interchangeable
address            text        -- deterministically derived from the master xpub for this chain + derivation_index
derivation_index   integer     -- the HD derivation index used, needed to regenerate/verify the address if ever required
created_at         timestamptz
```
Unique per (user_id, symbol, network). No client write access at all, addresses are only ever generated by the backend (service role) via Tatum's generateAddressFromXpub, deterministic from the master xpub, never client-controlled or random. The master seed/mnemonic itself is NOT stored in this table or anywhere in the database, it lives only in Secret Manager, this table only stores the derived public addresses, which are safe to store openly.

**Real deterministic bug found and fixed (found via manual real-account testing, not caught by earlier per-symbol test accounts):** an earlier unique index on `(network, derivation_index)` was meant to enforce cross-user safety (no two users ever share a derivation index within one address group, which would mean generating the same private key twice), but being scoped without `user_id`, it also blocked the SAME user's second symbol sharing the SAME network at the SAME index, which is expected by design (ETH/USDT/POL/USDC legitimately share one ERC20 address). This made every second-symbol-on-a-shared-network deposit fail deterministically, 100% of the time, for any real account that had used more than one symbol on a shared network. Fixed by moving index allocation to its own `user_derivation_index_reservations` table (below), which correctly separates "one user's claim on an index within an address group" from the many symbol/network rows that legitimately reuse it.

### `user_derivation_index_reservations`
```
user_id            uuid (FK -> users.id on delete cascade)
address_group      text        -- e.g. 'EVM', matches CHAIN_CONFIGS grouping
derivation_index   integer
created_at         timestamptz
PRIMARY KEY (user_id, address_group)
UNIQUE (address_group, derivation_index)   -- the real cross-user safety invariant
```
No client access, service role only. One row per user per address group, `createDerivedAddress` reserves into this table (get-or-allocate, atomic via the unique constraint) rather than relying on `user_crypto_addresses`' per-row uniqueness for index allocation. Doesn't affect the sweeper, which only reads `derivation_index` off `user_crypto_addresses` rows directly.

### `sweep_log`
```
id                uuid (PK)
symbol            text
network           text
from_address      text        -- the individual user deposit address swept
to_address        text        -- the chain's central consolidation wallet
amount            numeric (nullable)
tx_hash           text (nullable)
status            text        -- 'success' | 'failed' | 'skipped_below_threshold'
failure_reason    text (nullable)
created_at        timestamptz
```
No client access (read or write) at all. Written by the sweeper job using its own dedicated service account, never the main API's. Admin views this via a backend endpoint (service role), not a direct client query, so viewing sweep history never requires granting anyone sweeper-service-account-level access.

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
