import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { NotificationsService } from '../../notifications/notifications.service';

export interface AdminUserListItem {
  id: string;
  display_name: string | null;
  email: string | null;
  country: string | null;
  currency: string | null;
  kyc_status: string;
  account_status: string;
  withdrawals_suspended: boolean;
  created_at: string;
}

export interface AdminUserTrade {
  id: string;
  asset_type: string;
  status: string;
  gift_card_brand_name: string | null;
  crypto_asset_symbol: string | null;
  crypto_asset_network: string | null;
  asset_amount: number;
  quoted_payout: number;
  currency: string;
  created_at: string;
}

export interface AdminUserWithdrawal {
  id: string;
  amount: number;
  method: string;
  status: string;
  transaction_reference: string | null;
  created_at: string;
}

export interface AdminUserLedgerEntry {
  id: string;
  wallet_currency: string;
  trade_id: string | null;
  withdrawal_id: string | null;
  type: string;
  amount: number;
  balance_after: number;
  created_at: string;
}

export interface AdminUserDetail {
  id: string;
  display_name: string | null;
  email: string | null;
  country: string | null;
  currency: string | null;
  kyc_status: string;
  account_status: string;
  withdrawals_suspended: boolean;
  referral_code: string | null;
  referrer: {
    id: string;
    display_name: string | null;
    email: string | null;
  } | null;
  created_at: string;
  total_trading_volume: number;
  trades: AdminUserTrade[];
  withdrawals: AdminUserWithdrawal[];
  wallet_ledger: AdminUserLedgerEntry[];
}

interface ListFilters {
  search?: string;
  status?: string;
}

const VALID_ACCOUNT_STATUSES = ['active', 'restricted', 'banned'];

// User Management (docs/admin-guide.md): the one place admin can look up
// any user's full history, adjust account_status or withdrawals_suspended,
// and run the sensitive security-override actions (TOTP/PIN reset). None
// of these queries embed users(...) on trades/withdrawals - both already
// filtered to a single known user_id, so there's no ambiguous-relationship
// risk the way the Trade Review/Payout Processing list queries have.
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Security Reset by Support email (docs/email-templates.md #14), shared
  // by resetTotp and resetWithdrawalPin below. A failed send is
  // non-critical, the reset itself already succeeded.
  private async notifySecurityReset(
    userId: string,
    resetType: 'two_factor' | 'withdrawal_pin',
  ): Promise<void> {
    try {
      const [{ data: userRow }, emailByUserId] = await Promise.all([
        this.supabaseService
          .getClient()
          .from('users')
          .select('display_name')
          .eq('id', userId)
          .maybeSingle(),
        this.supabaseService.getUserEmailsByIds([userId]),
      ]);

      const email = emailByUserId.get(userId);
      if (!email) return;

      await this.notificationsService.sendSecurityResetByAdminEmail({
        email,
        name: (userRow?.display_name as string | null) ?? 'there',
        resetType,
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      });
    } catch {
      // Already logged by NotificationsService.send().
    }
  }

  async list(filters: ListFilters): Promise<AdminUserListItem[]> {
    const client = this.supabaseService.getClient();

    let query = client
      .from('users')
      .select(
        'id, display_name, country, currency, kyc_status, account_status, withdrawals_suspended, created_at',
      )
      .order('created_at', { ascending: false });

    if (filters.status) query = query.eq('account_status', filters.status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Record<string, unknown>[];
    const emailByUserId = await this.supabaseService.getUserEmailsByIds(
      rows.map((row) => row.id as string),
    );

    let items: AdminUserListItem[] = rows.map((row) => ({
      id: row.id as string,
      display_name: row.display_name as string | null,
      email: emailByUserId.get(row.id as string) ?? null,
      country: row.country as string | null,
      currency: row.currency as string | null,
      kyc_status: row.kyc_status as string,
      account_status: row.account_status as string,
      withdrawals_suspended: Boolean(row.withdrawals_suspended),
      created_at: row.created_at as string,
    }));

    // No full-text search index for this in V1, filtered in memory rather
    // than a DB query, name/email are the two things an admin actually
    // searches a user by.
    const search = filters.search?.trim().toLowerCase();
    if (search) {
      items = items.filter(
        (item) =>
          item.display_name?.toLowerCase().includes(search) ||
          item.email?.toLowerCase().includes(search) ||
          item.id.toLowerCase().includes(search),
      );
    }

    return items;
  }

  async detail(userId: string): Promise<AdminUserDetail> {
    const client = this.supabaseService.getClient();

    const { data: userRow, error } = await client
      .from('users')
      .select(
        'id, display_name, country, currency, kyc_status, account_status, withdrawals_suspended, referral_code, created_at',
      )
      .eq('id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!userRow) throw new NotFoundException('User not found.');

    const [tradesRes, withdrawalsRes, walletsRes, referralRes] =
      await Promise.all([
        client
          .from('trades')
          .select(
            'id, asset_type, status, asset_amount, quoted_payout, currency, created_at, gift_card_brands(name), crypto_assets(symbol, network)',
          )
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        client
          .from('withdrawals')
          .select(
            'id, amount, method, status, transaction_reference, created_at',
          )
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        client.from('wallets').select('id, currency').eq('user_id', userId),
        client
          .from('referrals')
          .select('referrer_id')
          .eq('referred_id', userId)
          .maybeSingle(),
      ]);

    if (tradesRes.error) throw new Error(tradesRes.error.message);
    if (withdrawalsRes.error) throw new Error(withdrawalsRes.error.message);
    if (walletsRes.error) throw new Error(walletsRes.error.message);

    const wallets = (walletsRes.data ?? []) as {
      id: string;
      currency: string;
    }[];
    const walletCurrencyById = new Map(wallets.map((w) => [w.id, w.currency]));
    const walletIds = wallets.map((w) => w.id);

    let ledger: AdminUserLedgerEntry[] = [];
    if (walletIds.length > 0) {
      const { data: txRows, error: txError } = await client
        .from('wallet_transactions')
        .select(
          'id, wallet_id, trade_id, withdrawal_id, type, amount, balance_after, created_at',
        )
        .in('wallet_id', walletIds)
        .order('created_at', { ascending: false });

      if (txError) throw new Error(txError.message);

      ledger = (txRows ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        wallet_currency: walletCurrencyById.get(row.wallet_id as string) ?? '',
        trade_id: row.trade_id as string | null,
        withdrawal_id: row.withdrawal_id as string | null,
        type: row.type as string,
        amount: Number(row.amount),
        balance_after: Number(row.balance_after),
        created_at: row.created_at as string,
      }));
    }

    let referrer: AdminUserDetail['referrer'] = null;
    const referrerId = referralRes.data?.referrer_id as string | undefined;
    if (referrerId) {
      const { data: referrerRow } = await client
        .from('users')
        .select('id, display_name')
        .eq('id', referrerId)
        .maybeSingle();

      if (referrerRow) {
        const referrerEmail = await this.supabaseService.getUserEmailsByIds([
          referrerRow.id as string,
        ]);
        referrer = {
          id: referrerRow.id as string,
          display_name: referrerRow.display_name as string | null,
          email: referrerEmail.get(referrerRow.id as string) ?? null,
        };
      }
    }

    const trades: AdminUserTrade[] = (
      (tradesRes.data ?? []) as Record<string, unknown>[]
    ).map((row) => {
      const brand = row.gift_card_brands as { name: string } | null;
      const asset = row.crypto_assets as {
        symbol: string;
        network: string;
      } | null;
      return {
        id: row.id as string,
        asset_type: row.asset_type as string,
        status: row.status as string,
        gift_card_brand_name: brand?.name ?? null,
        crypto_asset_symbol: asset?.symbol ?? null,
        crypto_asset_network: asset?.network ?? null,
        asset_amount: Number(row.asset_amount),
        quoted_payout: Number(row.quoted_payout),
        currency: row.currency as string,
        created_at: row.created_at as string,
      };
    });

    const withdrawals: AdminUserWithdrawal[] = (
      (withdrawalsRes.data ?? []) as Record<string, unknown>[]
    ).map((row) => ({
      id: row.id as string,
      amount: Number(row.amount),
      method: row.method as string,
      status: row.status as string,
      transaction_reference: row.transaction_reference as string | null,
      created_at: row.created_at as string,
    }));

    const emailByUserId = await this.supabaseService.getUserEmailsByIds([
      userId,
    ]);

    // "Trading history and total volume" (docs/admin-guide.md), same
    // definition the dashboard's todaysVolumeByCurrency already uses:
    // quoted_payout across all trades regardless of outcome, not just
    // completed ones. A user's own trades all share their wallet currency,
    // so a single total (not grouped) is meaningful here.
    const totalVolume = trades.reduce(
      (sum, trade) => sum + trade.quoted_payout,
      0,
    );

    return {
      id: userRow.id as string,
      display_name: userRow.display_name as string | null,
      email: emailByUserId.get(userId) ?? null,
      country: userRow.country as string | null,
      currency: userRow.currency as string | null,
      kyc_status: userRow.kyc_status as string,
      account_status: userRow.account_status as string,
      withdrawals_suspended: Boolean(userRow.withdrawals_suspended),
      referral_code: userRow.referral_code as string | null,
      referrer,
      created_at: userRow.created_at as string,
      total_trading_volume: totalVolume,
      trades,
      withdrawals,
      wallet_ledger: ledger,
    };
  }

  async setAccountStatus(adminId: string, userId: string, status: string) {
    if (!VALID_ACCOUNT_STATUSES.includes(status)) {
      throw new BadRequestException('Invalid account status.');
    }

    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('users')
      .update({ account_status: status })
      .eq('id', userId)
      .select('id')
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException('User not found.');

    await this.logAction(
      client,
      adminId,
      userId,
      'account_status_changed',
      `Set to ${status}`,
    );

    return { id: userId, account_status: status };
  }

  // Shared with the Payout Processing queue (docs/admin-guide.md: "same
  // underlying flag, two access points"), this is the one place the flag
  // actually gets written from either surface.
  async setWithdrawalsSuspended(
    adminId: string,
    userId: string,
    suspended: boolean,
  ) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('users')
      .update({ withdrawals_suspended: suspended })
      .eq('id', userId)
      .select('id')
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException('User not found.');

    await this.logAction(
      client,
      adminId,
      userId,
      suspended ? 'withdrawals_suspended' : 'withdrawals_unsuspended',
    );

    return { id: userId, withdrawals_suspended: suspended };
  }

  // Clears the user's TOTP factor(s) via the Supabase Auth admin API, same
  // mechanism AuthService.recoverWithBackupCode uses for self-service
  // recovery, just admin-triggered instead of backup-code-gated. A reason
  // is required and logged via admin_actions (docs/admin-guide.md: "this
  // is a sensitive action").
  async resetTotp(adminId: string, userId: string, reason: string) {
    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      throw new BadRequestException(
        "A reason is required to reset this user's TOTP enrollment.",
      );
    }

    const client = this.supabaseService.getClient();

    const { data: fullUser, error } =
      await client.auth.admin.getUserById(userId);
    if (error || !fullUser?.user) {
      throw new NotFoundException('User not found.');
    }

    const factors = fullUser.user.factors ?? [];
    for (const factor of factors) {
      await client.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
    }

    await this.logAction(client, adminId, userId, 'totp_reset', trimmedReason);
    await this.notifySecurityReset(userId, 'two_factor');

    return { id: userId, factorsCleared: factors.length };
  }

  // Clears withdrawal_pin_hash (and the related lockout bookkeeping) so the
  // user can set a fresh PIN, for the case where both TOTP recovery and the
  // email-based PIN-reset path have failed them. A reason is required and
  // logged via admin_actions, same as resetTotp.
  async resetWithdrawalPin(adminId: string, userId: string, reason: string) {
    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      throw new BadRequestException(
        "A reason is required to reset this user's withdrawal PIN.",
      );
    }

    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('users')
      .update({
        withdrawal_pin_hash: null,
        withdrawal_pin_set_at: null,
        withdrawal_pin_failed_attempts: 0,
        withdrawal_pin_locked_until: null,
      })
      .eq('id', userId)
      .select('id')
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException('User not found.');

    await this.logAction(
      client,
      adminId,
      userId,
      'withdrawal_pin_reset',
      trimmedReason,
    );
    await this.notifySecurityReset(userId, 'withdrawal_pin');

    return { id: userId, withdrawalPinReset: true };
  }

  private async logAction(
    client: ReturnType<SupabaseService['getClient']>,
    adminId: string,
    userId: string,
    actionType: string,
    notes?: string,
  ): Promise<void> {
    await client.from('admin_actions').insert({
      admin_id: adminId,
      action_type: actionType,
      target_id: userId,
      notes: notes ?? null,
    });
  }
}
