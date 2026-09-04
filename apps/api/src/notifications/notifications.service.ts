import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { withTimeout } from '../common/fetch-with-timeout';
import type { ReactElement } from 'react';
import { render } from '@react-email/render';
import {
  VerifyEmail,
  PasswordReset,
  Welcome,
  TradeSubmitted,
  CryptoAwaitingDeposit,
  TradeApproved,
  TradeRejected,
  WithdrawalRequested,
  WithdrawalCompleted,
  ReferralEarned,
  WithdrawalPinReset,
  TwoFactorRecoveryUsed,
  WalletCredited,
  CryptoDepositCredited,
  CryptoDepositDetected,
  WithdrawalFailed,
  TwoFactorEnabled,
  WithdrawalPinChanged,
  SecurityResetByAdmin,
  SupportTicketResolved,
  CryptoWithdrawalProcessing,
  type TradeAssetType,
  type SecurityResetType,
} from './emails/templates';

const OTP_EXPIRY_MINUTES = 10;
// veyro.com is not registered with Resend and was never verified — every
// send silently failed with "domain is not verified" until the response
// error-checking fix in send() below made that visible. veyro.best is the
// actual verified sending domain (see Resend dashboard).
const FROM_ADDRESS = 'Veyro <noreply@veyro.best>';
const SEND_TIMEOUT_MS = 10_000;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  // Throws on failure so callers (e.g. AuthService.sendOtp) don't report
  // success to the user when no email actually went out. This matters
  // because resend.emails.send() does NOT throw on an API-level failure
  // (bad key, invalid recipient, etc.) — it resolves with { data: null,
  // error }, so the old try/catch-only version here silently swallowed
  // every real failure and always reported success.
  private async send(
    to: string,
    subject: string,
    template: ReactElement,
  ): Promise<void> {
    const [html, text] = await Promise.all([
      render(template),
      render(template, { plainText: true }),
    ]);

    // The Resend SDK doesn't expose a way to pass our own AbortSignal
    // through, so this races the call itself rather than the underlying
    // fetch. A slow Resend response must not hang the request indefinitely
    // (per the earlier bug where a silently-failed send still reported
    // success to the user) - a timeout here throws, same as an API-level
    // error below, so callers never report success when no email actually
    // went out.
    let result: Awaited<ReturnType<typeof this.resend.emails.send>>;
    try {
      result = await withTimeout(
        this.resend.emails.send({
          from: FROM_ADDRESS,
          to,
          subject,
          html,
          text,
        }),
        SEND_TIMEOUT_MS,
        `Resend send("${subject}")`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to send "${subject}" email to ${to}: ${message}`,
      );
      throw new Error(`Failed to send "${subject}" email: ${message}`);
    }

    const { error } = result;

    if (error) {
      this.logger.error(
        `Failed to send "${subject}" email to ${to}: ${error.name} - ${error.message}`,
      );
      throw new Error(`Failed to send "${subject}" email: ${error.message}`);
    }
  }

  // Signup verification code.
  async sendOtpEmail(
    email: string,
    code: string,
    name?: string,
  ): Promise<void> {
    await this.send(
      email,
      'Your Veyro verification code',
      VerifyEmail({ name, code, expiryMinutes: OTP_EXPIRY_MINUTES }),
    );
  }

  // Password reset code.
  async sendPasswordResetEmail(
    email: string,
    code: string,
    name?: string,
  ): Promise<void> {
    await this.send(
      email,
      'Reset your Veyro password',
      PasswordReset({ name, code, expiryMinutes: OTP_EXPIRY_MINUTES }),
    );
  }

  // Sent once, right after signup email verification succeeds (see
  // AuthService.verifyOtp). getStartedUrl is built here rather than
  // passed in since WEB_APP_URL is API-side config the caller shouldn't
  // need to know about.
  async sendWelcomeEmail(params: {
    email: string;
    name: string;
  }): Promise<void> {
    const webAppUrl = (
      this.configService.get<string>('WEB_APP_URL') ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
    await this.send(
      params.email,
      'Welcome to Veyro',
      Welcome({ name: params.name, getStartedUrl: `${webAppUrl}/home` }),
    );
  }

  async sendTradeSubmittedEmail(params: {
    email: string;
    name: string;
    assetType: TradeAssetType;
    assetLabel: string;
    amount: string;
    rate: string;
    payout: string;
    tradeUrl: string;
  }): Promise<void> {
    const { email, ...props } = params;
    await this.send(
      email,
      "We've received your submission",
      TradeSubmitted(props),
    );
  }

  async sendCryptoAwaitingDepositEmail(params: {
    email: string;
    name: string;
    asset: string;
    network: string;
    depositAddress: string;
    submitProofUrl: string;
  }): Promise<void> {
    const { email, ...props } = params;
    await this.send(
      email,
      'Waiting for your deposit',
      CryptoAwaitingDeposit(props),
    );
  }

  async sendTradeApprovedEmail(params: {
    email: string;
    name: string;
    assetType: TradeAssetType;
    payoutAmount: string;
    balance: string;
    withdrawUrl: string;
  }): Promise<void> {
    const { email, ...props } = params;
    await this.send(
      email,
      `You've been paid: ${params.payoutAmount} added to your wallet`,
      TradeApproved(props),
    );
  }

  async sendTradeRejectedEmail(params: {
    email: string;
    name: string;
    assetType: TradeAssetType;
    reason: string;
    contactSupportUrl: string;
  }): Promise<void> {
    const { email, ...props } = params;
    await this.send(email, 'Update on your submission', TradeRejected(props));
  }

  async sendWithdrawalRequestedEmail(params: {
    email: string;
    name: string;
    amount: string;
    method: string;
  }): Promise<void> {
    const { email, ...props } = params;
    await this.send(
      email,
      'Withdrawal request received',
      WithdrawalRequested(props),
    );
  }

  async sendWithdrawalCompletedEmail(params: {
    email: string;
    name: string;
    amount: string;
    method: string;
    transactionReference: string;
  }): Promise<void> {
    const { email, ...props } = params;
    await this.send(
      email,
      'Your withdrawal is complete',
      WithdrawalCompleted(props),
    );
  }

  async sendReferralEarnedEmail(params: {
    email: string;
    name: string;
    referredUserName: string;
    bonusAmount: string;
    viewReferralsUrl: string;
  }): Promise<void> {
    const { email, ...props } = params;
    await this.send(
      email,
      'You just earned a referral bonus',
      ReferralEarned(props),
    );
  }

  // Withdrawal-PIN-reset code (email_otps, purpose='withdrawal_confirmation').
  async sendWithdrawalPinResetEmail(
    email: string,
    code: string,
    name?: string,
  ): Promise<void> {
    await this.send(
      email,
      'Reset your Veyro withdrawal PIN',
      WithdrawalPinReset({ name, code, expiryMinutes: OTP_EXPIRY_MINUTES }),
    );
  }

  // Sent the instant the Tatum webhook detects a deposit (crypto_deposit_events
  // status 'pending_confirmation') - distinct from sendCryptoDepositCreditedEmail,
  // which fires later once the confirmation-depth poller actually credits it.
  async sendCryptoDepositDetectedEmail(params: {
    email: string;
    name: string;
    amount: string;
    asset: string;
  }): Promise<void> {
    const { email, ...props } = params;
    await this.send(
      email,
      `We've spotted your incoming ${params.asset} deposit`,
      CryptoDepositDetected(props),
    );
  }

  // Sent when a TOTP backup code is redeemed at login (AuthService.recoverWithBackupCode).
  async sendTwoFactorRecoveryEmail(params: {
    email: string;
    name: string;
  }): Promise<void> {
    const webAppUrl = (
      this.configService.get<string>('WEB_APP_URL') ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
    await this.send(
      params.email,
      'A backup code was used on your Veyro account',
      TwoFactorRecoveryUsed({
        name: params.name,
        settingsUrl: `${webAppUrl}/settings`,
      }),
    );
  }

  // Manual fiat Deposit (docs/admin-guide.md, AdminDepositsService.execute).
  async sendWalletCreditedEmail(params: {
    email: string;
    name: string;
    amount: string;
    balance: string;
  }): Promise<void> {
    const { email, ...props } = params;
    await this.send(
      email,
      'Your Veyro wallet has been credited',
      WalletCredited(props),
    );
  }

  // Manual crypto deposit confirmation (AdminDepositsService.execute,
  // the admin-manual-check half of the hybrid deposit-confirmation model,
  // docs/product-rules.md rule 16) - credits crypto_wallets directly, never
  // the fiat wallet, so this is a separate template from WalletCredited
  // rather than a variant of it. `amount`/`balance` are crypto figures
  // (e.g. "0.005 BTC" / "0.015 BTC"), not fiat.
  async sendCryptoDepositCreditedEmail(params: {
    email: string;
    name: string;
    amount: string;
    balance: string;
  }): Promise<void> {
    const { email, ...props } = params;
    await this.send(
      email,
      'Your Veyro crypto balance has been credited',
      CryptoDepositCredited(props),
    );
  }

  // Sent alongside the compensating credit-back in
  // admin-withdrawals.service.ts's markFailed, never instead of it.
  async sendWithdrawalFailedEmail(params: {
    email: string;
    name: string;
    amount: string;
    reason: string;
    contactSupportUrl: string;
  }): Promise<void> {
    const { email, ...props } = params;
    await this.send(
      email,
      "Your withdrawal couldn't be completed",
      WithdrawalFailed(props),
    );
  }

  // Sent on successful TOTP enrollment (the opposite event from
  // sendTwoFactorRecoveryEmail, which fires when 2FA gets turned back off).
  async sendTwoFactorEnabledEmail(params: {
    email: string;
    name: string;
  }): Promise<void> {
    const { email, ...props } = params;
    await this.send(
      email,
      'Two-factor authentication enabled on your account',
      TwoFactorEnabled(props),
    );
  }

  // Sent on both initial withdrawal PIN setup and any later change.
  async sendWithdrawalPinChangedEmail(params: {
    email: string;
    name: string;
  }): Promise<void> {
    const { email, ...props } = params;
    await this.send(
      email,
      'Your withdrawal PIN was updated',
      WithdrawalPinChanged(props),
    );
  }

  // Sent from the User Management security-override actions
  // (admin-users.service.ts's resetTotp / resetWithdrawalPin).
  async sendSecurityResetByAdminEmail(params: {
    email: string;
    name: string;
    resetType: SecurityResetType;
    date: string;
  }): Promise<void> {
    const { email, ...props } = params;
    await this.send(
      email,
      'A security setting on your account was reset',
      SecurityResetByAdmin(props),
    );
  }

  // Sent when admin marks a support_threads row resolved.
  async sendSupportTicketResolvedEmail(params: {
    email: string;
    name: string;
    category: string;
  }): Promise<void> {
    const { email, ...props } = params;
    await this.send(
      email,
      'Your support ticket has been resolved',
      SupportTicketResolved(props),
    );
  }

  // Sent when a crypto withdrawal is created and skips straight to
  // 'processing' (product-rules.md rule 18b) - this is the user's actual
  // first notice for that withdrawal, not Withdrawal Requested.
  async sendCryptoWithdrawalProcessingEmail(params: {
    email: string;
    name: string;
    amount: string;
    asset: string;
  }): Promise<void> {
    const { email, ...props } = params;
    await this.send(
      email,
      'Your crypto withdrawal is on its way',
      CryptoWithdrawalProcessing(props),
    );
  }
}
