import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../supabase/supabase.service';
import { WalletService } from '../../wallet/wallet.service';
import { NotificationsService } from '../../notifications/notifications.service';

export interface AdminWithdrawalListItem {
  id: string;
  user_id: string;
  user_display_name: string | null;
  user_withdrawals_suspended: boolean;
  amount: number;
  currency: string | null;
  method: string;
  status: string;
  bank_details: Record<string, string | undefined> | null;
  paypal_email: string | null;
  crypto_asset_symbol: string | null;
  crypto_asset_network: string | null;
  crypto_payout_address: string | null;
  transaction_reference: string | null;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
}

interface WithdrawalActionRow {
  id: string;
  user_id: string;
  amount: number;
  method: string;
}

interface WithdrawalWithUserRow extends WithdrawalActionRow {
  users: { currency: string | null; display_name: string | null } | null;
}

interface ListFilters {
  status?: string;
  method?: string;
}

// requested -> processing -> paid mirrors docs/admin-guide.md's Payout
// Processing flow exactly ("admin marks 'processing' when they've started
// handling it, then 'paid' once complete"); failed is reachable from
// either open state (e.g. invalid bank details discovered mid-process).
// As with trades' ACTIONABLE_STATUSES, the from-status is a WHERE clause
// on the update itself, not a separate read-then-write check, so it also
// guards against a double action on the same withdrawal.
const PROCESSING_FROM = ['requested'];
const PAID_FROM = ['processing'];
const FAILED_FROM = ['requested', 'processing'];

// Shared with WithdrawalsService.create() (product-rules.md rule 18b):
// default 'false' means new crypto withdrawals go straight to processing;
// flipping this to 'true' switches them back to a requested-first queue
// like bank/PayPal, reversible without a deploy.
const CRYPTO_APPROVAL_SETTING_KEY = 'crypto_withdrawal_requires_approval';

// Payout Processing queue (docs/admin-guide.md): all payouts are manual in
// V1, no gateway integration. This service only records the admin's
// manual work (status, who did it, when, and - for paid - the reference
// they got from their own banking/PayPal/crypto send) and reflects a
// failure back to the user through the notifications system. It never
// moves money itself.
@Injectable()
export class AdminWithdrawalsService {
  private readonly logger = new Logger(AdminWithdrawalsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  async list(filters: ListFilters): Promise<AdminWithdrawalListItem[]> {
    const client = this.supabaseService.getClient();

    // withdrawals has two foreign keys into users (user_id and
    // processed_by), so, same as trades, the users embed must name the
    // relationship explicitly or PostgREST rejects the query outright
    // (PGRST201) regardless of how many rows would match.
    let query = client
      .from('withdrawals')
      .select(
        'id, user_id, amount, method, status, bank_details, paypal_email, crypto_payout_address, transaction_reference, created_at, processed_at, processed_by, ' +
          'users!withdrawals_user_id_fkey(display_name, currency, withdrawals_suspended), crypto_assets(symbol, network)',
      )
      .order('created_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.method) query = query.eq('method', filters.method);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as Record<string, unknown>[];

    return rows.map((row) => {
      const user = row.users as {
        display_name: string | null;
        currency: string | null;
        withdrawals_suspended: boolean | null;
      } | null;
      const asset = row.crypto_assets as {
        symbol: string;
        network: string;
      } | null;

      return {
        id: row.id as string,
        user_id: row.user_id as string,
        user_display_name: user?.display_name ?? null,
        user_withdrawals_suspended: Boolean(user?.withdrawals_suspended),
        amount: Number(row.amount),
        currency: user?.currency ?? null,
        method: row.method as string,
        status: row.status as string,
        bank_details:
          (row.bank_details as Record<string, string | undefined> | null) ??
          null,
        paypal_email: row.paypal_email as string | null,
        crypto_asset_symbol: asset?.symbol ?? null,
        crypto_asset_network: asset?.network ?? null,
        crypto_payout_address: row.crypto_payout_address as string | null,
        transaction_reference: row.transaction_reference as string | null,
        created_at: row.created_at as string,
        processed_at: row.processed_at as string | null,
        processed_by: row.processed_by as string | null,
      };
    });
  }

  // Read/write for the crypto-approval toggle (docs/admin-guide.md's Payout
  // Processing section, product-rules.md rule 18b). platform_settings has
  // no seed row for this key by default, so a missing row reads as the
  // documented default (false, automatic) rather than an error.
  async getSettings(): Promise<{ cryptoWithdrawalRequiresApproval: boolean }> {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('platform_settings')
      .select('value')
      .eq('key', CRYPTO_APPROVAL_SETTING_KEY)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return { cryptoWithdrawalRequiresApproval: data?.value === 'true' };
  }

  async updateSettings(
    adminId: string,
    cryptoWithdrawalRequiresApproval: boolean,
  ): Promise<{ cryptoWithdrawalRequiresApproval: boolean }> {
    const client = this.supabaseService.getClient();

    const { error } = await client.from('platform_settings').upsert({
      key: CRYPTO_APPROVAL_SETTING_KEY,
      value: String(cryptoWithdrawalRequiresApproval),
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    });

    if (error) throw new Error(error.message);

    return { cryptoWithdrawalRequiresApproval };
  }

  async markProcessing(adminId: string, withdrawalId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('withdrawals')
      .update({ status: 'processing' })
      .eq('id', withdrawalId)
      .in('status', PROCESSING_FROM)
      .select('id')
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      throw new ConflictException(
        'This withdrawal is not awaiting processing.',
      );
    }

    await this.logAction(
      client,
      adminId,
      withdrawalId,
      'withdrawal_processing',
    );

    return { id: data.id as string, status: 'processing' };
  }

  async markPaid(
    adminId: string,
    withdrawalId: string,
    transactionReference: string,
  ) {
    const trimmedReference = transactionReference?.trim();
    if (!trimmedReference) {
      throw new BadRequestException(
        'A transaction reference is required to mark a withdrawal paid.',
      );
    }

    const client = this.supabaseService.getClient();

    const { data: withdrawalData, error } = await client
      .from('withdrawals')
      .update({
        status: 'paid',
        transaction_reference: trimmedReference,
        processed_by: adminId,
        processed_at: new Date().toISOString(),
      })
      .eq('id', withdrawalId)
      .in('status', PAID_FROM)
      .select('id, user_id, amount, method')
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!withdrawalData) {
      throw new ConflictException(
        'This withdrawal must be marked processing before it can be marked paid.',
      );
    }
    const withdrawal: WithdrawalActionRow = withdrawalData;

    await this.logAction(
      client,
      adminId,
      withdrawalId,
      'withdrawal_processed',
      trimmedReference,
    );
    await this.notify(
      client,
      withdrawal.user_id,
      'Withdrawal paid',
      `Your ${this.formatMethod(withdrawal.method)} withdrawal has been paid. Reference: ${trimmedReference}`,
      withdrawalId,
    );

    return { id: withdrawal.id, status: 'paid' };
  }

  async markFailed(adminId: string, withdrawalId: string, reason: string) {
    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      throw new BadRequestException(
        'A reason is required to mark a withdrawal failed.',
      );
    }

    const client = this.supabaseService.getClient();

    // users!withdrawals_user_id_fkey named explicitly: withdrawals has two
    // FKs into users (user_id, processed_by), same PGRST201 ambiguity risk
    // as list() above.
    const { data: withdrawalData, error } = await client
      .from('withdrawals')
      .update({
        status: 'failed',
        processed_by: adminId,
        processed_at: new Date().toISOString(),
      })
      .eq('id', withdrawalId)
      .in('status', FAILED_FROM)
      .select(
        'id, user_id, amount, method, users!withdrawals_user_id_fkey(currency, display_name)',
      )
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!withdrawalData) {
      throw new ConflictException(
        'This withdrawal has already been resolved or does not exist.',
      );
    }
    // users!withdrawals_user_id_fkey(...) is a to-one FK relation, so
    // PostgREST returns a single object at runtime - but this untyped
    // client (no generated Database type) infers embedded relations as
    // arrays regardless of cardinality, so the direct cast below doesn't
    // structurally overlap and needs the unknown step.
    const withdrawal = withdrawalData as unknown as WithdrawalWithUserRow;

    // Critical: debitStandaloneWallet reserved these funds the moment the
    // withdrawal was requested (withdrawals.service.ts), so marking it
    // failed must credit them straight back or the user permanently loses
    // that balance. This is deliberately NOT wrapped in a swallow-and-log
    // try/catch the way the manual-deposit audit log is: the status update
    // above already committed (this codebase has no cross-table DB
    // transaction), so if the credit-back fails, the admin needs to see a
    // loud error and manually reconcile, not a false "failed" success
    // while the user's money stays reserved and gone.
    const user = withdrawal.users;
    if (!user?.currency) {
      this.logger.error(
        `Withdrawal ${withdrawalId} marked failed but could not credit back ${withdrawal.amount} - user ${withdrawal.user_id} has no wallet currency on file.`,
      );
      throw new InternalServerErrorException(
        'Withdrawal marked failed, but the funds could not be credited back automatically. Reconcile this manually.',
      );
    }

    try {
      await this.walletService.creditStandaloneWallet(
        client,
        withdrawal.user_id,
        user.currency,
        Number(withdrawal.amount),
        withdrawalId,
      );
    } catch (creditError) {
      this.logger.error(
        `Withdrawal ${withdrawalId} marked failed but the credit-back of ${withdrawal.amount} to user ${withdrawal.user_id} failed: ${creditError instanceof Error ? creditError.message : String(creditError)}`,
      );
      throw new InternalServerErrorException(
        'Withdrawal marked failed, but the funds could not be credited back automatically. Reconcile this manually.',
      );
    }

    await this.logAction(
      client,
      adminId,
      withdrawalId,
      'withdrawal_failed',
      trimmedReason,
    );
    await this.notify(
      client,
      withdrawal.user_id,
      'Withdrawal failed',
      `Your ${this.formatMethod(withdrawal.method)} withdrawal could not be completed: ${trimmedReason}. The funds have been returned to your wallet.`,
      withdrawalId,
    );

    // Withdrawal Failed email (docs/email-templates.md #11), sent alongside
    // the credit-back above, never instead of it - by the time this runs
    // the funds are already back in the wallet, so the copy states that as
    // fact. A failed send here is non-critical (the credit-back and status
    // change already succeeded) and must not fail the request.
    try {
      const emailByUserId = await this.supabaseService.getUserEmailsByIds([
        withdrawal.user_id,
      ]);
      const email = emailByUserId.get(withdrawal.user_id);
      if (email) {
        const webAppUrl = (
          this.configService.get<string>('WEB_APP_URL') ??
          'http://localhost:3000'
        ).replace(/\/+$/, '');
        await this.notificationsService.sendWithdrawalFailedEmail({
          email,
          name: user.display_name ?? 'there',
          amount: this.formatMoney(Number(withdrawal.amount), user.currency),
          reason: trimmedReason,
          contactSupportUrl: `${webAppUrl}/support`,
        });
      }
    } catch {
      // Already logged by NotificationsService.send().
    }

    return { id: withdrawal.id, status: 'failed' };
  }

  private formatMoney(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString('en-US')}`;
    }
  }

  private formatMethod(method: string): string {
    if (method === 'bank_transfer') return 'bank transfer';
    if (method === 'paypal') return 'PayPal';
    return 'crypto';
  }

  private async logAction(
    client: ReturnType<SupabaseService['getClient']>,
    adminId: string,
    withdrawalId: string,
    actionType: string,
    notes?: string,
  ): Promise<void> {
    await client.from('admin_actions').insert({
      admin_id: adminId,
      action_type: actionType,
      target_id: withdrawalId,
      notes: notes ?? null,
    });
  }

  private async notify(
    client: ReturnType<SupabaseService['getClient']>,
    userId: string,
    title: string,
    body: string,
    withdrawalId: string,
  ): Promise<void> {
    await client.from('notifications').insert({
      user_id: userId,
      category: 'wallet',
      title,
      body,
      related_withdrawal_id: withdrawalId,
    });
  }
}
