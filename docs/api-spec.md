# Veyro — API Spec

NestJS backend on GCP Cloud Run. All endpoints prefixed `/api/v1`. Auth via Supabase JWT (bearer token), verified server-side. Admin endpoints additionally require admin role check.

## Auth & Users

```
POST   /auth/signup                 -- delegates to Supabase Auth, then creates profile row
POST   /auth/login                  -- delegates to Supabase Auth
POST   /auth/forgot-password
GET    /users/me                    -- profile, country, currency, kyc_status
PATCH  /users/me                    -- update profile, country, notification prefs
GET    /users/me/settings
PATCH  /users/me/settings
```

## Gift Card Catalog (public)

```
GET    /gift-cards                          -- list active brands
GET    /gift-cards/:brandId/rates           -- rates by country/type/denomination for a brand
```

## Crypto Catalog (public)

```
GET    /crypto/assets                       -- list active crypto assets + networks + deposit addresses
GET    /crypto/rates                        -- current prices (proxied from Monance's price feed)
```

## Rates (public, general)

```
GET    /rates                               -- combined public rates listing (gift card + crypto) for the /rates page
```

## Sell Flow — Gift Card

```
POST   /trades/gift-card/quote              -- input: brand, country, type, amount → returns rate + quoted payout (no trade created yet)
POST   /trades/gift-card                    -- create trade: locks rate, accepts code/PIN or image references, status = 'submitted'
POST   /trades/:tradeId/files                -- upload card image / receipt (multipart, stored in Supabase Storage)
```

## Sell Flow — Crypto

```
POST   /trades/crypto/quote                 -- input: asset, network, amount → returns rate + quoted payout
POST   /trades/crypto                       -- create trade: locks rate, status = 'awaiting_deposit_confirmation', returns deposit address
POST   /trades/:tradeId/deposit-proof        -- submit tx hash + proof screenshot, status -> 'under_review'
```

## Trades (shared, authenticated user)

```
GET    /trades                              -- user's trade history, filterable by status/asset_type
GET    /trades/:tradeId                     -- single trade detail
```

## Wallet

```
GET    /wallet                              -- balance + currency
GET    /wallet/transactions                 -- ledger history (paginated)
```

## Withdrawals

```
POST   /withdrawals                         -- request withdrawal: method + amount + method-specific details
GET    /withdrawals                         -- user's withdrawal history
GET    /withdrawals/:id
```

## Referrals

```
GET    /referrals                           -- referral code, link, list of referred users, earnings
```

## Leaderboard

```
GET    /leaderboard                         -- current period rankings (trade volume, referral volume)
```

## Admin — Trade Review

```
GET    /admin/trades                        -- queue, filterable by status/asset_type
GET    /admin/trades/:tradeId                -- full detail incl. restricted fields (code/PIN, tx hash, files)
POST   /admin/trades/:tradeId/approve         -- triggers wallet credit via ledger, status -> 'approved'
POST   /admin/trades/:tradeId/reject          -- requires reason, status -> 'rejected'
```

## Admin — Rate Management

```
GET    /admin/gift-card-rates
POST   /admin/gift-card-rates
PATCH  /admin/gift-card-rates/:id
GET    /admin/crypto-assets
POST   /admin/crypto-assets
PATCH  /admin/crypto-assets/:id             -- includes updating published deposit address
```

## Admin — Withdrawals / Payouts (manual processing)

```
GET    /admin/withdrawals                   -- queue, filterable by status/method
POST   /admin/withdrawals/:id/mark-paid      -- requires transaction_reference note, status -> 'paid'
```

## Admin — User Management

```
GET    /admin/users
GET    /admin/users/:id
PATCH  /admin/users/:id/status              -- active/restricted/banned
```

## Admin — Dashboard

```
GET    /admin/dashboard/metrics             -- total users, today's trades, pending trades, volume, liabilities, pending withdrawals
```

## Notes

- All trade status transitions (`approve`, `reject`, deposit confirmation) happen server-side only — no client-writable status field, matching the RLS policy in `supabase-setup.md`.
- Quote endpoints (`/trades/*/quote`) do not create a trade record — they exist purely to show the rate before submission, per the product rule that users see the rate before committing.
- File upload endpoints return signed URLs for display, never public bucket URLs.
- Rate lookups for crypto proxy through the Monance price feed integration rather than duplicating a price source.
