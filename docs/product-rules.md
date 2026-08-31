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
6a. **REVISED AGAIN: depositing crypto and selling crypto are two separate actions, not one combined "trade."** Depositing (rule 16) credits a real held crypto balance, it is not itself a sale and has no fiat payout. Selling is a distinct, later, user-initiated action: convert some or all of an already-held crypto balance to fiat at the live rate. Since the crypto being sold was already verified at deposit time, selling is an instant internal conversion (debit crypto_wallets, credit wallets, same action), it does NOT go through Trade Review as a pending item requiring admin approval, unlike gift card trades. Admin's crypto review responsibility is scoped to confirming DEPOSITS (webhook where covered, else manual check), not re-approving each subsequent sale of already-held crypto.
7. **Wallet credit only happens on Approved.** No conditional or partial credit before verification completes.
8. Once approved, credit is immediate and automatic — no separate manual "pay" step beyond approval.
9. V1 verification is manual (admin review), not automated. Automation is a post-V1 optimization once fraud patterns are understood.
10. Rejected trades must have a reason code/note visible to the user.

## Wallet & Ledger Rules

11. **Wallet balance is never a mutable single column.** Every credit/debit is a ledger entry (`wallet_transactions`), and balance is derived (or cached + reconciled) from the ledger, not edited directly.
12. Trade value (quoted payout) and wallet balance are separate concepts — a trade being "approved" is the event that creates the ledger entry, not the trade record itself being the balance.
13. Each user has one primary wallet currency, set at signup based on their selected country. Country cannot be changed after signup. Users MAY set a separate display currency preference (in Settings) purely for how prices/rates are shown to them, this is cosmetic only and never affects the actual wallet currency, balance, or any ledger entry.
13a. **Interrupted signup must resume correctly, not break, on return.** If a user abandons signup partway (closes the browser after Google OAuth but before /select-country, or after email/password account creation but before OTP verification) and later returns to log in, the same account already exists (Google OAuth is idempotent per identity; email/password creates the row immediately). The post-auth gating check (email verified? country set?) MUST run on every authenticated session, not just once immediately after the original signup action, so a returning incomplete-signup user is always routed back to whichever step they left off (/verify-email or /select-country), never landed on /home with a null country/unverified email, and never stuck unable to log back in at all.
13b. **Same email, different auth method (e.g. signed up via Google, later attempts email/password for the same address): country must NEVER get overwritten, regardless of whether Supabase's identity linking treats this as the same user or a blocked duplicate.** /select-country (and any other onboarding-completion step) must check whether the user already has a country set BEFORE showing the picker or writing to it, if it's already set, skip straight through, don't re-run onboarding. This must hold true independent of Supabase's account-linking configuration, which is an external setting, not something this app's correctness should depend on. Additionally, the email/password signup form should give a clear, specific error if the email is already registered under a different method ("This email already has an account, log in instead, or use Sign in with Google if that's how you signed up"), not a generic failure or a UI that silently proceeds only to break later.
14. Withdrawals are their own ledger entries, referencing `payout_id → user_id → amount → method → status → transaction_reference → created_at`.

## Asset-Specific Rules

15. **Gift cards:** collect brand, country, physical/e-code, denomination, plus code+PIN (e-code) or images (physical), plus receipt upload where the brand requires it.
16. **Crypto (REVISED AGAIN — real held per-user balances, not sold-on-deposit).** Each user gets a real, permanent deposit address per asset/network (generation via Tatum, see Planning History). A confirmed deposit credits a real crypto_wallets balance for that user/symbol (crypto_wallet_transactions), it does not automatically convert to fiat. Users genuinely hold this balance: they can sell it later (rule 6a, an instant internal conversion at time of sale) or withdraw it directly to an external address without ever selling. Collecting network explicitly still applies at deposit/withdrawal time (e.g. distinguish USDT-TRC20 from USDT-ERC20 — never assume interchangeable), but once credited, a balance is tracked per symbol only (network no longer matters once it's an internally-held balance, since the asset itself is fungible regardless of which network it arrived on).
17. Duplicate/fraud detection applies to both asset types: flag repeated submissions, matching card codes/images, or suspicious wallet/deposit patterns for manual review rather than auto-rejecting or auto-approving.

## Payment/Payout Rules

18. Supported payout methods: Bank Transfer, PayPal, Crypto. Payout method selection happens after wallet credit (at withdrawal time), not bundled into the sell flow itself.
18a. **Every withdrawal requires the user's self-set 4-digit withdrawal PIN before it executes, mandatory for all users regardless of TOTP enrollment status.** This is deliberately separate from TOTP and from backup/recovery codes: withdrawal confirmation is a frequent, routine action and needs a fast, low-friction step the user re-enters each time, not a one-time-use recovery mechanism. The PIN locks after repeated failed attempts and is reset via an email OTP (email_otps, purpose='withdrawal_confirmation', repurposed as the PIN-reset path, not a per-withdrawal fallback). TOTP backup/recovery codes (Settings 2FA) exist only for full account-recovery emergencies (lost authenticator app), never for routine withdrawals.
18b. **Crypto withdrawals default to automatic processing, not a pending-approval queue, unlike bank/PayPal.** Since the user supplies their own external destination address and already passed PIN verification, there's no admin approval decision needed the way there implicitly is for bank/PayPal (admin isn't verifying anything the user didn't already fully specify themselves). Crypto withdrawals go straight to `processing` status on submission (not `requested`), admin's remaining task is executing the actual on-chain send and marking `paid` with a transaction reference, not approving/rejecting. This is admin-configurable: `platform_settings.crypto_withdrawal_requires_approval` (default `false`) can be flipped to `true` later if a `requested`-first approval queue is ever wanted for crypto too, don't hardcode the automatic behavior as permanent.
18c. **Admin can suspend a specific user's ability to withdraw** (`users.withdrawals_suspended`, default false), independent of the broader `account_status` field, a narrower, surgical restriction (e.g. during an investigation) that doesn't otherwise restrict the user's normal app usage (selling, browsing, etc.), unlike a full `restricted`/`banned` account status. Checked at withdrawal submission time, block with a clear message if true.
19. Bank transfer fields vary by country — do not assume a single field set (e.g. account number vs IBAN). Users can save multiple bank accounts (user_bank_accounts table), not just one, with one marked default. Concrete field shapes by country (bank_details jsonb, expand this list as new countries are added, never hardcode Nigeria-only fields as the universal default):
    - Nigeria: bank name (dropdown of Nigerian banks), 10-digit account number, account name
    - United States: bank name, routing number, account number, account type (checking/savings)
    - United Kingdom: bank name, sort code, account number
    - SEPA/EU countries: IBAN, BIC/SWIFT, bank name
    - Fallback for any country without a specific mapping yet: IBAN or SWIFT/BIC plus account number, generic enough to not assume Nigerian conventions
    The country field on user_bank_accounts determines which field set the UI renders; this is a real conditional form, not one fixed template with relabeled fields.
20. Crypto payout requires both asset and network to be explicitly selected — never inferred.

## Trust & Transparency Rules

21. Any public-facing rate (e.g. a rates page) must carry a disclaimer that rates fluctuate and are subject to confirmation/verification at submission time.
22. Users should always be able to see: current trade status, the rate that was locked in for their trade, and full transaction history.
