# Veyro — Email Templates

Transactional emails only for V1 — no marketing sequences yet. Tone matches UI copy: warm, clear, confidence-building. Sent via Resend from support@veyro.best.

## Shared Shell

Every template below wraps a single base layout, built with React Email (`@react-email/components`), so header/footer/button markup lives in one place, not copied per template.

- **Header band:** terracotta (#E8674A) background, full width, centered text-based "Veyro" wordmark.
- **Content area:** white background, Inter font, #1C1B29 text, 600px max width, comfortable padding.
- **CTA button:** pill-shaped, terracotta fill, white text. Used by every template with a button.
- **Security note:** small, calm text block used on the OTP, password reset, and trade approved/rejected templates, stating Veyro will never ask for a password or verification code and pointing to support if the email is unexpected.
- **Divider**, then **footer:** support@veyro.best as a mailto link, "This is an automated message, please do not reply", copyright line with the current year. No app store badges, no social icons.

The two OTP-code templates (Verify Your Email, Password Reset) additionally share an inner layout for the greeting, code display, and expiry line, since their structure is otherwise identical.

## 0. Verify Your Email (Signup OTP)

**Subject:** Your Veyro verification code
**Body:**
> Hi [Name],
>
> Enter this code to verify your email and activate your Veyro account:
>
> [Code]
>
> This code expires in [X] minutes.

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

**Subject:** Reset your Veyro password
**Body:**
> Hi [Name],
>
> Click below to reset your password. This link expires in [X] minutes.
>
> [Reset Password button]
>
> Didn't request this? You can safely ignore this email.
