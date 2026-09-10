import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { WalletService } from '../../wallet/wallet.service';
import { FxRateService } from '../../fx/fx.service';
import { ScoutService } from '../../scout/scout.service';
import {
  SCOUT_SETTING_FALLBACKS,
  SCOUT_SETTING_KEYS,
} from '../../scout/scout.constants';

export interface AdminScoutDayListItem {
  id: string;
  user_id: string;
  user_display_name: string | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  payout_amount_usd: number | null;
  link_count: number;
}

interface ListFilters {
  status?: string;
}

// Scout Day Review queue (docs/database-schema.md's Careers / Scout program
// section, Part D2): admin reviews EACH LINK individually first, then
// approves/rejects the day as a whole. Day approval is the single event
// that credits the standard fiat wallet (WalletService.creditStandaloneWallet,
// the same shared primitive referral bonuses and Earn payouts use), labeled
// clearly as job-related so it never reads as an unexplained manual deposit.
@Injectable()
export class AdminScoutDaysService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly walletService: WalletService,
    private readonly fxRateService: FxRateService,
    private readonly scoutService: ScoutService,
  ) {}

  async list(filters: ListFilters): Promise<AdminScoutDayListItem[]> {
    const client = this.supabaseService.getClient();

    let query = client
      .from('scout_days')
      .select(
        'id, user_id, status, opened_at, closed_at, reviewed_at, rejection_reason, payout_amount_usd, ' +
          'users!scout_days_user_id_fkey(display_name), scout_link_submissions(id)',
      )
      .order('opened_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as Record<string, unknown>[];

    return rows.map((row) => {
      const user = row.users as { display_name: string | null } | null;
      const links = (row.scout_link_submissions as unknown[]) ?? [];
      return {
        id: row.id as string,
        user_id: row.user_id as string,
        user_display_name: user?.display_name ?? null,
        status: row.status as string,
        opened_at: row.opened_at as string,
        closed_at: row.closed_at as string | null,
        reviewed_at: row.reviewed_at as string | null,
        rejection_reason: row.rejection_reason as string | null,
        payout_amount_usd:
          row.payout_amount_usd !== null ? Number(row.payout_amount_usd) : null,
        link_count: links.length,
      };
    });
  }

  async detail(dayId: string) {
    const client = this.supabaseService.getClient();

    const { data: day, error } = await client
      .from('scout_days')
      .select('*, users!scout_days_user_id_fkey(display_name)')
      .eq('id', dayId)
      .maybeSingle<Record<string, unknown>>();

    if (error || !day) throw new NotFoundException('Scout day not found.');

    const { data: links } = await client
      .from('scout_link_submissions')
      .select(
        'id, url, platform, focus_tag, submitted_at, link_status, rejection_reason',
      )
      .eq('scout_day_id', dayId)
      .order('submitted_at', { ascending: true });

    const user = day.users as { display_name: string | null } | null;

    return {
      id: day.id as string,
      user_id: day.user_id as string,
      user_display_name: user?.display_name ?? null,
      status: day.status as string,
      opened_at: day.opened_at as string,
      closed_at: day.closed_at as string | null,
      reviewed_at: day.reviewed_at as string | null,
      rejection_reason: day.rejection_reason as string | null,
      payout_amount_usd:
        day.payout_amount_usd !== null ? Number(day.payout_amount_usd) : null,
      links: links ?? [],
    };
  }

  async reviewLink(
    adminId: string,
    dayId: string,
    linkId: string,
    action: 'approve' | 'reject',
    reason?: string,
  ) {
    const trimmedReason = reason?.trim();
    if (action === 'reject' && !trimmedReason) {
      throw new BadRequestException('A rejection reason is required.');
    }

    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('scout_link_submissions')
      .update({
        link_status: action === 'approve' ? 'approved' : 'rejected',
        rejection_reason: action === 'reject' ? trimmedReason : null,
      })
      .eq('id', linkId)
      .eq('scout_day_id', dayId)
      .eq('link_status', 'pending')
      .select('id, user_id')
      .maybeSingle<{ id: string; user_id: string }>();

    if (error) throw new Error(error.message);
    if (!data) {
      throw new ConflictException(
        'This link has already been reviewed or does not exist.',
      );
    }

    // Day-level approve/reject already notifies the scout (below); a single
    // rejected link within an otherwise-still-open day previously notified
    // no one, so a scout had no way to know a link needed replacing short
    // of the day eventually closing and showing up in their history.
    if (action === 'reject') {
      await client.from('notifications').insert({
        user_id: data.user_id,
        category: 'account',
        title: 'A submitted link was rejected',
        body: `One of your Scout links was rejected: ${trimmedReason}. The day stays open - submit another link to reach the required total.`,
      });
      await this.notificationsService.sendPushToUser(data.user_id, {
        title: 'A submitted link was rejected',
        body: trimmedReason ?? '',
        url: '/scout',
      });
    }

    await this.logAction(
      client,
      adminId,
      linkId,
      action === 'approve' ? 'scout_link_approved' : 'scout_link_rejected',
      trimmedReason,
    );

    // An approval can be the last of the two closing conditions to land
    // (the 24h window may have already elapsed while waiting on review) -
    // check right away instead of waiting on the periodic sweep.
    if (action === 'approve') {
      await this.scoutService.maybeCloseDay(client, dayId);
    }

    return {
      id: data.id,
      link_status: action === 'approve' ? 'approved' : 'rejected',
    };
  }

  async approveDay(adminId: string, dayId: string) {
    const client = this.supabaseService.getClient();

    const { data: links } = await client
      .from('scout_link_submissions')
      .select('link_status')
      .eq('scout_day_id', dayId);

    if (!links || links.length === 0) {
      throw new NotFoundException('Scout day not found.');
    }
    if (links.some((l) => l.link_status === 'pending')) {
      throw new BadRequestException(
        'Review every submitted link before deciding on the day.',
      );
    }

    const dailyRateUsd = await this.getSetting(
      client,
      SCOUT_SETTING_KEYS.dailyRateUsd,
      SCOUT_SETTING_FALLBACKS.dailyRateUsd,
    );

    const { data: dayRow, error } = await client
      .from('scout_days')
      .update({
        status: 'approved',
        payout_amount_usd: dailyRateUsd,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', dayId)
      .eq('status', 'pending_review')
      .select('id, user_id')
      .maybeSingle<{ id: string; user_id: string }>();

    if (error) throw new Error(error.message);
    if (!dayRow) {
      throw new ConflictException(
        'This day has already been resolved or does not exist.',
      );
    }

    const { data: user } = await client
      .from('users')
      .select('currency, display_name')
      .eq('id', dayRow.user_id)
      .maybeSingle<{ currency: string | null; display_name: string | null }>();

    if (!user?.currency) {
      // Shouldn't happen for a user who's completed onboarding; leave the
      // day approved with no credit rather than guessing a currency - same
      // fail-safe posture as EarnService.payOutUnlockedBonus.
      return { id: dayRow.id, status: 'approved', credited: false };
    }

    // Scout's daily rate is a flat USD figure (platform_settings), same as
    // Earn's bonus tiers - converted to the user's own wallet currency
    // (same FX pattern as EarnService.payOutUnlockedBonus, fail-open to
    // the raw USD figure if FX is unavailable rather than blocking a
    // payout that's already been earned) and credited via the shared
    // standalone credit primitive, clearly labeled via the
    // notification/email copy as Scout Program income, not a raw manual
    // deposit.
    let amountInUserCurrency = dailyRateUsd;
    try {
      const rate = await this.fxRateService.getRate(user.currency);
      amountInUserCurrency = dailyRateUsd * rate;
    } catch {
      // FX unavailable: credit the raw USD figure rather than blocking a
      // day that's already been approved.
    }

    const creditResult = await this.walletService.creditStandaloneWallet(
      client,
      dayRow.user_id,
      user.currency,
      amountInUserCurrency,
    );

    await client
      .from('scout_days')
      .update({ wallet_transaction_id: creditResult.walletTransactionId })
      .eq('id', dayRow.id);

    await this.logAction(client, adminId, dayId, 'scout_day_approved');

    await client.from('notifications').insert({
      user_id: dayRow.user_id,
      category: 'wallet',
      title: 'Scout day approved',
      body: `Your Scout day was approved. ${this.formatMoney(amountInUserCurrency, user.currency)} has been credited to your wallet as Scout Program income.`,
    });

    try {
      const emailByUserId = await this.supabaseService.getUserEmailsByIds([
        dayRow.user_id,
      ]);
      const email = emailByUserId.get(dayRow.user_id);
      if (email) {
        await this.notificationsService.sendScoutDayApprovedEmail({
          email,
          name: user.display_name ?? 'there',
          amount: this.formatMoney(amountInUserCurrency, user.currency),
        });
      }
    } catch {
      // The credit already succeeded; a failed email is non-critical.
    }

    await this.notificationsService.sendPushToUser(dayRow.user_id, {
      title: 'Scout day approved',
      body: `${this.formatMoney(amountInUserCurrency, user.currency)} has been credited to your wallet as Scout Program income.`,
      url: '/scout',
    });

    return { id: dayRow.id, status: 'approved', credited: true };
  }

  async rejectDay(adminId: string, dayId: string, reason: string) {
    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      throw new BadRequestException('A rejection reason is required.');
    }

    const client = this.supabaseService.getClient();

    const { data: links } = await client
      .from('scout_link_submissions')
      .select('link_status')
      .eq('scout_day_id', dayId);

    if (!links || links.length === 0) {
      throw new NotFoundException('Scout day not found.');
    }
    if (links.some((l) => l.link_status === 'pending')) {
      throw new BadRequestException(
        'Review every submitted link before deciding on the day.',
      );
    }

    const { data: dayRow, error } = await client
      .from('scout_days')
      .update({
        status: 'rejected',
        rejection_reason: trimmedReason,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', dayId)
      .eq('status', 'pending_review')
      .select('id, user_id')
      .maybeSingle<{ id: string; user_id: string }>();

    if (error) throw new Error(error.message);
    if (!dayRow) {
      throw new ConflictException(
        'This day has already been resolved or does not exist.',
      );
    }

    await this.logAction(
      client,
      adminId,
      dayId,
      'scout_day_rejected',
      trimmedReason,
    );

    await client.from('notifications').insert({
      user_id: dayRow.user_id,
      category: 'account',
      title: 'Scout day rejected',
      body: `Your Scout day was not approved: ${trimmedReason}. It does not count toward your 30-day total.`,
    });

    return { id: dayRow.id, status: 'rejected' };
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

  private async getSetting(
    client: ReturnType<SupabaseService['getClient']>,
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

  private async logAction(
    client: ReturnType<SupabaseService['getClient']>,
    adminId: string,
    targetId: string,
    actionType: string,
    notes?: string,
  ): Promise<void> {
    await client.from('admin_actions').insert({
      admin_id: adminId,
      action_type: actionType,
      target_id: targetId,
      notes: notes ?? null,
    });
  }
}
