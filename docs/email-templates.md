# Veyro — Email Templates

Transactional emails only for V1 — no marketing sequences yet. Tone matches UI copy: warm, clear, confidence-building. Sent via Resend from support@veyro.best.

## Shared Email Shell (applies to every template below)

Every transactional email uses the same shell, styled per design-principles.md:
- **Header band:** background color `#1C1B29` (ink, NOT the terracotta primary), logo icon placed beside the "Veyro" wordmark (not just text alone)
- **Greeting:** "Hi [Name]," or "Hi there," if name isn't available
- **Body:** left-aligned, Inter, #1C1B29 text on white
- **No redundant title:** the subject line and an in-body heading should never restate the same thing, go straight from greeting into the actual message, don't repeat the subject as a big heading in the body
- **CTA button** (where applicable): pill-shaped, terracotta fill, white text
- **OTP/verification code display:** moderate size, NOT oversized, legible and easy to read/copy but not dominating the email visually
- **Security note** (where applicable, e.g. OTP/password reset/trade emails): a short line noting Veyro will never ask for their password or OTP code, and to contact support if they didn't request this action
- **Divider**
- **Footer:** support@veyro.best link, a line noting "This is an automated message, please do not reply," copyright line. No app store badges (no native app in V1). No social links until Veyro's social accounts exist, don't fabricate placeholder links.

## 0. Verify Your Email (Signup OTP)

**Subject:** Your Veyro verification code
**Body:**
> Hi [Name],
>
> Your verification code is:
>
> **[6-digit code]**
>
> This code expires in 10 minutes. Enter it on the verification page to activate your account.
>
> Didn't sign up for Veyro? You can safely ignore this email.

## 1. Welcome / Signup Confirmation

**Subject:** Welcome to Veyro
**Body:**
> Hi [Name],
>
> Your Veyro account is ready. You can now sell gift cards and crypto for instant wallet credit.
>
> [Get Started button → Sell a Gift Card or Crypto]
>
> — The Veyro Team

## 2. Trade Submitted

**Subject:** We've received your submission
**Body:**
> Hi [Name],
>
> We've received your [gift card / crypto] submission for [Asset/Brand] — [Amount].
>
> Status: Under Review
> Locked rate: [Rate]
> Expected payout: [Payout]
>
> We'll notify you as soon as it's verified.
>
> [View Trade button]

## 3. Crypto — Awaiting Deposit Confirmation

**Subject:** Waiting for your deposit
**Body:**
> Hi [Name],
>
> We're watching for your [Asset] deposit on [Network].
>
> Send to: [Deposit Address]
> Once sent, submit your transaction hash and proof of deposit in the app so we can confirm.
>
> [Submit Proof of Deposit button]

## 4. Trade Approved

**Subject:** You've been paid — [Amount] added to your wallet
**Body:**
> Hi [Name],
>
> Your [gift card / crypto] submission has been verified.
>
> [Payout Amount] has been added to your Veyro wallet.
>
> New wallet balance: [Balance]
>
> [Withdraw Now button]

## 5. Trade Rejected

**Subject:** Update on your submission
**Body:**
> Hi [Name],
>
> Unfortunately, we couldn't approve your [gift card / crypto] submission.
>
> Reason: [Reason]
>
> If you believe this is a mistake, contact support.
>
> [Contact Support button]

## 6. Withdrawal Requested

**Subject:** Withdrawal request received
**Body:**
> Hi [Name],
>
> We've received your withdrawal request for [Amount] via [Method].
>
> We'll process this shortly and notify you once it's complete.

## 7. Withdrawal Completed

**Subject:** Your withdrawal is complete
**Body:**
> Hi [Name],
>
> [Amount] has been sent via [Method].
> Reference: [Transaction Reference]
>
> Thanks for using Veyro.

## 8. Referral Earned

**Subject:** You just earned a referral bonus
**Body:**
> Hi [Name],
>
> [Referred User] just completed their first trade — you've earned [Bonus Amount].
>
> [View Referrals button]

## 9. Password Reset

**Subject:** Your Veyro password reset code
**Body:**
> Hi [Name],
>
> Your password reset code is:
>
> **[6-digit code]**
>
> This code expires in 10 minutes. Enter it on the reset password page to continue.
>
> Didn't request this? You can safely ignore this email, your password won't be changed.

## 10. Wallet Credited (Manual Deposit)

**Subject:** Your Veyro wallet has been credited
**Body:**
> Hi [Name],
>
> Veyro has credited your wallet: **[amount] [currency]**
>
> New balance: [balance]
>
> If you have questions about this credit, contact Support.

## 11. Withdrawal Failed

**Subject:** Your withdrawal couldn't be completed
**Body:**
> Hi [Name],
>
> Your withdrawal of [amount] couldn't be completed: [reason].
>
> The funds have been returned to your wallet. Please check your details and try again, or contact Support if you need help.

## 12. Two-Factor Authentication Enabled

**Subject:** Two-factor authentication enabled on your account
**Body:**
> Hi [Name],
>
> Two-factor authentication was just turned on for your Veyro account.
>
> Didn't do this? Contact Support immediately.

## 13. Withdrawal PIN Set/Changed

**Subject:** Your withdrawal PIN was updated
**Body:**
> Hi [Name],
>
> Your withdrawal PIN was just changed.
>
> Didn't do this? Contact Support immediately.

## 14. Security Reset by Support (admin-initiated)

**Subject:** A security setting on your account was reset
**Body:**
> Hi [Name],
>
> At your request (or as part of an account recovery), Veyro Support reset your [2FA / withdrawal PIN] on [date]. Please set it up again the next time you log in.
>
> Didn't request this? Contact Support immediately.

## 15. Support Ticket Resolved

**Subject:** Your support ticket has been resolved
**Body:**
> Hi [Name],
>
> Your recent support conversation about [category] has been marked resolved. If you need anything else, just reply here and it'll reopen automatically.

## 16. Crypto Withdrawal Processing

**Subject:** Your crypto withdrawal is on its way
**Body:**
> Hi [Name],
>
> Your withdrawal of [amount] [asset] is being processed to the address you provided. You'll be notified once it's complete.

