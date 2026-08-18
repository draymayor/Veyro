# Veyro — Design Principles

## Brand Identity

Veyro is a light-themed, warm, trust-forward fintech product — deliberately distinct from typical dark/neon crypto-exchange aesthetics (including Veyro's sibling product, Monance).

## Color System

| Role | Color | Hex |
|---|---|---|
| Primary accent | Terracotta/Coral | `#E8674A` |
| Background | Off-white | `#FAF7F2` |
| Text / ink | Deep charcoal-navy | `#1C1B29` |
| Secondary accent (success) | Muted sage | `#8A9B7E` |
| Error / alert | Muted brick red | `#C24E3D` |

Usage rules:
- Terracotta is the primary CTA color (buttons, active states, key highlights) — use it sparingly and deliberately, not as a background wash.
- Off-white background throughout; avoid pure white (`#FFFFFF`) panels — use subtle off-white/white layering for cards vs page background.
- Sage is reserved for success/approved states only — don't use it decoratively.
- Brick red for errors/rejections only — never for anything neutral.

## Typography

- **Headers:** Space Grotesk — used for page titles, section headers, hero copy. Gives the brand its distinctive, slightly geometric character.
- **Body / UI text / numbers:** Inter or General Sans — optimized for legibility at small sizes, especially wallet balances and rate figures.
- Numbers (rates, balances, amounts) should always use tabular figures where the font supports it, so columns of numbers align cleanly.

## Layout & Feel

- Light, airy, generous whitespace — avoid dense, cluttered "trading terminal" layouts (that's Monance's territory, not Veyro's).
- Cards with soft shadows/borders rather than hard divider lines, to keep the warm, approachable feel.
- Rate and payout numbers should be the visual focal point of the sell flow — largest text, most prominent placement, using the terracotta accent or ink color, never buried in small type.

## Trust Signals

Because Veyro handles gift card codes, crypto deposits, and payouts, visual trust cues matter throughout:
- Verification/status badges (Submitted, Under Review, Awaiting Deposit Confirmation, Approved, Paid) should be clearly color-coded and consistently styled across dashboard, transaction history, and admin views.
- Rate disclaimers ("Platform Rates, subject to confirmation") should be visible but not alarming — small, calm caption text near rate displays, not a warning banner.

## Component Consistency

- Reuse a single Sell flow shell for both Gift Card and Crypto, with the asset-type toggle at the top — visually these should feel like one product, not two bolted-together tools.
- Status badges, wallet balance display, and transaction rows should look and behave identically whether the underlying trade is a gift card or crypto sale.
