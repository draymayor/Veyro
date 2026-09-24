import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';

const REMINDER_1_DELAY_MS = 2 * 24 * 60 * 60 * 1000; // 2 days after claim/grant
const REMINDER_2_DELAY_MS = 4 * 24 * 60 * 60 * 1000; // 2 more days after that

interface ReminderRow {
  id: string;
  user_id: string;
  bonus_amount_usd: number;
  required_deposit_usd: number;
}

type ReminderTarget = 'earn' | 'welcome';

/**
 * Replaces EarnExpiryWarningService: neither bonus program expires
 * anymore once claimed/granted (docs/database-schema.md) - a still-locked
 * claim just gets reminded twice (2 days in, then 2 more days after that)
 * and then goes quiet for good, no forfeiture. Same schedule-driven-poller
 * pattern as EarnExpiryWarningService/DepositConfirmationService (a per-
 * claim timer wouldn't survive Cloud Run scaling to zero between ticks),
 * and the same "UPDATE ... WHERE still-null, only the caller whose UPDATE
 * affects a row proceeds" exactly-once guard for each reminder slot.
 */
@Injectable()
export class BonusReminderService {
  private readonly logger = new Logger(BonusReminderService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('*/15 * * * *')
  async run(): Promise<void> {
    await this.runFor('earn', 'earn_bonus_claims', 'claimed', 'claimed_at');
    await this.runFor(
      'welcome',
      'welcome_bonus_claims',
      'granted',
      'granted_at',
    );
  }

  private async runFor(
    target: ReminderTarget,
    table: 'earn_bonus_claims' | 'welcome_bonus_claims',
    lockedStatus: string,
    anchorColumn: 'claimed_at' | 'granted_at',
  ): Promise<void> {
    const client = this.supabaseService.getClient();
    const nowIso = new Date().toISOString();

    // Reminder 1: still locked, anchor >= 2 days old, not yet sent.
    const reminder1CutoffIso = new Date(
      Date.now() - REMINDER_1_DELAY_MS,
    ).toISOString();
    const { data: dueForFirst, error: firstError } = await client
      .from(table)
      .select('id, user_id, bonus_amount_usd, required_deposit_usd')
      .eq('status', lockedStatus)
      .is('reminder_1_sent_at', null)
      .lte(anchorColumn, reminder1CutoffIso);

    if (firstError) {
      this.logger.error(
        `Could not load ${target} claims due a first reminder: ${firstError.message}`,
      );
    } else {
      for (const raw of (dueForFirst ?? []) as ReminderRow[]) {
        await this.sendOne(target, table, raw, 'reminder_1_sent_at', nowIso);
      }
    }

    // Reminder 2: still locked, anchor >= 4 days old, first already sent,
    // second not yet sent.
    const reminder2CutoffIso = new Date(
      Date.now() - REMINDER_2_DELAY_MS,
    ).toISOString();
    const { data: dueForSecond, error: secondError } = await client
      .from(table)
      .select('id, user_id, bonus_amount_usd, required_deposit_usd')
      .eq('status', lockedStatus)
      .not('reminder_1_sent_at', 'is', null)
      .is('reminder_2_sent_at', null)
      .lte(anchorColumn, reminder2CutoffIso);

    if (secondError) {
      this.logger.error(
        `Could not load ${target} claims due a second reminder: ${secondError.message}`,
      );
      return;
    }

    for (const raw of (dueForSecond ?? []) as ReminderRow[]) {
      await this.sendOne(target, table, raw, 'reminder_2_sent_at', nowIso);
    }
  }

  private async sendOne(
    target: ReminderTarget,
    table: 'earn_bonus_claims' | 'welcome_bonus_claims',
    row: ReminderRow,
    column: 'reminder_1_sent_at' | 'reminder_2_sent_at',
    nowIso: string,
  ): Promise<void> {
    const client = this.supabaseService.getClient();

    // The real serialization point against concurrent poller instances
    // and against this same claim unlocking between the select above and
    // now - only the caller whose UPDATE affects exactly 1 row sends the
    // email.
    const { data: claimedForReminder, error: claimError } = await client
      .from(table)
      .update({ [column]: nowIso })
      .eq('id', row.id)
      .is(column, null)
      .select('id');

    if (claimError) {
      this.logger.error(
        `Reminder claim update failed for ${target} claim ${row.id}: ${claimError.message}`,
      );
      return;
    }
    if (!claimedForReminder || claimedForReminder.length === 0) {
      // Another instance's tick already claimed this slot, or it unlocked
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
      await this.notificationsService.sendBonusDepositReminderEmail({
        email,
        name: (user?.display_name as string | null) ?? 'there',
        bonusAmount: this.formatUsdt(Number(row.bonus_amount_usd)),
        requiredDeposit: this.formatUsd(Number(row.required_deposit_usd)),
        walletUrl: `${this.webAppUrl()}/assets`,
      });
    } catch (err) {
      // The reminder_*_sent_at flag is already set above - a failed send
      // must never re-trigger a retry loop that could double-send once
      // the underlying issue clears, same posture as every other notify-
      // after-the-fact call site in this codebase.
      this.logger.error(
        `Reminder email failed for ${target} claim ${row.id}: ${(err as Error).message}`,
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
