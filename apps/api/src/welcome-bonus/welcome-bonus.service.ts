import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { CryptoWalletService } from '../crypto-wallet/crypto-wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BonusWithdrawalLockService } from '../bonuses/bonus-withdrawal-lock.service';

type SupabaseClientType = ReturnType<SupabaseService['getClient']>;

const WELCOME_BONUS_SYMBOL = 'USDT';

export interface WelcomeBonusClaimRow {
  id: string;
  user_id: string;
  bonus_amount_usd: number;
  required_deposit_usd: number;
  status: 'granted' | 'unlocked';
  granted_at: string;
  unlocked_at: string | null;
  wallet_transaction_id: string | null;
  crypto_wallet_transaction_id: string | null;
}

// Despite the column name (bonus_amount_usd, kept as-is so BonusReminderService's
// shared query against both earn_bonus_claims and welcome_bonus_claims doesn't
// need a per-table column name), this is a literal USDT amount for this table,
// credited straight to the user's USDT crypto wallet - see grantOnSignupComplete.
const WELCOME_BONUS_USDT_SETTING_KEY = 'welcome_bonus_usdt';
const WELCOME_BONUS_USDT_FALLBACK = 20;
const WELCOME_BONUS_REQUIRED_DEPOSIT_SETTING_KEY =
  'welcome_bonus_required_deposit_usd';
const WELCOME_BONUS_REQUIRED_DEPOSIT_FALLBACK = 50;

// 20 USDT credited directly to the user's real USDT crypto wallet the
// instant a signup completes (email verified, either path -
// AuthService.verifyOtp for email/password, AuthService.bootstrapOAuth for
// Google) - no FX conversion, this is real USDT, not a USD figure converted
// to the user's local fiat currency. Reuses the same locked-floor mechanic
// as every other bonus program (BonusWithdrawalLockService): credited
// immediately so the user sees it right away, but stays inside the
// withdrawal-time floor on that crypto wallet until the user deposits real
// crypto worth required_deposit_usd. One grant ever per user (unique
// user_id).
@Injectable()
export class WelcomeBonusService {
  private readonly logger = new Logger(WelcomeBonusService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly cryptoWalletService: CryptoWalletService,
    private readonly notificationsService: NotificationsService,
    private readonly bonusWithdrawalLockService: BonusWithdrawalLockService,
    private readonly configService: ConfigService,
  ) {}

  // Called right after email_verified_at is set on signup completion, in
  // the same non-critical try/catch-guarded block AuthService already uses
  // for sendWelcomeEmail - a failed grant here must never block signup.
  // Idempotent via welcome_bonus_claims' unique user_id: a duplicate call
  // (e.g. a returning user re-triggering verifyOtp somehow) becomes a
  // harmless no-op via the 23505 check below, never a second credit.
  async grantOnSignupComplete(userId: string): Promise<void> {
    const client = this.supabaseService.getClient();

    const { data: user } = await client
      .from('users')
      .select('currency, display_name')
      .eq('id', userId)
      .maybeSingle();

    if (!user?.currency) {
      // No wallet currency yet - shouldn't happen this early post-signup,
      // but fail open rather than block. A support/admin path can grant
      // this manually later; there's no automatic retry for a missed
      // grant.
      this.logger.warn(
        `Skipped welcome bonus grant for user ${userId}: no wallet currency set yet.`,
      );
      return;
    }

    const [bonusAmountUsdt, requiredDepositUsd] = await Promise.all([
      this.getSetting(
        client,
        WELCOME_BONUS_USDT_SETTING_KEY,
        WELCOME_BONUS_USDT_FALLBACK,
      ),
      this.getSetting(
        client,
        WELCOME_BONUS_REQUIRED_DEPOSIT_SETTING_KEY,
        WELCOME_BONUS_REQUIRED_DEPOSIT_FALLBACK,
      ),
    ]);

    const credit = await this.cryptoWalletService.creditWallet(
      client,
      userId,
      WELCOME_BONUS_SYMBOL,
      bonusAmountUsdt,
      'bonus_credit',
    );

    const { data: claim, error } = await client
      .from('welcome_bonus_claims')
      .insert({
        user_id: userId,
        bonus_amount_usd: bonusAmountUsdt,
        required_deposit_usd: requiredDepositUsd,
        crypto_wallet_transaction_id: credit.cryptoWalletTransactionId,
      })
      .select('*')
      .single<WelcomeBonusClaimRow>();

    if (error) {
      if (error.code === '23505') {
        // Already granted (unique user_id) - the wallet credit above just
        // ran a second time though, which would double-credit. This
        // shouldn't be reachable in practice (verifyOtp/bootstrapOAuth
        // only call this on the transition into email_verified_at, which
        // itself only fires once), logged loudly for investigation rather
        // than silently swallowed.
        this.logger.error(
          `Welcome bonus already granted for user ${userId} but a second credit of ${bonusAmountUsdt} ${WELCOME_BONUS_SYMBOL} was just applied - needs manual reconciliation.`,
        );
        return;
      }
      throw new Error(error.message);
    }

    await this.notifyGranted(client, claim, user.display_name as string | null);
  }

  // Mirrors EarnService.checkAndUnlockBonus - called from
  // DepositConfirmationService.claimAndCredit after a real deposit lands,
  // and can be called opportunistically elsewhere. No-op for a user with
  // no 'granted' row.
  async checkAndUnlockForUser(
    client: SupabaseClientType,
    userId: string,
  ): Promise<WelcomeBonusClaimRow | null> {
    const { data: claim } = await client
      .from('welcome_bonus_claims')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'granted')
      .maybeSingle<WelcomeBonusClaimRow>();

    if (!claim) return null;

    const depositVolumeUsd =
      await this.bonusWithdrawalLockService.computeDepositVolumeUsd(
        client,
        userId,
        claim.granted_at,
      );
    if (depositVolumeUsd < Number(claim.required_deposit_usd)) return claim;

    const { data: unlocked } = await client
      .from('welcome_bonus_claims')
      .update({ status: 'unlocked', unlocked_at: new Date().toISOString() })
      .eq('id', claim.id)
      .eq('status', 'granted')
      .select('*')
      .maybeSingle<WelcomeBonusClaimRow>();

    if (!unlocked) return claim;

    await this.notifyUnlocked(client, unlocked);
    return unlocked;
  }

  private async notifyGranted(
    client: SupabaseClientType,
    claim: WelcomeBonusClaimRow,
    displayName: string | null,
  ): Promise<void> {
    const bonusAmount = this.formatUsdt(Number(claim.bonus_amount_usd));
    const requiredDeposit = this.formatUsd(Number(claim.required_deposit_usd));

    await client.from('notifications').insert({
      user_id: claim.user_id,
      category: 'account',
      title: 'Welcome bonus credited',
      body: `Your ${bonusAmount} welcome bonus has been credited. Deposit ${requiredDeposit} or more in crypto to make it withdrawable.`,
    });

    try {
      const emailByUserId = await this.supabaseService.getUserEmailsByIds([
        claim.user_id,
      ]);
      const email = emailByUserId.get(claim.user_id);
      if (!email) return;

      await this.notificationsService.sendWelcomeBonusCreditedEmail({
        email,
        name: displayName ?? 'there',
        bonusAmount,
        requiredDeposit,
        walletUrl: `${this.webAppUrl()}/assets`,
      });
    } catch {
      // The claim row is already inserted and the wallet already credited;
      // a failed email is a non-critical side effect.
    }
  }

  private async notifyUnlocked(
    client: SupabaseClientType,
    claim: WelcomeBonusClaimRow,
  ): Promise<void> {
    const bonusUsd = Number(claim.bonus_amount_usd);

    await client.from('notifications').insert({
      user_id: claim.user_id,
      category: 'wallet',
      title: 'Welcome bonus unlocked',
      body: `Your ${this.formatUsd(bonusUsd)} welcome bonus is now withdrawable.`,
    });

    try {
      const { data: user } = await client
        .from('users')
        .select('display_name')
        .eq('id', claim.user_id)
        .maybeSingle();

      const emailByUserId = await this.supabaseService.getUserEmailsByIds([
        claim.user_id,
      ]);
      const email = emailByUserId.get(claim.user_id);
      if (!email) return;

      await this.notificationsService.sendEarnBonusUnlockedEmail({
        email,
        name: (user?.display_name as string | null) ?? 'there',
        bonusAmount: this.formatUsdt(bonusUsd),
        walletUrl: `${this.webAppUrl()}/assets`,
      });
    } catch {
      // Already unlocked above; a failed email is a non-critical side
      // effect.
    }
  }

  private async getSetting(
    client: SupabaseClientType,
    key: string,
    fallback: number,
  ): Promise<number> {
    const { data } = await client
      .from('platform_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    const parsed = data?.value !== undefined ? Number(data.value) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private formatUsd(amount: number): string {
    return this.formatMoney(amount, 'USD');
  }

  private formatUsdt(amount: number): string {
    return `${Math.round(amount).toLocaleString('en-US')} USDT`;
  }

  private formatMoney(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString('en-US')}`;
    }
  }

  private webAppUrl(): string {
    return (
      this.configService.get<string>('WEB_APP_URL') ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
  }
}
