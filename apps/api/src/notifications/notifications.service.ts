import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
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
  type TradeAssetType,
} from './emails/templates';

const OTP_EXPIRY_MINUTES = 10;
const FROM_ADDRESS = 'Veyro <noreply@veyro.com>';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  private async send(
    to: string,
    subject: string,
    template: ReactElement,
  ): Promise<void> {
    try {
      const [html, text] = await Promise.all([
        render(template),
        render(template, { plainText: true }),
      ]);

      await this.resend.emails.send({
        from: FROM_ADDRESS,
        to,
        subject,
        html,
        text,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send "${subject}" email to ${to}. Confirm RESEND_API_KEY is configured.`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }

  // Signup verification code. RESEND_API_KEY is not configured yet, so
  // calls will fail (logged, not thrown, since the OTP row still exists
  // and the user can request a resend once the key is set).
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

  // Password reset code. Same not-yet-configured RESEND_API_KEY caveat
  // applies here too.
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

  async sendWelcomeEmail(params: {
    email: string;
    name: string;
    getStartedUrl: string;
  }): Promise<void> {
    const { email, ...props } = params;
    await this.send(email, 'Welcome to Veyro', Welcome(props));
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
}
