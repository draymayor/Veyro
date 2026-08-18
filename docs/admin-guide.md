# Veyro — Admin Guide

## Admin Dashboard Overview

The admin dashboard is a core part of Veyro's V1, not an afterthought — every trade in V1 requires manual review, so this is where the actual business runs day to day.

### Top-level metrics (dashboard home)
- Total users
- Today's trades
- Pending trades (awaiting review)
- Today's trading volume
- Wallet liabilities (total user balances owed)
- Withdrawals pending
- Revenue/profit (spread between quoted payout and actual liquidation value)

## Trade Review

The most-used screen in V1. One queue, filterable by asset type (Gift Card / Crypto) and status.

**Gift card trade view shows:**
- User, card brand, country, type (physical/e-code), value
- Locked rate + payout amount
- Submitted code/PIN (access-restricted) or uploaded images
- Receipt image if applicable
- Actions: Approve / Reject (with reason)

**Crypto trade view shows:**
- User, asset, network, amount
- Locked rate + payout amount
- User-submitted transaction hash + proof-of-deposit screenshot
- Admin manually verifies the deposit landed in Veyro's published address (via block explorer)
- Actions: Approve / Reject (with reason)

**On Approve:** trade status → Approved → wallet ledger credited automatically → user notified. No separate manual "credit wallet" step — approval triggers it.

## Rate Management

- Rate table structured as: Gift Card/Crypto Asset → Country (gift cards) or Network (crypto) → Type → Denomination Range → Rate
- Admin can add, edit, deactivate rates without a deploy
- Every rate change only affects new trades going forward — historical trades keep their locked rate snapshot
- Rates should be clearly labeled "Platform Rate" internally until a live market API (e.g. Prestmit) is connected

## Payout Processing (V1 — manual, no gateway integration)

Since Paystack/Flutterwave are not integrated in V1, all payouts are manually processed by admin outside the platform:
- Bank Transfer: admin views user-submitted bank details, sends transfer manually via their own banking, then marks the withdrawal `Paid` with a reference note.
- PayPal: admin sends manually via PayPal, marks `Paid`.
- Crypto: admin sends manually from Veyro's holdings, marks `Paid` with transaction hash.

This is a deliberate V1 simplification — expect this to be the first area to automate once volume grows.

## User Management

- KYC status (manual judgment call for V1, no paid provider yet)
- Trading history and total volume per user
- Account status (active/restricted/banned)
- Fraud/risk flags (duplicate card codes, duplicate images, repeated flagged submissions)

## Fraud Review Flags

Admin should see automatic flags (not auto-rejections) for:
- Duplicate or near-duplicate gift card images/codes across submissions
- Same crypto transaction hash submitted more than once
- Unusually rapid submission patterns from one account
- Mismatched proof-of-deposit details (wrong asset/network/amount)

Flagged items route to manual review, never auto-approve or auto-reject.
