import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { FxRateService } from '../fx/fx.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface EarnBonusTier {
  bonusAmountUsd: number;
  requiredTradeVolumeUsd: number;
}

export interface EarnClaimRow {
  id: string;
  user_id: string;
  bonus_amount_usd: number;
  required_trade_volume_usd: number;
  status: 'claimed' | 'unlocked' | 'paid' | 'expired';
  claimed_at: string;
  expires_at: string;
  unlocked_at: string | null;
  paid_at: string | null;
  wallet_transaction_id: string | null;
}

export interface EarnStatusResponse {
  claim: EarnClaimRow | null;
  tiers: EarnBonusTier[];
  tradeVolumeUsd: number | null;
  poolTotalUsd: number;
  poolRemainingUsd: number;
}

const REFERRAL_BONUS_SETTING_KEY = 'referral_bonus_usd';
const REFERRAL_BONUS_FALLBACK_USD = 10;
const CLAIM_WINDOW_DAYS = 3;
const EARN_POOL_TOTAL_SETTING_KEY = 'earn_pool_total_usd';
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
const EARN_TIER_SETTING_KEYS = {
  tier1BonusUsd: 'earn_tier1_bonus_usd',
  tier1RequiredVolumeUsd: 'earn_tier1_required_volume_usd',
  tier2BonusUsd: 'earn_tier2_bonus_usd',
  tier2RequiredVolumeUsd: 'earn_tier2_required_volume_usd',
} as const;

const EARN_TIER_FALLBACKS = {
  tier1BonusUsd: 50,
  tier1RequiredVolumeUsd: 100,
  tier2BonusUsd: 100,
  tier2RequiredVolumeUsd: 150,
};

// Earn page bonus program. The one hard rule this whole file exists to
// enforce (docs/database-schema.md): a claim only ever turns into money
// once the user has generated required_trade_volume_usd in REAL trading
// volume (an approved gift card trade or a completed crypto sell
// conversion) after claiming - never on deposit alone. That's what closes
// the claim-deposit-withdraw drain the original design would have allowed.
@Injectable()
export class EarnService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly fxRateService: FxRateService,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  async getStatus(userId: string): Promise<EarnStatusResponse> {
    const client = this.supabaseService.getClient();
    const tiers = await this.getBonusTiers(client);
    const { poolTotalUsd, poolRemainingUsd } =
      await this.getPoolBalance(client);

    const { data: existing } = await client
      .from('earn_bonus_claims')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle<EarnClaimRow>();

    if (!existing) {
      return {
        claim: null,
        tiers,
        tradeVolumeUsd: null,
        poolTotalUsd,
        poolRemainingUsd,
      };
    }

    // Check-on-access: a claim that's quietly gone past its 3-day window,
    // or that only now qualifies on volume, gets synced the moment the
    // user opens the page, not just when a trade happens to complete.
    const current =
      existing.status === 'claimed'
        ? await this.checkAndUnlockBonus(client, userId)
        : existing;

    const tradeVolumeUsd =
      current && current.status === 'claimed'
        ? await this.computeTradeVolumeUsd(client, userId, current.claimed_at)
        : (current?.required_trade_volume_usd ?? null);

    return {
      claim: current ?? existing,
      tiers,
      tradeVolumeUsd,
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

    const { data: claim, error } = await client
      .from('earn_bonus_claims')
      .insert({
        user_id: userId,
        bonus_amount_usd: tier.bonusAmountUsd,
        required_trade_volume_usd: tier.requiredTradeVolumeUsd,
      })
      .select('*')
      .single<EarnClaimRow>();

    if (error) {
      // 23505 = unique_violation on earn_bonus_claims_user_id_key, the
      // real one-claim-per-user-ever enforcement. The frontend also checks
      // this before ever calling here, but that only covers the common
      // case, not a race between two concurrent claim requests.
      if (error.code === '23505') {
        throw new ConflictException('You have already claimed an Earn bonus.');
      }
      throw new Error(error.message);
    }

    await this.notifyClaimed(client, claim);

    const { poolTotalUsd, poolRemainingUsd } =
      await this.getPoolBalance(client);

    return { claim, tiers, tradeVolumeUsd: 0, poolTotalUsd, poolRemainingUsd };
  }

  // Display-only figure for the Earn page's big pool card: the pool is
  // denominated and settled in USD internally (every claim, unlock and
  // payout above works in USD), this only relabels it as USDT for the
  // user-facing "$X of $50,000 USDT pool remaining" copy since the pool is
  // actually funded in USDT - it does not change how amounts are computed
  // or stored. "Remaining" = the admin-set total (platform_settings,
  // read live like the tier amounts) minus every bonus_amount_usd already
  // paid out (status = 'paid', i.e. real wallet_transactions credits) -
  // claimed-but-not-yet-unlocked amounts aren't real money out yet, so
  // they don't reduce the balance shown here.
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

    const { data: paidClaims } = await client
      .from('earn_bonus_claims')
      .select('bonus_amount_usd')
      .eq('status', 'paid');

    const paidOutUsd = (paidClaims ?? []).reduce(
      (sum, row) => sum + Number(row.bonus_amount_usd),
      0,
    );

    return {
      poolTotalUsd,
      poolRemainingUsd: Math.max(0, poolTotalUsd - paidOutUsd),
    };
  }

  // Reads the four admin-editable tier settings live (Rate Management's
  // Platform Settings section) rather than caching them, same "always
  // current" posture as computeTradeVolumeUsd - a rate change here should
  // never lag on either the Earn page or a claim request. A row missing
  // from platform_settings (or holding a non-positive value) falls back to
  // the original fixed tier so a partially-seeded environment still works.
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
        requiredTradeVolumeUsd: numberOr(
          EARN_TIER_SETTING_KEYS.tier1RequiredVolumeUsd,
          EARN_TIER_FALLBACKS.tier1RequiredVolumeUsd,
        ),
      },
      {
        bonusAmountUsd: numberOr(
          EARN_TIER_SETTING_KEYS.tier2BonusUsd,
          EARN_TIER_FALLBACKS.tier2BonusUsd,
        ),
        requiredTradeVolumeUsd: numberOr(
          EARN_TIER_SETTING_KEYS.tier2RequiredVolumeUsd,
          EARN_TIER_FALLBACKS.tier2RequiredVolumeUsd,
        ),
      },
    ];
  }

  // The one place a trade completion (gift card approval or crypto sell
  // conversion) turns into an unlocked/paid Earn bonus. Called from
  // AdminTradesService.approve() and TradesService.sellCrypto() right
  // after each credits the user's wallet for the trade itself - a no-op
  // for a user with no 'claimed' row, which is the overwhelmingly common
  // case, so this must stay cheap.
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

    const nowIso = new Date().toISOString();

    if (claim.expires_at <= nowIso) {
      const { data: expired } = await client
        .from('earn_bonus_claims')
        .update({ status: 'expired' })
        .eq('id', claim.id)
        .eq('status', 'claimed')
        .select('*')
        .maybeSingle<EarnClaimRow>();
      return expired ?? claim;
    }

    const volumeUsd = await this.computeTradeVolumeUsd(
      client,
      userId,
      claim.claimed_at,
    );
    if (volumeUsd < Number(claim.required_trade_volume_usd)) return claim;

    // Atomic claimed -> unlocked, re-checking expires_at in the same
    // WHERE clause: guards the exact race the product spec calls out
    // (volume only clears the bar after the window closed must never pay
    // out), and doubles as the concurrency guard against two trade
    // completions unlocking/paying the same bonus twice.
    const { data: unlocked } = await client
      .from('earn_bonus_claims')
      .update({ status: 'unlocked', unlocked_at: nowIso })
      .eq('id', claim.id)
      .eq('status', 'claimed')
      .gt('expires_at', nowIso)
      .select('*')
      .maybeSingle<EarnClaimRow>();

    if (!unlocked) return claim;

    return this.payOutUnlockedBonus(client, unlocked);
  }

  private async payOutUnlockedBonus(
    client: ReturnType<SupabaseService['getClient']>,
    claim: EarnClaimRow,
  ): Promise<EarnClaimRow> {
    const { data: user } = await client
      .from('users')
      .select('id, currency, display_name')
      .eq('id', claim.user_id)
      .maybeSingle();

    // No wallet currency yet (shouldn't happen for a user who's already
    // completed a real trade) - leave the row 'unlocked' rather than
    // guessing a currency; a support/admin path can reconcile this
    // manually, same posture as the referrer-currency check in
    // AdminTradesService.creditReferralBonusIfEligible.
    if (!user?.currency) return claim;

    const bonusUsd = Number(claim.bonus_amount_usd);
    let amountInUserCurrency = bonusUsd;
    try {
      const rate = await this.fxRateService.getRate(user.currency);
      amountInUserCurrency = bonusUsd * rate;
    } catch {
      // FX unavailable: credit the raw USD figure rather than blocking a
      // bonus that's already been earned, same fail-open posture as
      // creditReferralBonusIfEligible.
    }

    const creditResult = await this.walletService.creditStandaloneWallet(
      client,
      claim.user_id,
      user.currency,
      amountInUserCurrency,
    );

    const { data: paid } = await client
      .from('earn_bonus_claims')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        wallet_transaction_id: creditResult.walletTransactionId,
      })
      .eq('id', claim.id)
      .eq('status', 'unlocked')
      .select('*')
      .maybeSingle<EarnClaimRow>();

    const finalClaim = paid ?? claim;

    await client.from('notifications').insert({
      user_id: claim.user_id,
      category: 'wallet',
      title: 'Earn bonus unlocked and credited',
      body: `Your ${this.formatUsd(bonusUsd)} Earn bonus has been credited to your wallet.`,
    });

    try {
      const emailByUserId = await this.supabaseService.getUserEmailsByIds([
        claim.user_id,
      ]);
      const email = emailByUserId.get(claim.user_id);
      if (email) {
        const webAppUrl = this.webAppUrl();
        await this.notificationsService.sendEarnBonusUnlockedEmail({
          email,
          name: (user.display_name as string | null) ?? 'there',
          bonusAmount: this.formatMoney(amountInUserCurrency, user.currency),
          walletUrl: `${webAppUrl}/assets`,
        });
      }
    } catch {
      // The bonus is already credited and the claim row already flipped
      // above; a failed email is a non-critical side effect, must not
      // fail whatever trade-completion request triggered this.
    }

    return finalClaim;
  }

  private async notifyClaimed(
    client: ReturnType<SupabaseService['getClient']>,
    claim: EarnClaimRow,
  ): Promise<void> {
    const bonusAmount = this.formatUsd(Number(claim.bonus_amount_usd));
    const bonusAmountUsdt = this.formatUsdt(Number(claim.bonus_amount_usd));
    const requiredVolume = this.formatUsd(
      Number(claim.required_trade_volume_usd),
    );

    await client.from('notifications').insert({
      user_id: claim.user_id,
      category: 'account',
      title: 'Bonus claimed',
      body: `You've claimed a ${bonusAmount} Earn bonus. Sell ${requiredVolume} or more in gift cards or crypto on Veyro within ${CLAIM_WINDOW_DAYS} days to unlock it.`,
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
        bonusAmount: bonusAmountUsdt,
        requiredVolume,
        expiryDays: CLAIM_WINDOW_DAYS,
        referralLink,
        referralBonusAmount: this.formatUsd(referralBonusUsd),
        earnUrl: `${webAppUrl}/earn`,
      });
    } catch {
      // The claim row is already inserted; a failed email is a
      // non-critical side effect and must not fail the claim request.
    }
  }

  // Sums quoted_payout across every real, completed trade (gift card
  // 'approved' or crypto sell 'paid' - see docs/database-schema.md's
  // trades.status list, gift cards never move past 'approved') created
  // since the claim, converted to USD. Deliberately re-queried live each
  // time rather than cached: cheap (one query per user), and always
  // reflects the true current volume.
  private async computeTradeVolumeUsd(
    client: ReturnType<SupabaseService['getClient']>,
    userId: string,
    sinceIso: string,
  ): Promise<number> {
    const { data: trades } = await client
      .from('trades')
      .select('quoted_payout, currency')
      .eq('user_id', userId)
      .in('status', ['approved', 'paid'])
      .gte('created_at', sinceIso);

    if (!trades?.length) return 0;

    let totalUsd = 0;
    for (const trade of trades as {
      quoted_payout: number;
      currency: string;
    }[]) {
      const amount = Number(trade.quoted_payout);
      if (trade.currency === 'USD') {
        totalUsd += amount;
        continue;
      }
      try {
        const rate = await this.fxRateService.getRate(trade.currency);
        totalUsd += amount / rate;
      } catch {
        // FX unavailable for this currency right now: skip it from this
        // pass rather than guessing. Conservative in the safe direction -
        // this can only delay an unlock, never trigger one early, and
        // gets re-evaluated on the next trade completion or page load.
      }
    }
    return totalUsd;
  }

  private formatUsd(amount: number): string {
    return this.formatMoney(amount, 'USD');
  }

  // Display-only relabel matching the web app's Earn page - the amount is
  // still USD under the hood (bonus_amount_usd), this just shows it as USDT.
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
