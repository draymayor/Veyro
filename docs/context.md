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
2. **Crypto** — **REVISED, real held balances, not instant conversion.** Users deposit crypto into their own real per-asset balance (via Tatum-generated per-user addresses), which they genuinely hold, not an automatic conversion to fiat. Selling and depositing are two distinct, separate actions: depositing credits a real crypto balance; selling is a deliberate, separate user action converting some or all of a held crypto balance into fiat. Users can also withdraw held crypto to an external address without ever selling it. This supersedes an earlier "sold directly to Veyro" model that no longer reflects how the product actually works.

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
- **Secondary accent:** Vibrant green `#0ECB81` (success states, price gains — market-standard crypto green, replaces an earlier muted sage that read as dull)
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

Mobile-first app layout: bottom nav on mobile, full sidebar on desktop.

**Pages:**
- **Home** (not "Dashboard") — top search bar (replaces the wordmark on this screen). Balance card with Deposit and Withdraw buttons: Deposit opens a list of 3 options (Deposit Crypto first, then Sell Gift Cards, then Sell Crypto), Withdraw opens its own list of 3 options (Bank Transfer, PayPal, Crypto). Deposit button icon: down arrow. Withdraw button icon: up arrow. Also a section with Sell Crypto / Sell Gift Cards cards, and a rates section (tabs for crypto vs gift card rates).
- **Leaderboard** — Trading and Referrals rankings, weekly volume/count. Desktop: two side-by-side panels on one page. Mobile: switchable tabs. Trade volume combines gift card + crypto into one number. Includes a compact referral teaser card linking to the standalone Referrals page.
- **Referrals** — standalone page: referral link/code, without exposing referred users' emails. Stat cards: "Potential Earning" (sum of $referral_bonus_usd for referrals with bonus_paid_at still null) and "Total Earned" (sum of bonus_amount where bonus_paid_at is set), alongside existing stats. Table of referrals, with filter controls above it (by status at minimum: Pending/Success): the referred user's **User ID** (same identifier/format shown for that user on admin pages, e.g. a shortened UUID or reference code, NOT their email, a raw ID isn't PII the way an email is, this is a genuine correction from an earlier "masked identifier" description, not a privacy exception), joined date, deposit status (Pending/Success derived from bonus_paid_at), country. After referring someone, the user is told their $[amount] becomes eligible once the referred user makes a deposit, not immediately at signup.
- **Assets** (not "Wallet") — wallet balance flow at top (same pattern as Home's balance card), user's assets below that, transaction history below that.
- **Notifications** — a full nav destination on desktop, not in mobile's bottom nav; icon-accessed on mobile.
- **Settings** — security, saved payment/payout methods, notifications preferences, currency display preference (see below). Links out to Support and Profile (both are now standalone pages, not nested under Settings).
- **Support** (standalone page, not nested under Settings) — includes a live chat widget: user sends a message, Veyro's team (admin) receives and responds. This needs a messages/conversation table in Supabase, to be set up when this page is actually built.
- **Profile** (standalone page, not nested under Settings) — includes profile image upload; the uploaded image becomes the user's avatar shown wherever their profile icon appears (mobile top bar, desktop sidebar profile card). Needs a Supabase Storage bucket for avatars, to be set up when this page is actually built.

**Mobile:**
- Top bar icons: Profile (avatar), Notifications, Support — plus a search bar (replaces the "Veyro" wordmark on Home).
- Bottom nav: Home, Leaderboard, Assets only (3 items). Referrals isn't in the bottom nav (kept to 3 items); reach it via a link/card on the Leaderboard page.
- Settings page includes links to both Support and Profile as a secondary access path.

**Desktop — 3-column layout** (at least on Home, likely other pages too):
- **Left sidebar**: background color `#E8674A` (terracotta, not neutral). Nav items: Home, Leaderboard, Referrals, Assets, Notifications, Settings, Support. Fixed profile card at the bottom of the sidebar (avatar + email, not a nav link, a persistent account chip) linking to the Profile page.
- **Center**: main page content (search bar at top on Home, then balance card, sell cards, rates, etc.)
- **Right sidebar**: widget/preview cards surfacing a taste of other pages' content without navigating away (e.g. a referral snippet linking to Leaderboard, a recent-notifications snippet, a recent-activity snippet linking to Assets).

**Icon style:** filled/solid icons throughout, not outline. Inactive nav icons are grey; active icons take the accent/contrast color. Binance-style treatment.

No standalone unified `/sell` hub page with an asset-type toggle. Sell Gift Card remains its own flow (rate quote then code/PIN or image submission, unchanged). Sell Crypto has changed: the proof-of-deposit submission step was removed (per product-rules.md rule 6a, real per-user addresses replace the old shared-address model), so it now just shows the user their own permanent deposit address, same as the "Deposit Crypto" flow below. **Open question, not yet resolved:** since Sell Crypto and Deposit Crypto now do essentially the same thing (show a real per-user address), should they be formally merged into one flow, or kept as two separate entry points that happen to converge on similar content? Revisit this explicitly rather than letting it stay ambiguous.

**Deposit Crypto:** a flow reached via the Deposit list. Shows a crypto asset list, then that asset's real deposit address and QR code. Depends on real per-user Tatum-generated addresses (see Planning History). On confirmed deposit (webhook where covered, else admin manual check, per the hybrid model), credits a REAL crypto_wallets balance for that user/symbol (crypto_wallet_transactions type='deposit'), does NOT convert to fiat, this is genuinely held.

**Sell Crypto:** REVISED — a deliberate, separate action distinct from depositing. User selects an asset, an amount up to their current crypto_wallets balance for that symbol, sees a live rate quote, confirms. Since the crypto being sold is already a verified, previously-deposited balance (legitimacy was established at deposit time), this is an instant internal conversion, not a submit-and-wait-for-admin flow: crypto_wallets is debited (crypto_wallet_transactions type='sell_conversion_debit'), the fiat wallets balance is credited in the same atomic action. No admin approval needed per individual sale, admin's crypto review role is scoped to confirming DEPOSITS (per the hybrid detection model), not re-reviewing each subsequent sale of already-held crypto.

**Crypto Withdrawal:** debits a user's held crypto_wallets balance (crypto_wallet_transactions type='withdrawal') to send to an external address, per the existing dedicated withdrawal page, gated by the withdrawal PIN as already built.

**Assets page crypto section:** shows REAL held balances from crypto_wallets per symbol, not a historical rollup, this is genuinely spendable/withdrawable/sellable, same as a fiat balance conceptually, just a different asset.

**Withdrawal pages (new, TWO separate pages, not merged):**
- **Send to External Account** — reached from the Withdraw list's bank/PayPal option. User enters amount, picks a saved bank account (from user_bank_accounts) or PayPal, then submits.
- **Crypto Withdrawal (its own dedicated page, own route)** — reached from the Withdraw list's Crypto option, after selecting an asset. Matches the Binance/MEXC pattern: asset selector at top (navigable to change), destination address field (with paste/scan actions), network selector (only shown if the asset has more than one network), amount field with a "Max" quick-fill and available balance shown, optional remarks/instructions field, a received-amount summary showing network fee deducted, then the withdraw action. Distinct page from bank/PayPal specifically because the interaction is fundamentally different, typing a destination address each time vs. picking from saved accounts, not just a styling choice.

Both pages create a `withdrawals` row per docs/database-schema.md, gated by the withdrawal PIN (product-rules.md rule 18a) before either executes.

**Admin manual deposit (upcoming, folds into Admin pages, not built yet):** admin needs the ability to manually credit either fiat or crypto directly to any user's wallet (e.g. correcting an issue, or crediting a deposit caught outside automated detection). No new table needed, this uses the existing wallet_transactions pattern (trade_id and withdrawal_id both nullable already support a standalone manual credit), logged via admin_actions for audit trail.

**Country vs. currency after signup:** country is locked once set at signup (email/password form, or /select-country for Google OAuth) and cannot be changed afterward. Separately, users CAN change a display currency preference in Settings, purely cosmetic, affects only how prices/rates are shown to that user, never touches their actual wallet currency, balance, or any ledger entry. Same separation principle as the IP-based display currency on public pages (still pending, reminder set for when Vercel is connected).

## Admin Authentication Architecture

Admin is deliberately NOT a regular user with extra permissions layered on top, but it's ALSO not a separate, discoverable login page. Corrected from an earlier wrong assumption: a distinct `/admin/login` URL is itself an attack surface (anyone probing the site finds it immediately), so this is intentionally avoided.

- **Shared login, no separate URL**: admin uses the exact same `/login` page and the same Google OAuth / email/password flows as every consumer user, indistinguishable from the outside, no separate admin auth surface to discover or target.
- **Post-auth branch, invisible from outside**: after successful authentication (via either method), the backend checks `users.is_admin = true` server-side. If true, redirect to `/admin/dashboard` instead of the consumer app. If false, proceed with the normal consumer flow (onboarding gates, Home, etc.) as usual.
- **Exclusive routing once admin**: an admin session is routed ONLY to `/admin` and its sub-routes. Consumer routes (Home, Assets, Sell, Settings, etc.) are actively blocked for that session, not just technically reachable but unused.
- **No onboarding forced on admin accounts**: admin's row in `public.users` stays minimal, no country, no currency, no OTP/select-country gating, none of the consumer onboarding flow applies to an admin identity.
- Still uses the same underlying Supabase Auth mechanism as consumer accounts (not a rebuilt auth system), the separation is purely in the post-auth routing decision, not the authentication technology or UI.

## V1 Feature Scope

**In scope:**
- Sell Gift Card flow (rate shown before submission)
- Sell Crypto flow
- Wallet (ledger-based balance, withdraw)
- Transaction history
- Referrals
- Leaderboard
- Settings (security, payment methods, notifications, currency display)
- Profile (standalone page, avatar upload)
- Support (standalone page, live chat with admin)
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
