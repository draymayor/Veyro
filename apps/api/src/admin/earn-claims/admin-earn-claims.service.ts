import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

export interface AdminEarnClaimListItem {
  id: string;
  user_id: string;
  user_display_name: string | null;
  bonus_amount_usd: number;
  required_trade_volume_usd: number;
  status: string;
  claimed_at: string;
  expires_at: string;
  unlocked_at: string | null;
  paid_at: string | null;
  wallet_transaction_id: string | null;
}

interface ListFilters {
  status?: string;
}

// Admin visibility over the $50,000 Earn bonus pool (docs/database-schema.md's
// earn_bonus_claims section) - a plain read-only list, all state changes
// (claim/unlock/pay/expire) happen only through EarnService, never an
// admin action here.
@Injectable()
export class AdminEarnClaimsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async list(filters: ListFilters): Promise<AdminEarnClaimListItem[]> {
    const client = this.supabaseService.getClient();

    // Sweep any 'claimed' row that's quietly gone past its window before
    // listing, so the admin view never shows a stale 'claimed' badge for a
    // claim that's actually expired (check-on-access, same pattern as
    // EarnService.getStatus, just batched across every user here).
    await client
      .from('earn_bonus_claims')
      .update({ status: 'expired' })
      .eq('status', 'claimed')
      .lt('expires_at', new Date().toISOString());

    let query = client
      .from('earn_bonus_claims')
      .select(
        'id, user_id, bonus_amount_usd, required_trade_volume_usd, status, claimed_at, expires_at, unlocked_at, paid_at, wallet_transaction_id, ' +
          'users!earn_bonus_claims_user_id_fkey(display_name)',
      )
      .order('claimed_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as Record<string, unknown>[];

    return rows.map((row) => {
      const user = row.users as { display_name: string | null } | null;
      return {
        id: row.id as string,
        user_id: row.user_id as string,
        user_display_name: user?.display_name ?? null,
        bonus_amount_usd: Number(row.bonus_amount_usd),
        required_trade_volume_usd: Number(row.required_trade_volume_usd),
        status: row.status as string,
        claimed_at: row.claimed_at as string,
        expires_at: row.expires_at as string,
        unlocked_at: row.unlocked_at as string | null,
        paid_at: row.paid_at as string | null,
        wallet_transaction_id: row.wallet_transaction_id as string | null,
      };
    });
  }
}
