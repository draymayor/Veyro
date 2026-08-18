# Veyro — Architecture

## Stack Summary

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js + TypeScript + Tailwind + shadcn/ui | Hosted on Vercel. SSR used for public/SEO pages (gift card brand pages, `/sell-crypto`, `/rates`). |
| Backend | NestJS (TypeScript) | Hosted on GCP Cloud Run. Same cloud as Monance — no new infra account. Autoscale-to-zero keeps early costs low. |
| Database / Auth / Storage | Supabase (Postgres) | Ledger, rate tables, trades, and file storage (card images, deposit proof screenshots) all live here. |
| Crypto price feed | Reused from Monance | CoinGecko REST + Binance WebSocket — no new integration. |
| Rate source (gift cards) | Manual (V1) → Prestmit (pending) | Pluggable rate-source design so this swaps in later without touching frontend or schema. |
| Email | Resend | Matches transactional templates in `email-templates.md`. |

## High-Level System Diagram

```
                    ┌─────────────────────┐
                    │   Next.js (Vercel)   │
                    │  Public + App Pages   │
                    └──────────┬───────────┘
                               │ REST/HTTPS
                    ┌──────────▼───────────┐
                    │  NestJS (GCP Cloud    │
                    │  Run) — API + Admin   │
                    └──────────┬───────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼────────┐   ┌─────────▼─────────┐   ┌─────────▼─────────┐
│ Supabase        │   │ Monance Price Feed │   │ Resend (email)     │
│ Postgres/Auth/  │   │ (CoinGecko +       │   │                    │
│ Storage         │   │ Binance WS, reused)│   │                    │
└─────────────────┘   └────────────────────┘   └────────────────────┘
```

## Why This Stack (Veyro-specific reasoning)

- **Next.js on Vercel:** Public pages (`/gift-cards`, `/sell-crypto`, `/rates`, brand-specific pages) need to be indexable for organic/SEO traffic — a core acquisition channel for a consumer resale platform. SSR handles this natively.
- **NestJS on Cloud Run, not pure serverless functions:** Even without full crypto custody, Veyro still needs persistent-enough processes for: admin review workflows, wallet ledger consistency, and eventually webhook handling once Prestmit's live API is connected. Cloud Run gives a real long-lived process model while still scaling to zero when idle, avoiding a fixed VM cost pre-launch.
- **Supabase Postgres:** The wallet ledger and multi-dimensional rate table (asset → country/network → type → denomination → rate) are fundamentally relational, and money-movement logic needs real transactional guarantees — this is not a NoSQL-appropriate dataset.
- **No payment gateway (Paystack/Flutterwave) in V1:** Payouts are manual by design (see `admin-guide.md`), so no automated disbursement API is part of this architecture yet. This significantly simplifies V1 backend scope — revisit in Phase 2 per `roadmap.md`.
- **No KYC provider in V1:** Manual admin review substitutes for automated identity verification. No KYC integration exists in this architecture until Phase 2.
- **No crypto custody infrastructure:** Because Veyro uses static published deposit addresses (not per-user generated wallets), there's no HD wallet derivation, no multi-chain custody service, and no associated key-management security surface in V1 — a deliberate simplification versus Monance's model.

## Backend Module Structure (NestJS)

```
src/
├── auth/              # Supabase Auth integration, session handling
├── users/             # Profile, country/currency, settings
├── trades/            # Trade lifecycle (gift card + crypto), state machine
├── rates/             # Rate table CRUD, rate snapshot logic
├── wallet/             # Ledger, balance derivation, withdrawal requests
├── referrals/         # Referral tracking, bonus logic
├── leaderboard/       # Aggregated trade/referral rankings
├── admin/             # Trade review, rate management, user management
├── notifications/     # Email trigger integration (Resend)
└── crypto-price/      # Thin wrapper around Monance's existing price feed
```

## Key Architectural Rules (from product-rules.md, reflected here)

- Wallet balance is never directly mutated — all changes flow through `wallet_transactions` ledger entries, created only on trade Approval or Withdrawal events.
- Rate snapshots are immutable once a trade is submitted — the `rates` table can change freely, but a trade always references its own locked `rate_id`/value pair, not a live lookup.
- Crypto trades carry an extra pre-review state (`Awaiting Deposit Confirmation`) not present in the gift card flow — the trade state machine must branch by asset type.

## Deployment Split

- Frontend deploys independently on Vercel (git push → preview/production).
- Backend deploys independently to GCP Cloud Run (see `deployment.md` for pipeline detail).
- Supabase is a managed service — no deployment step, only migrations (see `supabase-setup.md`).
