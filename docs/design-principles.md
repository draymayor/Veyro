# Veyro — Design Principles

## Brand Identity

Veyro is a light-themed, warm, trust-forward fintech product — deliberately distinct from typical dark/neon crypto-exchange aesthetics (including Veyro's sibling product, Monance).

## Color System

| Role | Color | Hex |
|---|---|---|
| Primary accent | Terracotta/Coral | `#E8674A` |
| Background | Off-white | `#FAF7F2` |
| Text / ink | Deep charcoal-navy | `#1C1B29` |
| Secondary accent (success) | Vibrant green | `#0ECB81` |
| Error / alert | Muted brick red | `#C24E3D` |

Usage rules:
- Terracotta is the primary CTA color (buttons, active states, key highlights) on public/marketing pages — use it sparingly and deliberately, not as a background wash there.
- **Exception:** the private app's desktop sidebar uses terracotta as its full background color, a deliberate, bold departure for app chrome specifically (distinct from the public site's restrained usage).
- Off-white background throughout; avoid pure white (`#FFFFFF`) panels — use subtle off-white/white layering for cards vs page background.
- Vibrant green (`#0ECB81`) is reserved for success/approved states and price gains only — don't use it decoratively. This is the same green used for the market-convention "up" indicator on rate cards, one consistent green across the whole app, not two different tones.
- Brick red for errors/rejections only — never for anything neutral.

## Icon Style

Filled/solid icons throughout the private app, not outline/stroke icons. Inactive nav icons are grey; active icons take the accent or contrast color appropriate to their context (Binance-style treatment). Use an icon set with true solid variants (e.g. Heroicons' solid set) rather than faking fill on outline icons.

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

## Navigation Chrome: Main Tab Pages vs. Inner Pages

Two distinct header treatments in the private app, don't mix them:

- **Main tab pages** (Home, Leaderboard, Assets — the 3 mobile bottom nav destinations): keep the full top bar (search bar, notification/support/profile icons) as already built for Home.
- **Inner/drill-in pages** (everything reached by navigating from a main tab page or the desktop sidebar — Sell Gift Card, Sell Crypto, Referrals, Notifications, Settings, Support, Profile, and any sub-pages within them): use a simple header instead — a back arrow on the left and the page title centered in the same row, no search/notification/profile icons repeated here. If the page needs its own search bar (e.g. Sell Gift Card's brand search), it goes directly below this header row, not merged into it. This applies on both mobile and desktop for the center content area; the desktop sidebar itself is unaffected and stays persistent regardless of which page is open.

## List/Row Styling

No drop shadows and no dividing lines between rows in lists (brand lists, asset lists, transaction lists, etc.). Flat rows, generous vertical padding for separation instead of visual borders, tap targets should feel large and clean, not boxed into individual cards with shadows.

## Rate/Price Card Patterns

Two distinct card treatments exist, don't cross them:

- **Public site (homepage, /crypto page):** dark, near-black glassmorphic card — a deliberate contrast moment against the light public page background. Icon+name+symbol, large price, green (`#0ECB81`)/red (`#C24E3D`) % change badge, glowing area chart. Already built, stays as-is, this is intentionally the one dark element in an otherwise light-themed site.
- **Private app (Home page and anywhere else inside the authenticated app):** light card, matching the rest of the app's light mode, NOT a reused version of the dark public card. White/off-white background (per the standard card treatment, soft shadow/border, not pure `#FFFFFF`), same functional elements (icon+name+symbol, large tabular price, same green `#0ECB81`/red `#C24E3D` % badge as the public card, one consistent green across the app), but the chart uses a clean line with a soft color-tinted fill underneath (light green tint for up, muted red/brick tint for down) instead of a glow effect, glow only reads well against dark backgrounds, on a light card it should look like a clean, soft gradient-fill line chart instead (standard modern fintech pattern).

## Component Consistency

- Sell Gift Card and Sell Crypto are two distinct flows/routes (no unified toggle page), but should still feel like one product, consistent shell, motion, and card styling across both, not two bolted-together tools.
- Status badges, wallet balance display, and transaction rows should look and behave identically whether the underlying trade is a gift card or crypto sale.
