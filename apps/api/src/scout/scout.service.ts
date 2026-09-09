import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  SCOUT_PLATFORM_KEYS,
  SCOUT_SETTING_FALLBACKS,
  SCOUT_SETTING_KEYS,
  type ScoutPlatformKey,
} from './scout.constants';

type SupabaseClientType = ReturnType<SupabaseService['getClient']>;

export interface ScoutPlatformEntry {
  platform: ScoutPlatformKey;
  handle: string;
}

export interface ScoutApplyInput {
  fullName: string;
  platforms: ScoutPlatformEntry[];
  otherPlatform?: string;
  otherHandle?: string;
  motivation: string;
  canCommit: boolean | null;
  commitmentNote?: string;
}

export interface ScoutApplicationStatusResponse {
  status: 'not_applied' | 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  appliedAt: string | null;
}

export interface ScoutLinkSubmissionInput {
  url: string;
  platform?: string;
  focusTag?: 'recruit_scouts' | 'recruit_users' | null;
}

export interface ScoutWithdrawalLock {
  /** In the user's own wallet currency, not USD - see getWithdrawalLock. */
  lockedAmount: number;
  approvedDays: number;
  requiredDays: number;
}

const URL_PATTERN = /^https?:\/\/[^\s]+\.[^\s]+/i;

// Careers/Scout program (docs/database-schema.md's Careers / Scout program
// section). One "day" is submission-count based, not time based: it opens
// on a scout's first link submission and stays open across any number of
// real calendar days until scout_min_links_per_day submissions land, then
// closes to 'pending_review' for admin. 30 days means 30 APPROVED days
// specifically - a rejected day never counts and never reduces the total.
@Injectable()
export class ScoutService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getApplicationStatus(
    userId: string,
  ): Promise<ScoutApplicationStatusResponse> {
    const client = this.supabaseService.getClient();
    const { data } = await client
      .from('scout_applications')
      .select('status, rejection_reason, applied_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data) {
      return { status: 'not_applied', rejectionReason: null, appliedAt: null };
    }

    return {
      status: data.status as ScoutApplicationStatusResponse['status'],
      rejectionReason: data.rejection_reason as string | null,
      appliedAt: data.applied_at as string,
    };
  }

  async apply(userId: string, input: ScoutApplyInput) {
    const fullName = input.fullName?.trim();
    const motivation = input.motivation?.trim();
    const otherPlatform = input.otherPlatform?.trim();
    const otherHandle = input.otherHandle?.trim();
    const commitmentNote = input.commitmentNote?.trim();

    if (!fullName) {
      throw new BadRequestException('Full name is required.');
    }
    if (!motivation) {
      throw new BadRequestException(
        'Tell us why you want to do this and your posting style.',
      );
    }

    const platforms = (input.platforms ?? []).filter(
      (p) => p && SCOUT_PLATFORM_KEYS.includes(p.platform) && p.handle?.trim(),
    );
    const hasOther = !!otherPlatform && !!otherHandle;

    if (platforms.length === 0 && !hasOther) {
      throw new BadRequestException(
        'Select at least one platform and provide your handle.',
      );
    }

    const client = this.supabaseService.getClient();

    const { data: application, error } = await client
      .from('scout_applications')
      .insert({
        user_id: userId,
        full_name: fullName,
        platforms: platforms.map((p) => ({
          platform: p.platform,
          handle: p.handle.trim(),
        })),
        other_platform: hasOther ? otherPlatform : null,
        other_handle: hasOther ? otherHandle : null,
        motivation,
        can_commit: input.canCommit,
        commitment_note: commitmentNote || null,
      })
      .select('id, status, applied_at')
      .single();

    if (error) {
      // 23505 = unique_violation on scout_applications_user_id_key - the
      // real one-application-ever-per-user enforcement (no reapply flow;
      // matches the schema's UNIQUE(user_id) constraint).
      if (error.code === '23505') {
        throw new ConflictException('You have already applied.');
      }
      throw new Error(error.message);
    }

    await client.from('notifications').insert({
      user_id: userId,
      category: 'account',
      title: 'Scout application received',
      body: "We've received your Scout application. We'll let you know once it's been reviewed.",
    });

    return application;
  }

  // Guard used by ScoutController for every dashboard/submission route:
  // approved scouts only (docs/database-schema.md: "only visible to users
  // with an approved scout_applications row").
  async assertApprovedScout(userId: string): Promise<void> {
    const client = this.supabaseService.getClient();
    const { data } = await client
      .from('scout_applications')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();

    if (data?.status !== 'approved') {
      throw new ForbiddenException('Scout access required.');
    }
  }

  async getDashboard(userId: string) {
    const client = this.supabaseService.getClient();

    const [requiredDays, minLinksPerDay, maxPendingDays, dailyRateUsd] =
      await Promise.all([
        this.getSetting(
          client,
          SCOUT_SETTING_KEYS.requiredPaidDays,
          SCOUT_SETTING_FALLBACKS.requiredPaidDays,
        ),
        this.getSetting(
          client,
          SCOUT_SETTING_KEYS.minLinksPerDay,
          SCOUT_SETTING_FALLBACKS.minLinksPerDay,
        ),
        this.getSetting(
          client,
          SCOUT_SETTING_KEYS.maxPendingDaysBeforeBlock,
          SCOUT_SETTING_FALLBACKS.maxPendingDaysBeforeBlock,
        ),
        this.getSetting(
          client,
          SCOUT_SETTING_KEYS.dailyRateUsd,
          SCOUT_SETTING_FALLBACKS.dailyRateUsd,
        ),
      ]);

    const { count: approvedDays } = await client
      .from('scout_days')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'approved');

    const { count: pendingDays } = await client
      .from('scout_days')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending_review');

    const { data: currentDay } = await client
      .from('scout_days')
      .select('id, opened_at')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .maybeSingle<{ id: string; opened_at: string }>();

    let currentDayLinkCount = 0;
    if (currentDay) {
      const { count } = await client
        .from('scout_link_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('scout_day_id', currentDay.id);
      currentDayLinkCount = count ?? 0;
    }

    const { data: pastDaysRaw } = await client
      .from('scout_days')
      .select(
        'id, status, opened_at, closed_at, reviewed_at, rejection_reason, payout_amount_usd',
      )
      .eq('user_id', userId)
      .neq('status', 'in_progress')
      .order('opened_at', { ascending: false });

    const pastDays = await Promise.all(
      (pastDaysRaw ?? []).map(async (day) => {
        const { data: links } = await client
          .from('scout_link_submissions')
          .select('id, url, platform, focus_tag, link_status, rejection_reason')
          .eq('scout_day_id', day.id)
          .order('submitted_at', { ascending: true });
        return { ...day, links: links ?? [] };
      }),
    );

    return {
      minLinksPerDay,
      dailyRateUsd,
      approvedDays: approvedDays ?? 0,
      requiredDays,
      pendingDays: pendingDays ?? 0,
      maxPendingDays,
      blocked: (pendingDays ?? 0) >= maxPendingDays,
      currentDay: currentDay
        ? {
            id: currentDay.id,
            openedAt: currentDay.opened_at,
            linkCount: currentDayLinkCount,
          }
        : null,
      pastDays,
    };
  }

  async submitLink(userId: string, input: ScoutLinkSubmissionInput) {
    const url = input.url?.trim();
    if (!url || !URL_PATTERN.test(url)) {
      throw new BadRequestException(
        'Enter a valid link (starting with http:// or https://).',
      );
    }
    if (
      input.focusTag &&
      !['recruit_scouts', 'recruit_users'].includes(input.focusTag)
    ) {
      throw new BadRequestException('Invalid focus tag.');
    }

    const client = this.supabaseService.getClient();

    const maxPendingDays = await this.getSetting(
      client,
      SCOUT_SETTING_KEYS.maxPendingDaysBeforeBlock,
      SCOUT_SETTING_FALLBACKS.maxPendingDaysBeforeBlock,
    );
    const { count: pendingDays } = await client
      .from('scout_days')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending_review');

    if ((pendingDays ?? 0) >= maxPendingDays) {
      throw new BadRequestException(
        `Veyro needs to review your existing ${pendingDays} completed days before you can start a new one.`,
      );
    }

    let { data: day } = await client
      .from('scout_days')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .maybeSingle<{ id: string }>();

    if (!day) {
      const { data: created, error: createError } = await client
        .from('scout_days')
        .insert({ user_id: userId, status: 'in_progress' })
        .select('id')
        .single();

      if (createError || !created) {
        throw new Error('Could not open a new scout day.');
      }
      day = created;
    }

    const { error: insertError } = await client
      .from('scout_link_submissions')
      .insert({
        scout_day_id: day.id,
        user_id: userId,
        url,
        platform: input.platform?.trim() || null,
        focus_tag: input.focusTag ?? null,
      });

    if (insertError) throw new Error(insertError.message);

    const minLinksPerDay = await this.getSetting(
      client,
      SCOUT_SETTING_KEYS.minLinksPerDay,
      SCOUT_SETTING_FALLBACKS.minLinksPerDay,
    );
    const { count: linkCount } = await client
      .from('scout_link_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('scout_day_id', day.id);

    let closed = false;
    if ((linkCount ?? 0) >= minLinksPerDay) {
      const { data: closedDay } = await client
        .from('scout_days')
        .update({
          status: 'pending_review',
          closed_at: new Date().toISOString(),
        })
        .eq('id', day.id)
        .eq('status', 'in_progress')
        .select('id')
        .maybeSingle<{ id: string }>();

      if (closedDay) {
        closed = true;
        await client.from('notifications').insert({
          user_id: userId,
          category: 'account',
          title: 'Scout day submitted for review',
          body: `You've submitted ${linkCount} links. This day is now pending Veyro's review.`,
        });
      }
    }

    return { dayId: day.id, linkCount: linkCount ?? 0, closed };
  }

  // The withdrawal-lock "floor" mechanic (docs/database-schema.md): the
  // amount of the current fiat balance that must stay in the wallet until
  // the user has 30 APPROVED scout days is exactly the total ever paid out
  // via approved scout_days, capped at whatever's actually in the wallet
  // right now. Recomputed live on every call rather than tracked as a
  // running counter, so it can never drift out of sync with reality no
  // matter what sequence of unrelated deposits/withdrawals happened.
  // Returns null once graduated (>= requiredDays) or if nothing was ever
  // earned via Scout, meaning no lock applies at all.
  //
  // Summed from wallet_transactions.amount (via each approved day's linked
  // wallet_transaction_id), NOT scout_days.payout_amount_usd - the latter
  // is always the raw USD rate (240), but the wallet balance being checked
  // against is in the user's own wallet currency, and the ledger row holds
  // the actually-credited, already-converted amount.
  async getWithdrawalLock(
    client: SupabaseClientType,
    userId: string,
  ): Promise<ScoutWithdrawalLock | null> {
    const requiredDays = await this.getSetting(
      client,
      SCOUT_SETTING_KEYS.requiredPaidDays,
      SCOUT_SETTING_FALLBACKS.requiredPaidDays,
    );

    const { data: approvedRows } = await client
      .from('scout_days')
      .select('wallet_transaction_id')
      .eq('user_id', userId)
      .eq('status', 'approved');

    const approvedDays = approvedRows?.length ?? 0;
    if (approvedDays >= requiredDays) return null;

    const walletTransactionIds = (approvedRows ?? [])
      .map((row) => row.wallet_transaction_id as string | null)
      .filter((id): id is string => !!id);

    if (walletTransactionIds.length === 0) return null;

    const { data: ledgerRows } = await client
      .from('wallet_transactions')
      .select('amount')
      .in('id', walletTransactionIds);

    const lockedAmount = (ledgerRows ?? []).reduce(
      (sum, row) => sum + Number(row.amount ?? 0),
      0,
    );
    if (lockedAmount <= 0) return null;

    return { lockedAmount, approvedDays, requiredDays };
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
}
