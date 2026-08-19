# Veyro — Roadmap

## Phase 1 (V1 — Launch)

**Core flows**
- Sell Gift Card (physical/e-code, manual admin verification)
- Sell Crypto (manual deposit confirmation, no custody)
- Wallet (ledger-based, single primary currency per user)
- Withdraw (Bank Transfer — manual, PayPal — manual, Crypto — manual)

**Supporting features**
- Referrals
- Leaderboard
- Settings (profile, country/currency, security, payment methods, notifications)
- Admin dashboard (trade review, rate management, user management, manual payout processing)

**Rate sourcing**
- Manually managed "Platform Rates" table
- Prestmit application pending — swap to live rates once approved
- Sogo — revisit once their developer API leaves "in the works" status
- Crypto prices from Monance's existing feed (CoinGecko + Binance WebSocket)

**Explicitly deferred to later phases:**
- Public Rate Calculator (public rates page may exist for SEO, full calculator UX later)
- Buying gift cards (sell-only at launch)
- Automated card/crypto verification
- Rate alerts
- Merchant/partner API accounts
- Native mobile apps

## Phase 2 (Post-Launch — Automation & Scale)

- Connect live rate API (Prestmit, pending approval; Sogo if/when available)
- Paid KYC/AML provider integration (e.g. Sumsub) once manual review becomes a bottleneck
- Payment gateway integration for automated payouts (Paystack/Flutterwave or equivalent) — replacing manual bank transfer processing
- Automated fraud detection (beyond duplicate-flagging) as transaction volume provides pattern data
- Multi-currency wallets (hold balances in more than one currency)
- Rate Calculator as a standalone public tool

## Phase 3 (Growth)

- Automated gift card / crypto verification (reducing manual review load)
- Merchant/partner API accounts (allow others to build on Veyro, mirroring what Prestmit itself offers)
- Expanded crypto custody model (per-user deposit addresses) if manual deposit confirmation becomes a bottleneck
- Native mobile apps
- Buying gift cards (two-sided marketplace, if validated)

## Identified Gaps (not yet actioned)

Surfaced while auditing available build tooling against Veyro's actual needs:

- **Structured data / JSON-LD (schema.org)** — Product/Offer/FAQPage markup for Gift Cards and Crypto pages, would help rich snippets. Natural follow-on to the robots.txt/sitemap work, low effort.
- **Real legal review** — /terms and /privacy are still marked as drafts needing lawyer review in code comments, this was flagged from the start and remains genuinely outstanding, not something further AI drafting can substitute for, given money transmission/gift card resale/crypto payout regulatory exposure.
- **Core Web Vitals / performance audit** — Lighthouse-style LCP/CLS/INP profiling, matters for a motion-heavy site, worth doing as a pre-launch checklist item.
- **i18n / localization** — Veyro is global by design, but full translation workflows are a Phase 2+ concern, English-only is fine for V1.
- **Analytics / event tracking** — no event taxonomy or GA4/Segment wiring yet for the trade funnel (submit → verify → payout). Worth prioritizing before broad public launch so drop-off is actually measurable.

## Notes

- Every phase boundary above is a deliberate V1 simplification, not a technical limitation — features move to Phase 2/3 as volume and validation justify the added complexity (payment gateway, KYC cost, custody risk).
- Revisit this roadmap after V1 has real trade volume — priorities here are assumptions, not commitments.
