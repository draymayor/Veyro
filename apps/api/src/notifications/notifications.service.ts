import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as webpush from 'web-push';
import { withTimeout } from '../common/fetch-with-timeout';
import { SupabaseService } from '../supabase/supabase.service';
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
  ProviderHealthAlert,
  EarnBonusClaimed,
  EarnBonusUnlocked,
  ScoutApplicationApproved,
  ScoutDayApproved,
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

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));

    const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(
        'mailto:support@veyro.best',
        vapidPublicKey,
        vapidPrivateKey,
      );
    }
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

  // Ops alert (ProviderHealthService's alertTransition) - the first
  // internal/admin send in this file, everything above is user-facing.
  // Sent to a single admin address, not a per-user email; if
  // ADMIN_ALERT_EMAIL isn't configured this is skipped (logged, not
  // thrown) rather than blocking the health-tracking write that triggered
  // it, same "the real state-change already happened, the email is
  // best-effort" posture as every other notify-after-the-fact call site
  // in this codebase.
  async sendProviderHealthAlertEmail(params: {
    networkCode: string;
    provider: string;
    status: 'available' | 'unavailable';
    detail: string | null;
    occurredAt: string;
  }): Promise<void> {
    const adminEmail = this.configService.get<string>('ADMIN_ALERT_EMAIL');
    if (!adminEmail) {
      this.logger.warn(
        `ADMIN_ALERT_EMAIL not configured - skipping provider health alert for ${params.provider}/${params.networkCode} (${params.status}).`,
      );
      return;
    }
    await this.send(
      adminEmail,
      params.status === 'unavailable'
        ? `[Veyro] ${params.provider}/${params.networkCode} deposit detection is unavailable`
        : `[Veyro] ${params.provider}/${params.networkCode} deposit detection recovered`,
      ProviderHealthAlert(params),
    );
  }

  // Sent the instant a user claims an Earn bonus (EarnService.claim).
  async sendEarnBonusClaimedEmail(params: {
    email: string;
    name: string;
    bonusAmount: string;
    requiredVolume: string;
    expiryDays: number;
    referralLink: string;
    referralBonusAmount: string;
    earnUrl: string;
  }): Promise<void> {
    const { email, ...props } = params;
    await this.send(
      email,
      `You've claimed ${params.bonusAmount}!`,
      EarnBonusClaimed(props),
    );
  }

  // Sent from EarnService.payOutUnlockedBonus once the claim's required
  // trade volume is met and the wallet credit has landed.
  async sendEarnBonusUnlockedEmail(params: {
    email: string;
    name: string;
    bonusAmount: string;
    walletUrl: string;
  }): Promise<void> {
    const { email, ...props } = params;
    await this.send(
      email,
      'Bonus unlocked and credited',
      EarnBonusUnlocked(props),
    );
  }

  async sendScoutApplicationApprovedEmail(params: {
    email: string;
    name: string;
  }): Promise<void> {
    const { email, ...props } = params;
    const scoutUrl = `${this.webAppUrl()}/scout`;
    await this.send(
      email,
      "You're approved as a Veyro Scout",
      ScoutApplicationApproved({ ...props, scoutUrl }),
    );
  }

  async sendScoutDayApprovedEmail(params: {
    email: string;
    name: string;
    amount: string;
  }): Promise<void> {
    const { email, ...props } = params;
    const walletUrl = `${this.webAppUrl()}/assets`;
    await this.send(
      email,
      `${params.amount} credited for your Scout day`,
      ScoutDayApproved({ ...props, walletUrl }),
    );
  }

  async savePushSubscription(
    userId: string,
    subscription: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    },
  ): Promise<void> {
    const client = this.supabaseService.getClient();
    const { error } = await client.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: 'endpoint' },
    );
    if (error) throw new Error(error.message);
  }

  async deletePushSubscription(
    userId: string,
    endpoint: string,
  ): Promise<void> {
    const client = this.supabaseService.getClient();
    await client
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);
  }

  // Best-effort fan-out to every device a user has subscribed on. Never
  // throws - called alongside an in-app notification insert / email send
  // that has already committed by the time this runs, so a push failure
  // must not undo or fail whatever real event triggered it.
  async sendPushToUser(
    userId: string,
    payload: { title: string; body: string; url?: string },
  ): Promise<void> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);

    if (error || !data?.length) return;

    await Promise.all(
      (data as { endpoint: string; p256dh: string; auth: string }[]).map(
        async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              JSON.stringify(payload),
            );
          } catch (err) {
            const statusCode = (err as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
              // Subscription no longer exists on the push service (browser
              // uninstalled/reset it) - clean up rather than retrying forever.
              await client
                .from('push_subscriptions')
                .delete()
                .eq('endpoint', sub.endpoint);
            } else {
              this.logger.warn(
                `Push send failed for user ${userId}: ${err instanceof Error ? err.message : err}`,
              );
            }
          }
        },
      ),
    );
  }

  private webAppUrl(): string {
    return (
      this.configService.get<string>('WEB_APP_URL') ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
  }
}
