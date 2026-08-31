import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../supabase/supabase.service';
import { FxRateService } from '../../fx/fx.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { WalletService } from '../../wallet/wallet.service';

export interface AdminTradeListItem {
  id: string;
  user_id: string;
  user_display_name: string | null;
  asset_type: string;
  status: string;
  card_type: string | null;
  card_country: string | null;
  gift_card_brand_name: string | null;
  crypto_asset_symbol: string | null;
  crypto_asset_network: string | null;
  asset_amount: number;
  rate_value: number;
  quoted_payout: number;
  currency: string;
  fraud_flagged: boolean;
  fraud_flag_reason: string | null;
  fraud_flag_ref_trade_id: string | null;
  created_at: string;
}

interface ListFilters {
  status?: string;
  assetType?: string;
}

interface TradeActionRow {
  id: string;
  user_id: string;
  asset_type: string;
  quoted_payout: number;
  currency: string;
}

const TRADE_FILE_BUCKETS: Record<string, string> = {
  card_image: 'card-images',
  receipt: 'receipts',
  deposit_proof_screenshot: 'deposit-proofs',
};

const SIGNED_URL_TTL_SECONDS = 60 * 10;

const REFERRAL_BONUS_SETTING_KEY = 'referral_bonus_usd';
const REFERRAL_BONUS_FALLBACK_USD = 10;

// A trade can only be actioned while it hasn't already reached a resolved
// state. Used as a conditional WHERE clause on the approve/reject update
// itself (not a separate read-then-write check), so it also doubles as the
// guard against a double-click or two admins actioning the same trade at
// once: whichever request's UPDATE actually matches a row wins, the other
// gets back no row and a 409.
const ACTIONABLE_STATUSES = [
  'submitted',
  'under_review',
  'awaiting_deposit_confirmation',
  'disputed',
];

// Trade Review queue (docs/admin-guide.md): one queue, filterable by
// status/asset type, gift card trades show the fraud flag set by the
// duplicate-detection checks in TradesService so a matching submission is
// never silently missed by a reviewer. Approve/Reject both live here too:
// per product-rules.md rules 7-8, approval is the single event that
// creates the wallet_transactions ledger entry, there is no separate
// manual "credit wallet" step anywhere else in the codebase.
@Injectable()
export class AdminTradesService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly fxRateService: FxRateService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
  ) {}

  // trades has two foreign keys into users (user_id and reviewed_by), so an
  // unqualified users(...) embed is ambiguous to PostgREST and errors on
  // every call regardless of row count (PGRST201) - the actual cause of
  // the Trade Review page's "Couldn't load trades" error, not an
  // empty-result issue. users!trades_user_id_fkey(...) picks the owner
  // relationship explicitly.
  async list(filters: ListFilters): Promise<AdminTradeListItem[]> {
    const client = this.supabaseService.getClient();

    let query = client
      .from('trades')
      .select(
        'id, user_id, asset_type, status, card_type, card_country, asset_amount, rate_value, quoted_payout, currency, fraud_flagged, fraud_flag_reason, fraud_flag_ref_trade_id, created_at, ' +
          'users!trades_user_id_fkey(display_name), gift_card_brands(name), crypto_assets(symbol, network)',
      )
      .order('created_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.assetType) query = query.eq('asset_type', filters.assetType);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as Record<string, unknown>[];

    return rows.map((row) => {
      const user = row.users as { display_name: string | null } | null;
      const brand = row.gift_card_brands as { name: string } | null;
      const asset = row.crypto_assets as {
        symbol: string;
        network: string;
      } | null;

      return {
        id: row.id as string,
        user_id: row.user_id as string,
        user_display_name: user?.display_name ?? null,
        asset_type: row.asset_type as string,
        status: row.status as string,
        card_type: row.card_type as string | null,
        card_country: row.card_country as string | null,
        gift_card_brand_name: brand?.name ?? null,
        crypto_asset_symbol: asset?.symbol ?? null,
        crypto_asset_network: asset?.network ?? null,
        asset_amount: Number(row.asset_amount),
        rate_value: Number(row.rate_value),
        quoted_payout: Number(row.quoted_payout),
        currency: row.currency as string,
        fraud_flagged: Boolean(row.fraud_flagged),
        fraud_flag_reason: row.fraud_flag_reason as string | null,
        fraud_flag_ref_trade_id: row.fraud_flag_ref_trade_id as string | null,
        created_at: row.created_at as string,
      };
    });
  }

  async detail(tradeId: string) {
    const client = this.supabaseService.getClient();

    const { data: trade, error } = await client
      .from('trades')
      .select(
        '*, users!trades_user_id_fkey(display_name), gift_card_brands(name), crypto_assets(symbol, network)',
      )
      .eq('id', tradeId)
      .maybeSingle<Record<string, unknown>>();

    if (error || !trade) {
      throw new NotFoundException('Trade not found.');
    }

    const { data: files } = await client
      .from('trade_files')
      .select('id, file_type, storage_path, image_phash, created_at')
      .eq('trade_id', tradeId);

    const filesWithUrls = await Promise.all(
      (files ?? []).map(async (file: Record<string, unknown>) => {
        const bucket =
          TRADE_FILE_BUCKETS[file.file_type as string] ?? 'card-images';
        const { data: signed } = await client.storage
          .from(bucket)
          .createSignedUrl(file.storage_path as string, SIGNED_URL_TTL_SECONDS);
        return { ...file, signedUrl: signed?.signedUrl ?? null };
      }),
    );

    const emailByUserId = await this.supabaseService.getUserEmailsByIds([
      trade.user_id as string,
    ]);

    const row = trade;
    const user = row.users as { display_name: string | null } | null;
    const brand = row.gift_card_brands as { name: string } | null;
    const asset = row.crypto_assets as {
      symbol: string;
      network: string;
    } | null;

    return {
      id: row.id as string,
      user_id: row.user_id as string,
      user_display_name: user?.display_name ?? null,
      user_email: emailByUserId.get(row.user_id as string) ?? null,
      asset_type: row.asset_type as string,
      status: row.status as string,
      rejection_reason: row.rejection_reason as string | null,
      rate_value: Number(row.rate_value),
      asset_amount: Number(row.asset_amount),
      quoted_payout: Number(row.quoted_payout),
      currency: row.currency as string,
      gift_card_brand_id: row.gift_card_brand_id as string | null,
      gift_card_brand_name: brand?.name ?? null,
      card_country: row.card_country as string | null,
      card_type: row.card_type as string | null,
      card_code: row.card_code as string | null,
      card_pin: row.card_pin as string | null,
      crypto_asset_id: row.crypto_asset_id as string | null,
      crypto_asset_symbol: asset?.symbol ?? null,
      crypto_asset_network: asset?.network ?? null,
      tx_hash: row.tx_hash as string | null,
      fraud_flagged: Boolean(row.fraud_flagged),
      fraud_flag_reason: row.fraud_flag_reason as string | null,
      fraud_flag_ref_trade_id: row.fraud_flag_ref_trade_id as string | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      reviewed_by: row.reviewed_by as string | null,
      reviewed_at: row.reviewed_at as string | null,
      files: filesWithUrls,
    };
  }

  async approve(adminId: string, tradeId: string) {
    const client = this.supabaseService.getClient();

    const { data: tradeData, error } = await client
      .from('trades')
      .update({
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tradeId)
      .in('status', ACTIONABLE_STATUSES)
      .select('id, user_id, asset_type, quoted_payout, currency')
      .maybeSingle<TradeActionRow>();

    if (error) throw new Error(error.message);
    if (!tradeData) {
      throw new ConflictException(
        'This trade has already been resolved or does not exist.',
      );
    }

    const approvedTrade = tradeData;
    await this.creditWallet(client, approvedTrade);
    await this.notify(
      client,
      approvedTrade.user_id,
      'Trade approved',
      `Your ${approvedTrade.asset_type === 'gift_card' ? 'gift card' : 'crypto'} trade was approved. ${this.formatMoney(approvedTrade.quoted_payout, approvedTrade.currency)} has been added to your wallet.`,
      tradeId,
    );
    await this.creditReferralBonusIfEligible(
      client,
      approvedTrade.user_id,
      tradeId,
    );

    return { id: approvedTrade.id, status: 'approved' };
  }

  async reject(adminId: string, tradeId: string, reason: string) {
    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      throw new BadRequestException('A rejection reason is required.');
    }

    const client = this.supabaseService.getClient();

    const { data: tradeData, error } = await client
      .from('trades')
      .update({
        status: 'rejected',
        rejection_reason: trimmedReason,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tradeId)
      .in('status', ACTIONABLE_STATUSES)
      .select('id, user_id')
      .maybeSingle<{ id: string; user_id: string }>();

    if (error) throw new Error(error.message);
    if (!tradeData) {
      throw new ConflictException(
        'This trade has already been resolved or does not exist.',
      );
    }

    const rejectedTrade = tradeData;
    await this.notify(
      client,
      rejectedTrade.user_id,
      'Trade rejected',
      `Your trade was rejected: ${trimmedReason}`,
      tradeId,
    );

    return { id: rejectedTrade.id, status: 'rejected' };
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

  // The one place a trade's approval turns into an actual ledger entry
  // (product-rules.md rules 7-8, 11-12): finds or creates this user's
  // wallet for the trade's currency, appends a wallet_transactions credit
  // row, then updates the wallet's cached balance to match. wallets.balance
  // is never written to directly outside of this reconciliation step.
  private async creditWallet(
    client: ReturnType<SupabaseService['getClient']>,
    trade: TradeActionRow,
  ): Promise<void> {
    const amount = Number(trade.quoted_payout);

    let { data: wallet } = await client
      .from('wallets')
      .select('id, balance')
      .eq('user_id', trade.user_id)
      .eq('currency', trade.currency)
      .maybeSingle();

    if (!wallet) {
      const { data: created, error: createError } = await client
        .from('wallets')
        .insert({
          user_id: trade.user_id,
          currency: trade.currency,
          balance: 0,
        })
        .select('id, balance')
        .single();

      if (createError || !created) {
        throw new Error('Could not create a wallet to credit.');
      }
      wallet = created;
    }

    const newBalance = Number(wallet.balance) + amount;

    const { error: ledgerError } = await client
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        trade_id: trade.id,
        type: 'credit',
        amount,
        balance_after: newBalance,
      });

    if (ledgerError) throw new Error(ledgerError.message);

    const { error: balanceError } = await client
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);

    if (balanceError) throw new Error(balanceError.message);
  }

  private async notify(
    client: ReturnType<SupabaseService['getClient']>,
    userId: string,
    title: string,
    body: string,
    tradeId: string,
  ): Promise<void> {
    await client.from('notifications').insert({
      user_id: userId,
      category: 'trades',
      title,
      body,
      related_trade_id: tradeId,
    });
  }

  // Referral bonus trigger (docs/product-rules.md, docs/context.md's
  // Referrals page section): fires only when the trade just approved above
  // is the referred user's FIRST approved trade (their first real
  // deposit), matching the "eligible once the referred user makes a
  // deposit" copy shown on the Referrals page. Every other approved trade
  // for a user with an already-resolved (or nonexistent) referral is a
  // silent no-op, this is not an error path.
  private async creditReferralBonusIfEligible(
    client: ReturnType<SupabaseService['getClient']>,
    referredUserId: string,
    approvedTradeId: string,
  ): Promise<void> {
    const { data: priorApproved } = await client
      .from('trades')
      .select('id')
      .eq('user_id', referredUserId)
      .eq('status', 'approved')
      .neq('id', approvedTradeId)
      .limit(1)
      .maybeSingle();

    // Any other already-approved trade means this isn't the user's first,
    // the bonus (if any) was already credited when that one was approved.
    if (priorApproved) return;

    const { data: referral } = await client
      .from('referrals')
      .select('id, referrer_id')
      .eq('referred_id', referredUserId)
      .is('bonus_paid_at', null)
      .maybeSingle();

    // No referrer, or this referral was somehow already paid.
    if (!referral) return;

    const { data: setting } = await client
      .from('platform_settings')
      .select('value')
      .eq('key', REFERRAL_BONUS_SETTING_KEY)
      .maybeSingle();

    const bonusUsd = setting?.value
      ? Number(setting.value)
      : REFERRAL_BONUS_FALLBACK_USD;
    if (!Number.isFinite(bonusUsd) || bonusUsd <= 0) return;

    const { data: referrer } = await client
      .from('users')
      .select('id, currency, display_name')
      .eq('id', referral.referrer_id)
      .maybeSingle();

    // A referrer with no wallet currency yet (shouldn't happen once
    // signup is complete, but defends against a mid-onboarding edge case)
    // can't be credited; leave the referral unpaid rather than guessing.
    if (!referrer?.currency) return;

    let bonusInReferrerCurrency = bonusUsd;
    try {
      const rate = await this.fxRateService.getRate(referrer.currency);
      bonusInReferrerCurrency = bonusUsd * rate;
    } catch {
      // FX unavailable: credit the raw USD figure in the referrer's wallet
      // currency rather than blocking the bonus entirely, same
      // fail-open posture as other FX-dependent flows in this codebase.
    }

    // Claim the referral row atomically (still bonus_paid_at IS NULL) so a
    // race between two concurrent trade approvals for this user can never
    // credit the referrer twice for the same referral.
    const { data: claimed } = await client
      .from('referrals')
      .update({
        bonus_amount: bonusUsd,
        bonus_paid_at: new Date().toISOString(),
      })
      .eq('id', referral.id)
      .is('bonus_paid_at', null)
      .select('id')
      .maybeSingle();

    if (!claimed) return;

    // Standalone wallet credit, not tied to any trade of the referrer's
    // own (trade_id/withdrawal_id both left null), the same shared
    // WalletService.creditStandaloneWallet the admin Manual Deposit
    // feature uses.
    await this.walletService.creditStandaloneWallet(
      client,
      referrer.id,
      referrer.currency,
      bonusInReferrerCurrency,
    );

    await client.from('notifications').insert({
      user_id: referrer.id,
      category: 'referrals',
      title: 'Referral bonus earned',
      body: `You earned ${this.formatMoney(bonusInReferrerCurrency, referrer.currency)} from a referral who just completed their first trade.`,
    });

    try {
      const emailByUserId = await this.supabaseService.getUserEmailsByIds([
        referrer.id,
      ]);
      const referrerEmail = emailByUserId.get(referrer.id);
      if (referrerEmail) {
        const webAppUrl = (
          this.configService.get<string>('WEB_APP_URL') ??
          'http://localhost:3000'
        ).replace(/\/+$/, '');
        await this.notificationsService.sendReferralEarnedEmail({
          email: referrerEmail,
          name: (referrer.display_name as string | null) ?? 'there',
          referredUserName: 'Your referral',
          bonusAmount: this.formatMoney(
            bonusInReferrerCurrency,
            referrer.currency,
          ),
          viewReferralsUrl: `${webAppUrl}/referrals`,
        });
      }
    } catch {
      // The bonus itself is already credited and the referral row already
      // claimed above; a failed email is a non-critical side effect and
      // must not fail the trade approval request.
    }
  }
}
