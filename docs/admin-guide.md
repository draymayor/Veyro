# Veyro — Admin Guide

## Admin Dashboard Overview

The admin dashboard is a core part of Veyro's V1, not an afterthought — every trade in V1 requires manual review, so this is where the actual business runs day to day. Veyro does not launch until crypto confirmation is either automated (Tatum or an equivalent) or a working alternative manual process is in place, this doc is written toward that target state, not the current interim gap.

### Top-level metrics (dashboard home)
- Total users
- Today's trades
- Pending trades (awaiting review)
- Today's trading volume
- Wallet liabilities (total user balances owed)
- Withdrawals pending
- Revenue/profit (spread between quoted payout and actual liquidation value)

### Admin notifications

Admin gets notified of activity needing attention: new trade submissions, new withdrawal requests, new Support messages, and (once built) crypto deposits detected via webhook. In-app notification panel at minimum; email notification for admin is worth considering but not required for V1.

## Trade Review

The most-used screen in V1. One queue, filterable by asset type (Gift Card / Crypto) and status.

**Gift card trade view shows:**
- User, card brand, country, type (physical/e-code), value
- Locked rate + payout amount
- Submitted code/PIN (access-restricted) or uploaded images
- Receipt image if applicable
- Actions: Approve / Reject (with reason)

**Crypto trade view (target state, built toward Tatum integration):**
- User, asset, network, amount, their own permanent deposit address (per-user, via Tatum)
- Locked rate + payout amount
- If webhook-based detection is active for this address (within whatever tier/limits apply): deposit shown as auto-detected, admin confirms
- If not covered by automatic detection: admin manually checks that specific user's address on a block explorer
- **Ethereum Classic and XDC Network never get webhook coverage, permanently.** Tatum's ADDRESS_TRANSACTION subscription product has no `attr.chain` value for either chain at all (confirmed against the full enum it returns) — not a coverage-tier/slot limitation like every other chain, a real gap in what Tatum supports. Deposits on these two networks always go through the manual admin-check path; don't treat their absence from auto-detection as a bug or a temporary gap to chase.
- Actions: Approve / Reject (with reason)
- Note: there is currently a real gap between the old proof-of-submission model (removed) and full Tatum integration (not yet built). Do not build UI assuming the old submitted-tx-hash-and-screenshot flow, build toward this target state instead.

**On Approve:** trade status → Approved → wallet ledger credited automatically → user notified. No separate manual "credit wallet" step — approval triggers it.

## All Transactions View (new)

Admin needs full visibility across every user, not just pending items: a comprehensive, filterable view of all deposits, withdrawals, and trades platform-wide (filter by user, type, status, date range). This is separate from the Trade Review queue (which is action-oriented, pending items needing a decision) — this view is for oversight and lookup of anything, completed or not.

## Manual Deposit (new)

Admin can manually credit either fiat or crypto directly to any user's wallet (e.g. correcting an issue, crediting a deposit caught outside automated detection). Uses the existing wallet_transactions pattern (a standalone credit, trade_id and withdrawal_id left null), requires a reason/note, logged via admin_actions for audit trail.

## Rate Management

- Gift card rate table structured as: Brand → Country → Type → Denomination Range → Rate
- Crypto: admin edits `crypto_assets.margin_percentage` per asset (the live CoinGecko price minus this margin determines payout, not a manually-set flat rate)
- Platform Settings: admin edits global values in `platform_settings` (e.g. `referral_bonus_usd`), not just per-asset rates
- Admin can add, edit, deactivate rates without a deploy
- Every rate change only affects new trades going forward — historical trades keep their locked rate snapshot
- Gift card rates should be clearly labeled "Platform Rate" internally until a live market API (e.g. Prestmit) is connected

## Payout Processing (V1 — manual; automation undecided, may add a payment processor later or stay manual, revisit post-launch)

All payouts are manually processed by admin outside the platform for now:
- Bank Transfer: admin views the specific saved bank account the user selected for that withdrawal (from `user_bank_accounts`), sends transfer manually via their own banking, then marks the withdrawal `Paid` with a reference note.
- PayPal: admin sends manually via PayPal, marks `Paid`.
- Crypto: goes straight to `processing` on submission, not a `requested`-first approval queue like the other two (see product-rules.md rule 18b), admin sends manually, marks `Paid` with transaction hash. A toggle on this page (`platform_settings.crypto_withdrawal_requires_approval`) lets admin switch crypto to a `requested`-first approval flow later if wanted, default is off (automatic).
- **Suspend withdrawals per user** (`users.withdrawals_suspended`): a quick action available right from this page (per-user, next to their withdrawal history), useful when investigating a specific transaction or account without needing a full account restriction/ban. This is narrower than `account_status`, the user can keep using the rest of the app normally.

This is a deliberate V1 simplification. Whether this becomes automated later (a payment processor integration) or stays manual indefinitely is not yet decided, don't build assuming either outcome, keep this cleanly swappable.

## Support Inbox (new)

Admin sees the categorized ticket list (per `support_threads`: category, Open/Resolved status), opens a thread, sees the full message history, replies (inserts a `support_messages` row with `sender='admin'`), can mark resolved. Realtime updates so new user messages appear live.

## User Management

- Full user list with all users and their complete transaction history (trades, withdrawals, wallet ledger), plus who referred them (referrer's identity, via referrals.referrer_id), this was implicit before, made explicit now
- Trading history and total volume per user
- Account status (active/restricted/banned), plus the narrower withdrawal-suspension toggle (users.withdrawals_suspended, see Payout Processing) should also be settable from here, same underlying flag, two access points (this page and the Withdrawals queue, whichever is more convenient in the moment)
- **Security override/reset capability (new):** if a user is fully locked out (lost their authenticator app and their backup codes, or their withdrawal PIN is locked and the email-reset path also fails them), admin can reset their TOTP enrollment (clear the factor, they re-enroll fresh) and/or reset their withdrawal PIN (clear `withdrawal_pin_hash`, they set a new one). This is a sensitive action, log it via `admin_actions` and require a reason.
- KYC status (manual judgment call for V1, no paid provider yet, per roadmap.md this stays deferred)

## Fraud Review

Veyro V1 doesn't take fiat deposits (digital assets only), so several of the original crypto-specific flags (duplicate transaction hash, mismatched proof-of-deposit) no longer apply, that whole submission model was removed. What still meaningfully applies:

- **Gift card duplicate detection**: flag if the same card code or a near-duplicate card image is submitted more than once (across any user, not just the same user), this is a straightforward comparison against existing submissions, not something requiring external verification, keep this for V1.
- **Unusually rapid submission patterns** from one account: still a reasonable flag to keep, doesn't depend on the removed crypto flow.

Flagged items route to manual review, never auto-approve or auto-reject.
