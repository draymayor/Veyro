import { Injectable } from '@nestjs/common';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';

export type ReferralRowStatus = 'pending' | 'success';

export interface ReferralTableRow {
  id: string;
  /** Same "User <8-char id>" format shown for a user elsewhere on admin
   * pages (docs/context.md's Referrals page section: a raw id, never the
   * referred user's email). */
  referredUserIdLabel: string;
  joinedAt: string;
  status: ReferralRowStatus;
  country: string | null;
}

// Backs the Referrals page's table (docs/context.md). Runs on the service-
// role client (like the admin services) rather than the request-scoped
// client get-summary.ts already uses, because the "referrals select own"
// RLS policy only covers the referrals table itself, the joined
// users.country column on the *referred* user's row is blocked by
// "users select own" (auth.uid() = id) for anyone but that user, so a
// plain RLS-scoped join would silently come back null. Every query below
// is still explicitly scoped to `referrer_id = user.id`, this user's own
// referrals only, service-role access is used for the join, not to widen
// what's returned.
@Injectable()
export class ReferralsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async table(user: User, status?: string): Promise<ReferralTableRow[]> {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('referrals')
      .select(
        'id, referred_id, bonus_paid_at, created_at, users!referrals_referred_id_fkey(country)',
      )
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as Record<string, unknown>[];

    let items: ReferralTableRow[] = rows.map((row) => {
      const referredUser = row.users as { country: string | null } | null;
      const referredId = row.referred_id as string;
      return {
        id: row.id as string,
        referredUserIdLabel: `User ${referredId.slice(0, 8)}`,
        joinedAt: row.created_at as string,
        status: row.bonus_paid_at ? 'success' : 'pending',
        country: referredUser?.country ?? null,
      };
    });

    if (status === 'pending' || status === 'success') {
      items = items.filter((item) => item.status === status);
    }

    return items;
  }
}
