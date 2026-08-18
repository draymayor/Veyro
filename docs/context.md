# Veyro — Project Context

## What Veyro Is

Veyro is a web platform where users sell their gift cards and crypto directly to the platform (not a peer-to-peer marketplace). The user submits a card or crypto, sees a quoted rate up front, and — once verified — is paid instantly to their in-app wallet.

Model reference: similar in function to Cardtonic and Prestmit (gift cards), but built with its own brand, UX, and combined crypto support from V1.

## Business Model

**User has asset → selects it → sees quoted rate → submits (card code/image, or crypto) → platform verifies → wallet credited → user withdraws.**

The platform is the buyer/merchant, not an escrow intermediary. This means:
- Veyro owns liquidity risk (it must be able to liquidate/resell what it buys)
- Accounting is a ledger (wallet credits/debits), not just balances
- Fraud prevention is a first-class concern, not an add-on

## Two Asset Types (from V1)

1. **Gift cards** — physical or e-code, submitted by brand/country/type/denomination, rate varies by all four.
2. **Crypto** — sold directly to Veyro for fiat/wallet credit, alongside gift cards, same submit → verify → credit flow.

Decision note: crypto was folded into V1 (not deferred) to avoid building the wallet/payout/verification pipeline twice. Monance (a separate, standalone crypto exchange) is a different product — no shared codebase or user base assumed between them.

## Users & Geography

- Global — any country user can sign up.
- Country is selected at signup, which determines the user's primary wallet currency.
- V1 wallet model: one primary currency per user, tied to their country. Multi-currency wallets (holding several currencies at once) are a post-V1 consideration.

## Payout Methods (V1)

- Bank Transfer
- PayPal
- Crypto (asset + network + address — e.g. USDT-TRC20 vs USDT-ERC20 must be distinguished)

## Rate Sourcing (current status)

- No live market-rate API is connected yet.
- Prestmit (Nigeria-based gift card liquidation API) — application submitted, pending approval. This is the primary target for live gift card rates.
- Sogo — has a stated developer API for gift cards/crypto, but it is publicly listed as "in the works," not available for early access yet. Revisit later.
- Reloadly — signup blocked from Nigeria; not pursuing (VPN workaround assessed and rejected — KYB would surface region anyway, plus ToS risk).
- **V1 approach:** manually researched/set rates ("Platform Rates," not "Live Market Rates") stored in an admin-editable rate table, structured so the rate source is pluggable — swap in a live API later without rebuilding frontend or schema.

## Domain & Contact

- **Production domain:** veyro.best
- **Support email:** support@veyro.best

## Branding

- **Name:** Veyro
- **Theme:** Light (deliberately distinct from Monance's dark Binance-style theme)
- **Primary accent:** Terracotta/coral `#E8674A`
- **Background:** Off-white `#FAF7F2`
- **Text/ink:** Deep charcoal-navy `#1C1B29`
- **Secondary accent:** Muted sage `#8A9B7E` (success states)
- **Alert/error:** Muted brick red `#C24E3D`
- **Typography:** Space Grotesk (headers), Inter or General Sans (body/UI numbers)

## Public Site Structure

Finalized nav (flat, no dropdown): **Home, Gift Cards, Crypto, Contact Us**, plus **Log In** and **Get Started** as separate auth actions. FAQ dropped as its own page/nav item since FAQ content lives on the Gift Cards and Crypto pages.

- **Home** — full sectioned, motion-driven homepage (hero, how-it-works, stats, rate showcase preview, value props, CTA, footer). Covers "how it works" content directly, so no separate page for it.
- **Gift Cards** — brand catalog + gift card rates shown inline on this page (no separate `/rates` page).
- **Crypto** — supported assets/networks + crypto rates shown inline on this page (added after initially being missed in early nav planning).
- **Contact Us**
- **Legal** (Terms, Privacy) — footer-only, not in main nav. No separate Gift Card Policy page for V1 (covered by Terms + the FAQ sections already on Gift Cards/Crypto pages, no per-brand policy divergence exists yet to justify it).
- **Auth** — Log In, Get Started (signup), Forgot Password, plus /verify-email (OTP, email/password signups only) and /select-country (Google OAuth signups only, one-time).

Explicitly dropped from the public site: standalone `/how-it-works` page, standalone `/rates` page, `/about` page, standalone FAQ page.

## Private (Authenticated) App Structure

Mobile-first app layout: bottom nav on mobile, full sidebar on desktop. Profile and notifications live as icons (top on mobile, side on desktop), not in the main nav.

- **Home** (not "Dashboard") — balance card (with Withdraw and Top Up buttons; Top Up opens a dropdown to Sell Crypto or Sell Gift Cards, routing to the respective flow), a section with Sell Crypto / Sell Gift Cards cards, and a rates section (table or tabs for crypto vs gift card rates).
- **Leaderboard** — first section/tab is Referrals (referral link/code, referral stats like deposit status and referral count, without exposing referred users' emails), second tab is the trading/referral leaderboard rankings.
- **Assets** (not "Wallet") — wallet balance flow at top (same pattern as Home's balance card), user's assets below that, transaction history below that.
- **Settings** — profile and Support are accessed from within Settings, not as separate top-level nav items. Includes security, saved payment/payout methods, notifications preferences, and the currency display preference (see below).
- **Notifications** — icon-accessed (top on mobile, side on desktop); a full nav destination on desktop, not in mobile's bottom nav.

**Mobile bottom nav:** Home, Leaderboard, Assets only (3 items). **Desktop nav:** Home, Leaderboard, Assets, Notifications, Settings.

No standalone unified `/sell` hub page with an asset-type toggle. Instead, Sell Gift Card and Sell Crypto are two distinct flows/routes, both reachable from multiple entry points on Home (the Top Up dropdown, and the dedicated Sell Crypto/Sell Gift Cards cards). Content of each flow is unchanged from what's specified in product-rules.md (gift card: rate quote then code/PIN or image submission; crypto: rate quote then deposit address shown then proof of deposit submission).

**Country vs. currency after signup:** country is locked once set at signup (email/password form, or /select-country for Google OAuth) and cannot be changed afterward. Separately, users CAN change a display currency preference in Settings, purely cosmetic, affects only how prices/rates are shown to that user, never touches their actual wallet currency, balance, or any ledger entry. Same separation principle as the IP-based display currency on public pages (still pending, reminder set for when Vercel is connected).

## V1 Feature Scope

**In scope:**
- Sell Gift Card flow (rate shown before submission)
- Sell Crypto flow
- Wallet (ledger-based balance, withdraw)
- Transaction history
- Referrals
- Leaderboard
- Settings (profile, country/currency, security, payment methods, notifications)
- Admin dashboard (trade review, rate management, user management, payouts)

**Deferred (not V1):**
- Public Rate Calculator (interactive calculator UX comes later — for now, rates are shown inline on the Gift Cards and Crypto pages, no separate calculator or standalone rates page)
- Buying gift cards (sell-only for now)
- Automated card/crypto verification (manual admin review for V1)
- Rate alerts
- Merchant/partner API accounts
- Native mobile apps

## Open Decisions (to resolve before/while building architecture.md)

- Final tech stack (to be evaluated fresh for this project's requirements, not assumed from prior projects)
- Whether multi-currency wallets are needed sooner than "later"
- KYC/AML depth required given crypto payouts are in V1 scope from day one
- Which crypto assets/networks are supported at launch
