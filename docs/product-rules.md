# Veyro — Product Rules

These are the non-negotiable business rules the product must enforce, regardless of which screen or flow implements them. Reference this doc when building any trade, wallet, or admin logic.

## Rate & Quote Rules

1. **Rate is shown before submission.** User selects asset (gift card brand/country/type/denomination, or crypto asset), enters amount, and sees the computed payout before uploading anything.
2. **Quoted rate is snapshotted at submission time.** When a user submits a trade, the system records: `rate_id`, `rate_value`, `asset_amount`, `quoted_payout`, `currency`, `timestamp`. This snapshot is permanent — historical trades are never recalculated against today's rate.
3. **Rates are "Platform Rates," not live market rates, until a live API is connected.** No UI copy should claim real-time market pricing while rates are manually set.
4. **Rate structure is multi-dimensional:** brand/asset → country → type (physical/e-code, or crypto network) → denomination range → rate. Never a flat brand-level rate.
5. Admin can change any rate from the dashboard without a code deploy. Rate changes apply to new trades only, never retroactively.

## Trade Lifecycle Rules

6. Every trade moves through explicit states: `Submitted → Under Review → Approved / Rejected → Paid`. (Add `Disputed`, `Cancelled` as needed.)
6a. **Crypto trades have an extra state before Under Review: `Awaiting Deposit Confirmation`.** Unlike gift cards (where the submission itself is the card code/image), a crypto trade's "submission" is the user's proof-of-deposit (tx hash + screenshot) sent after they transfer to Veyro's published deposit address. The trade only advances to `Under Review` once that proof is received, then to `Approved` once admin confirms the deposit on-chain.
7. **Wallet credit only happens on Approved.** No conditional or partial credit before verification completes.
8. Once approved, credit is immediate and automatic — no separate manual "pay" step beyond approval.
9. V1 verification is manual (admin review), not automated. Automation is a post-V1 optimization once fraud patterns are understood.
10. Rejected trades must have a reason code/note visible to the user.

## Wallet & Ledger Rules

11. **Wallet balance is never a mutable single column.** Every credit/debit is a ledger entry (`wallet_transactions`), and balance is derived (or cached + reconciled) from the ledger, not edited directly.
12. Trade value (quoted payout) and wallet balance are separate concepts — a trade being "approved" is the event that creates the ledger entry, not the trade record itself being the balance.
13. Each user has one primary wallet currency, set at signup based on their selected country. Country cannot be changed after signup. Users MAY set a separate display currency preference (in Settings) purely for how prices/rates are shown to them, this is cosmetic only and never affects the actual wallet currency, balance, or any ledger entry.
14. Withdrawals are their own ledger entries, referencing `payout_id → user_id → amount → method → status → transaction_reference → created_at`.

## Asset-Specific Rules

15. **Gift cards:** collect brand, country, physical/e-code, denomination, plus code+PIN (e-code) or images (physical), plus receipt upload where the brand requires it.
16. **Crypto (V1 model — no per-user custody):** Veyro publishes its own deposit address per supported asset/network (not a unique address generated per user, unlike Monance). User selects asset, sees live rate (from Monance's price feed), sends funds to Veyro's published address, then submits proof of deposit (transaction hash + screenshot). Collect asset, network (e.g. distinguish USDT-TRC20 from USDT-ERC20 — never assume interchangeable), and the proof-of-deposit submission.
17. Duplicate/fraud detection applies to both asset types: flag repeated submissions, matching card codes/images, or suspicious wallet/deposit patterns for manual review rather than auto-rejecting or auto-approving.

## Payment/Payout Rules

18. Supported payout methods: Bank Transfer, PayPal, Crypto. Payout method selection happens after wallet credit (at withdrawal time), not bundled into the sell flow itself.
19. Bank transfer fields vary by country — do not assume a single field set (e.g. account number vs IBAN).
20. Crypto payout requires both asset and network to be explicitly selected — never inferred.

## Trust & Transparency Rules

21. Any public-facing rate (e.g. a rates page) must carry a disclaimer that rates fluctuate and are subject to confirmation/verification at submission time.
22. Users should always be able to see: current trade status, the rate that was locked in for their trade, and full transaction history.
