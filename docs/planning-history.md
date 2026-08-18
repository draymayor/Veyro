# Veyro — Planning History

A chronological log of key decisions made during planning. Reference this to understand *why* a decision was made, not just what it is — later docs (architecture, schema, etc.) reflect the end state; this doc preserves the reasoning trail.

## Business Model
- Decided Veyro is a direct-buy model (users sell to Veyro, Veyro liquidates) — not a peer-to-peer marketplace or escrow platform. This shapes accounting (ledger-based), liquidity ownership, and fraud responsibility.

## Rate Sourcing
- Investigated multiple gift card rate/liquidation APIs: Reloadly (signup blocked from Nigeria — rejected, including a VPN workaround which was assessed and rejected due to KYB exposure and ToS risk), Cardtonic (waitlist-only, not usable yet), Sogo (developer API publicly listed as "in the works," not available), Giftbit (confirmed wrong category — issuing/rewards API, not liquidation/rate data).
- Prestmit confirmed as the viable option — Nigeria-native, real documented sandbox/application process. Application submitted, pending approval.
- Decision: V1 launches with manually-set "Platform Rates," structured so the rate source is pluggable — live API can be swapped in later without rebuilding frontend or schema.
- A ChatGPT-sourced document referencing a detailed Prestmit Partner API (with a specific endpoint and documentation titled "How To Make Money Using Prestmit API") was flagged as unverified — those specifics should be confirmed directly in Prestmit's docs once sandbox access is granted, not assumed from secondhand summary.

## Crypto Scope
- Initially recommended deferring crypto to a later phase (to avoid overlap with Monance and reduce V1 compliance/build scope).
- Decision reversed: crypto included in V1 from the start, to avoid building the wallet/verification/payout pipeline twice.
- Custody model simplified from Monance's per-user HD wallet approach: Veyro will publish static deposit addresses; users send crypto and submit proof of deposit; admin manually confirms before payout (P2P-style, no per-user address generation, no custody infrastructure).
- Crypto price feed: reusing Monance's existing CoinGecko REST + Binance WebSocket integration rather than sourcing a new one.

## Branding
- App named Veyro.
- Deliberately chose a light theme, distinct from Monance's dark Binance-style theme, to read as a separate, distinct product.
- Avoided green as primary accent (overused in fintech/crypto, and CashApp/most competitors already use it) — landed on terracotta/coral (`#E8674A`) with an off-white background, deep charcoal-navy text, muted sage for success states, and Space Grotesk headers paired with Inter/General Sans body text.

## Tech Stack
- Evaluated fresh for Veyro's actual requirements rather than defaulting to prior project stacks.
- Landed on: Next.js + Tailwind + shadcn/ui (Vercel) for frontend, NestJS on GCP Cloud Run for backend, Supabase for DB/Auth/Storage — matching Monance's backend hosting (GCP) to avoid new infra accounts.
- Originally considered a crypto payment processor (Coinbase Commerce/BitPay) to avoid building custody — made moot once the manual deposit-address model was chosen instead.
- Payment gateway integration (Paystack/Flutterwave) considered for automated payouts, then explicitly ruled out for V1 — payouts (bank transfer, PayPal, crypto) are handled manually by admin instead.
- Paid KYC (Sumsub) considered, then deferred to Phase 2 — V1 relies on manual admin judgment per trade, functioning as the fraud check given every trade is reviewed anyway.

## Public Site Structure
- Original plan (from earlier ChatGPT planning): Home, Gift Cards, Rates, How It Works, About, FAQ, Contact, Legal — plus a dedicated public Crypto page added later for separate SEO/trust content from gift cards.
- Revised and finalized: nav simplified to a single card-tile dropdown menu with Gift Cards, Crypto, FAQ, Contact Us, plus Log In / Get Started. How It Works dropped (homepage already covers it), Rates dropped as a standalone page (folded into Gift Cards and Crypto pages instead), About dropped. Legal pages remain, footer-only.
- Along the way, a dedicated public Crypto page was initially left out of nav planning despite being decided on earlier — caught and corrected.
- Authenticated app: Dashboard, Sell (shared flow with Gift Card/Crypto toggle), Transactions, Wallet, Referrals, Leaderboard, Settings, Support.
