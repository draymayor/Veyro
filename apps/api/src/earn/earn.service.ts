import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { CryptoWalletService } from '../crypto-wallet/crypto-wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BonusWithdrawalLockService } from '../bonuses/bonus-withdrawal-lock.service';

const EARN_BONUS_SYMBOL = 'USDT';

export interface EarnBonusTier {
  bonusAmountUsd: number;
  requiredDepositUsd: number;
}

export interface EarnClaimRow {
  id: string;
  user_id: string;
  bonus_amount_usd: number;
  required_deposit_usd: number;
  status: 'claimed' | 'unlocked' | 'paid' | 'expired';
  claimed_at: string;
  expires_at: string;
  unlocked_at: string | null;
  paid_at: string | null;
  wallet_transaction_id: string | null;
  crypto_wallet_transaction_id: string | null;
}

export interface EarnStatusResponse {
  claim: EarnClaimRow | null;
  tiers: EarnBonusTier[];
  depositVolumeUsd: number | null;
  poolTotalUsd: number;
  poolRemainingUsd: number;
}

const REFERRAL_BONUS_SETTING_KEY = 'referral_bonus_usd';
const REFERRAL_BONUS_FALLBACK_USD = 10;
const EARN_POOL_TOTAL_SETTING_KEY = 'earn_pool_total_usdt';
const EARN_POOL_TOTAL_FALLBACK_USD = 50000;

// The two options shown on the Earn page (docs/database-schema.md's
// earn_bonus_claims section) - admin-tunable platform_settings, same
// pattern as referral_bonus_usd, editable from Rate Management's Platform
// Settings section. earn_bonus_claims' CHECK constraints only require a
// positive amount now (see the earn_tiers_admin_editable migration), so any
// admin-set value here is a legal claim row. Each fallback below is only
// ever used for a row that's genuinely missing from platform_settings
// (never happens once the seed migration has run) - it matches the
// original fixed tiers so behavior is unchanged until an admin edits them.
// The setting KEYS still say "volume" for historical reasons (unchanged by
// the deposit-unlock migration) - their meaning is now "required deposit".
const EARN_TIER_SETTING_KEYS = {
  tier1BonusUsd: 'earn_tier1_bonus_usdt',
  tier1RequiredDepositUsd: 'earn_tier1_required_volume_usd',
  tier2BonusUsd: 'earn_tier2_bonus_usdt',
  tier2RequiredDepositUsd: 'earn_tier2_required_volume_usd',
} as const;

const EARN_TIER_FALLBACKS = {
  tier1BonusUsd: 50,
  tier1RequiredDepositUsd: 100,
  tier2BonusUsd: 100,
  tier2RequiredDepositUsd: 150,
};

// Earn page bonus program. The one hard rule this whole file exists to
// enforce (docs/database-schema.md): a claim is credited to the wallet
// immediately (so the user sees it right away), but stays inside the
// withdrawal-time "locked floor" (BonusWithdrawalLockService, same
// mechanic Scout already proved out) until the user has deposited real
// crypto worth required_deposit_usd - never on a gift-card/trade-volume
// substitute, since that's what closes the claim-deposit-withdraw drain
// the original design would have allowed. Claiming once never expires
// (BonusReminderService just reminds at day 2 and day 4, then stops).
@Injectable()
export class EarnService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly cryptoWalletService: CryptoWalletService,
    private readonly notificationsService: NotificationsService,
    private readonly bonusWithdrawalLockService: BonusWithdrawalLockService,
    private readonly configService: ConfigService,
  ) {}

  async getStatus(userId: string): Promise<EarnStatusResponse> {
    const client = this.supabaseService.getClient();
    const tiers = await this.getBonusTiers(client);
    const { poolTotalUsd, poolRemainingUsd } =
      await this.getPoolBalance(client);

    // A user can now hold more than one row over time (a historical claim
    // that resolved to 'expired'/'paid' under the old design doesn't block
    // a new one - earn_bonus_claims_one_active_per_user only blocks
    // 'claimed'/'unlocked'), so this is no longer a maybeSingle() lookup -
    // only the most recent row is ever "the" claim for display purposes.
    const { data: existing } = await client
      .from('earn_bonus_claims')
      .select('*')
      .eq('user_id', userId)
      .order('claimed_at', { ascending: false })
      .limit(1)
      .maybeSingle<EarnClaimRow>();

    if (!existing) {
      return {
        claim: null,
        tiers,
        depositVolumeUsd: null,
        poolTotalUsd,
        poolRemainingUsd,
      };
    }

    // Check-on-access: a claim that only now qualifies on deposit volume
    // gets synced the moment the user opens the page, not just when a
    // deposit happens to get confirmed.
    const current =
      existing.status === 'claimed'
        ? await this.checkAndUnlockBonus(client, userId)
        : existing;

    // A historical 'expired' claim (pre-dating this design) reads exactly
    // like "no claim" to the frontend - same two-option selection a
    // first-time user sees.
    if (current?.status === 'expired') {
      return {
        claim: null,
        tiers,
        depositVolumeUsd: null,
        poolTotalUsd,
        poolRemainingUsd,
      };
    }

    const depositVolumeUsd =
      current && current.status === 'claimed'
        ? await this.bonusWithdrawalLockService.computeDepositVolumeUsd(
            client,
            userId,
            current.claimed_at,
          )
        : (current?.required_deposit_usd ?? null);

    return {
      claim: current ?? existing,
      tiers,
      depositVolumeUsd,
      poolTotalUsd,
      poolRemainingUsd,
    };
  }

  async claim(
    userId: string,
    bonusAmountUsd: number,
  ): Promise<EarnStatusResponse> {
    const client = this.supabaseService.getClient();
    const tiers = await this.getBonusTiers(client);
    const tier = tiers.find((t) => t.bonusAmountUsd === bonusAmountUsd);
    if (!tier) {
      throw new BadRequestException('Invalid bonus option.');
    }

    const credit = await this.cryptoWalletService.creditWallet(
      client,
      userId,
      EARN_BONUS_SYMBOL,
      tier.bonusAmountUsd,
      'bonus_credit',
    );

    const { data: claim, error } = await client
      .from('earn_bonus_claims')
      .insert({
        user_id: userId,
        bonus_amount_usd: tier.bonusAmountUsd,
        required_deposit_usd: tier.requiredDepositUsd,
        crypto_wallet_transaction_id: credit.cryptoWalletTransactionId,
      })
      .select('*')
      .single<EarnClaimRow>();

    if (error) {
      // 23505 = unique_violation on earn_bonus_claims_one_active_per_user,
      // the real one-active-claim-per-user enforcement. The frontend also
      // checks this before ever calling here, but that only covers the
      // common case, not a race between two concurrent claim requests.
      if (error.code === '23505') {
        throw new ConflictException(
          'You already have an active Earn bonus claim.',
        );
      }
      throw new Error(error.message);
    }

    await this.notifyClaimed(client, claim);

    const { poolTotalUsd, poolRemainingUsd } =
      await this.getPoolBalance(client);

    return {
      claim,
      tiers,
      depositVolumeUsd: 0,
      poolTotalUsd,
      poolRemainingUsd,
    };
  }

  // Display-only figure for the Earn page's big pool card. The pool and
  // every claim now genuinely settle in USDT (earn_pool_total_usdt,
  // bonus_amount_usd on each claim - see claim() above), no FX conversion
  // or relabeling involved. "Remaining" = the admin-set total
  // (platform_settings, read live like the tier amounts) minus every
  // bonus_amount_usd already claimed (status in 'claimed'/'unlocked' - the
  // money is credited at claim time now, not at unlock).
  private async getPoolBalance(
    client: ReturnType<SupabaseService['getClient']>,
  ): Promise<{ poolTotalUsd: number; poolRemainingUsd: number }> {
    const { data: settingRow } = await client
      .from('platform_settings')
      .select('value')
      .eq('key', EARN_POOL_TOTAL_SETTING_KEY)
      .maybeSingle();
    const parsedTotal = settingRow?.value ? Number(settingRow.value) : NaN;
    const poolTotalUsd =
      Number.isFinite(parsedTotal) && parsedTotal > 0
        ? parsedTotal
        : EARN_POOL_TOTAL_FALLBACK_USD;

    const { data: claimedClaims } = await client
      .from('earn_bonus_claims')
      .select('bonus_amount_usd')
      .in('status', ['claimed', 'unlocked', 'paid']);

    const claimedUsd = (claimedClaims ?? []).reduce(
      (sum, row) => sum + Number(row.bonus_amount_usd),
      0,
    );

    return {
      poolTotalUsd,
      poolRemainingUsd: Math.max(0, poolTotalUsd - claimedUsd),
    };
  }

  // Reads the four admin-editable tier settings live (Rate Management's
  // Platform Settings section) rather than caching them, same "always
  // current" posture as computeDepositVolumeUsd - a rate change here
  // should never lag on either the Earn page or a claim request. A row
  // missing from platform_settings (or holding a non-positive value) falls
  // back to the original fixed tier so a partially-seeded environment
  // still works.
  private async getBonusTiers(
    client: ReturnType<SupabaseService['getClient']>,
  ): Promise<EarnBonusTier[]> {
    const keys = Object.values(EARN_TIER_SETTING_KEYS);
    const { data } = await client
      .from('platform_settings')
      .select('key, value')
      .in('key', keys);

    const byKey = new Map(
      (data ?? []).map((row) => [row.key as string, row.value as string]),
    );
    const numberOr = (key: string, fallback: number): number => {
      const raw = byKey.get(key);
      const parsed = raw !== undefined ? Number(raw) : NaN;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    };

    return [
      {
        bonusAmountUsd: numberOr(
          EARN_TIER_SETTING_KEYS.tier1BonusUsd,
          EARN_TIER_FALLBACKS.tier1BonusUsd,
        ),
        requiredDepositUsd: numberOr(
          EARN_TIER_SETTING_KEYS.tier1RequiredDepositUsd,
          EARN_TIER_FALLBACKS.tier1RequiredDepositUsd,
        ),
      },
      {
        bonusAmountUsd: numberOr(
          EARN_TIER_SETTING_KEYS.tier2BonusUsd,
          EARN_TIER_FALLBACKS.tier2BonusUsd,
        ),
        requiredDepositUsd: numberOr(
          EARN_TIER_SETTING_KEYS.tier2RequiredDepositUsd,
          EARN_TIER_FALLBACKS.tier2RequiredDepositUsd,
        ),
      },
    ];
  }

  // The one place a confirmed crypto deposit turns a 'claimed' Earn bonus
  // into 'unlocked' (withdrawable). Called from
  // DepositConfirmationService.claimAndCredit right after a deposit lands,
  // and opportunistically from getStatus() - a no-op for a user with no
  // 'claimed' row, which is the overwhelmingly common case, so this must
  // stay cheap. The wallet was already credited at claim() time - this
  // only lifts the withdrawal-lock floor and notifies, it never moves
  // money itself.
  async checkAndUnlockBonus(
    client: ReturnType<SupabaseService['getClient']>,
    userId: string,
  ): Promise<EarnClaimRow | null> {
    const { data: claim } = await client
      .from('earn_bonus_claims')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'claimed')
      .maybeSingle<EarnClaimRow>();

    if (!claim) return null;

    const depositVolumeUsd =
      await this.bonusWithdrawalLockService.computeDepositVolumeUsd(
        client,
        userId,
        claim.claimed_at,
      );
    if (depositVolumeUsd < Number(claim.required_deposit_usd)) return claim;

    // Atomic claimed -> unlocked - doubles as the concurrency guard
    // against two deposit confirmations unlocking the same bonus twice.
    const { data: unlocked } = await client
      .from('earn_bonus_claims')
      .update({ status: 'unlocked', unlocked_at: new Date().toISOString() })
      .eq('id', claim.id)
      .eq('status', 'claimed')
      .select('*')
      .maybeSingle<EarnClaimRow>();

    if (!unlocked) return claim;

    await this.notifyUnlocked(client, unlocked);
    return unlocked;
  }

  private async notifyUnlocked(
    client: ReturnType<SupabaseService['getClient']>,
    claim: EarnClaimRow,
  ): Promise<void> {
    const bonusUsd = Number(claim.bonus_amount_usd);

    await client.from('notifications').insert({
      user_id: claim.user_id,
      category: 'wallet',
      title: 'Earn bonus unlocked',
      body: `Your ${this.formatUsd(bonusUsd)} Earn bonus is now withdrawable.`,
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
      // The claim row is already flipped to 'unlocked' above; a failed
      // email is a non-critical side effect and must not fail whatever
      // deposit-confirmation request triggered this.
    }
  }

  private async notifyClaimed(
    client: ReturnType<SupabaseService['getClient']>,
    claim: EarnClaimRow,
  ): Promise<void> {
    const bonusAmount = this.formatUsdt(Number(claim.bonus_amount_usd));
    const requiredDeposit = this.formatUsd(Number(claim.required_deposit_usd));

    await client.from('notifications').insert({
      user_id: claim.user_id,
      category: 'account',
      title: 'Bonus claimed',
      body: `You've claimed a ${bonusAmount} Earn bonus. Deposit ${requiredDeposit} or more in crypto to make it withdrawable.`,
    });

    try {
      const { data: user } = await client
        .from('users')
        .select('display_name, referral_code')
        .eq('id', claim.user_id)
        .maybeSingle();

      const { data: setting } = await client
        .from('platform_settings')
        .select('value')
        .eq('key', REFERRAL_BONUS_SETTING_KEY)
        .maybeSingle();
      const referralBonusUsd = setting?.value
        ? Number(setting.value)
        : REFERRAL_BONUS_FALLBACK_USD;

      const emailByUserId = await this.supabaseService.getUserEmailsByIds([
        claim.user_id,
      ]);
      const email = emailByUserId.get(claim.user_id);
      if (!email) return;

      const webAppUrl = this.webAppUrl();
      const referralCode = user?.referral_code as string | null | undefined;
      const referralLink = referralCode
        ? `${webAppUrl}/signup?ref=${referralCode}`
        : webAppUrl;

      await this.notificationsService.sendEarnBonusClaimedEmail({
        email,
        name: (user?.display_name as string | null) ?? 'there',
        bonusAmount,
        requiredDeposit,
        referralLink,
        referralBonusAmount: this.formatUsd(referralBonusUsd),
        earnUrl: `${webAppUrl}/earn`,
      });
    } catch {
      // The claim row is already inserted; a failed email is a
      // non-critical side effect and must not fail the claim request.
    }
  }

  private formatUsd(amount: number): string {
    return this.formatMoney(amount, 'USD');
  }

  // bonus_amount_usd is a literal USDT amount (column name kept as-is so
  // BonusReminderService's shared query works across both bonus tables).
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
