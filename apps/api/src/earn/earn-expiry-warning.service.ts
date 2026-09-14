import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';

const WARNING_WINDOW_MS = 24 * 60 * 60 * 1000; // 1 day before expires_at

interface ExpiringClaimRow {
  id: string;
  user_id: string;
  bonus_amount_usd: number;
  required_trade_volume_usd: number;
}

/**
 * Sends the "your bonus expires tomorrow" reminder for a still-'claimed'
 * earn_bonus_claims row once it's within WARNING_WINDOW_MS of expires_at
 * (claims run on a 3-day window, so this lands at the end of day 2) -
 * same schedule-driven-poller pattern as DepositConfirmationService and
 * ProviderHealthService.runRecoveryProbes, for the same reason: a per-
 * claim timer wouldn't survive Cloud Run scaling to zero between ticks.
 *
 * expiry_warning_sent_at is the exactly-once guard, claimed with the same
 * "UPDATE ... WHERE still-null, only the caller whose UPDATE affects a
 * row proceeds" pattern DepositConfirmationService.claimAndCredit uses
 * against concurrent poller instances.
 */
@Injectable()
export class EarnExpiryWarningService {
  private readonly logger = new Logger(EarnExpiryWarningService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('*/15 * * * *')
  async run(): Promise<void> {
    const client = this.supabaseService.getClient();
    const nowIso = new Date().toISOString();
    const warnBeforeIso = new Date(
      Date.now() + WARNING_WINDOW_MS,
    ).toISOString();

    const { data: rows, error } = await client
      .from('earn_bonus_claims')
      .select('id, user_id, bonus_amount_usd, required_trade_volume_usd')
      .eq('status', 'claimed')
      .is('expiry_warning_sent_at', null)
      .gt('expires_at', nowIso)
      .lte('expires_at', warnBeforeIso);

    if (error) {
      this.logger.error(
        `Could not load claims due an expiry warning: ${error.message}`,
      );
      return;
    }

    for (const raw of (rows ?? []) as ExpiringClaimRow[]) {
      try {
        await this.warnOne(raw);
      } catch (err) {
        this.logger.error(
          `Expiry warning failed for claim ${raw.id}: ${(err as Error).message}`,
        );
      }
    }
  }

  private async warnOne(row: ExpiringClaimRow): Promise<void> {
    const client = this.supabaseService.getClient();

    // The actual serialization point against concurrent poller instances
    // and against this same claim unlocking between the select above and
    // now - only the caller whose UPDATE affects exactly 1 row sends the
    // email, and only while the claim is still genuinely 'claimed'.
    const { data: claimedForWarning, error: claimError } = await client
      .from('earn_bonus_claims')
      .update({ expiry_warning_sent_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('status', 'claimed')
      .is('expiry_warning_sent_at', null)
      .select('id');

    if (claimError) {
      this.logger.error(
        `Expiry-warning claim update failed for claim ${row.id}: ${claimError.message}`,
      );
      return;
    }
    if (!claimedForWarning || claimedForWarning.length === 0) {
      // Another instance's tick already claimed this one, or it unlocked
      // in the meantime - either way, nothing left for this run to do.
      return;
    }

    const { data: user } = await client
      .from('users')
      .select('display_name')
      .eq('id', row.user_id)
      .maybeSingle();

    const emailByUserId = await this.supabaseService.getUserEmailsByIds([
      row.user_id,
    ]);
    const email = emailByUserId.get(row.user_id);
    if (!email) return;

    try {
      await this.notificationsService.sendEarnBonusExpiringSoonEmail({
        email,
        name: (user?.display_name as string | null) ?? 'there',
        bonusAmount: this.formatUsdt(Number(row.bonus_amount_usd)),
        requiredVolume: this.formatUsd(Number(row.required_trade_volume_usd)),
        earnUrl: `${this.webAppUrl()}/earn`,
      });
    } catch (err) {
      // expiry_warning_sent_at is already set above - a failed send must
      // never re-trigger a retry loop that could double-send once the
      // underlying issue clears, same posture as every other notify-
      // after-the-fact call site in this codebase.
      this.logger.error(
        `Expiry warning email failed for claim ${row.id}: ${(err as Error).message}`,
      );
    }
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
