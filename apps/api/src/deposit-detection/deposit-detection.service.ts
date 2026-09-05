import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * One incoming value transfer, already translated from whichever provider
 * detected it (Tatum or Alchemy) into this codebase's own shape - `network`
 * is CHAIN_CONFIGS' internal network_code (e.g. 'ERC20', 'TRC20'), never
 * either provider's own chain-naming scheme. Everything downstream of
 * detection (crypto_deposit_events, the confirmation-depth poller, atomic
 * claim-before-credit, notifications) already didn't care which provider
 * produced a row - this interface is the seam that keeps it that way now
 * that there are two.
 */
export interface NormalizedDepositActivity {
  network: string;
  address: string;
  txHash: string;
  amount: number;
  /** Asset ticker as reported by the provider, already uppercased. */
  reportedSymbol: string;
  /** For log messages only - which provider produced this activity. */
  providerLabel: string;
}

/**
 * Shared record-and-notify path for every webhook provider (extracted
 * 2026-09-05 from what was originally TatumWebhookService's own inline
 * logic, when Alchemy was added as a second provider covering EVM chains -
 * Tatum stays exactly as-is for TRON, see webhooks/tatum). Detection and
 * dedupe only - deliberately does NOT credit crypto_wallets here, for the
 * same reason the original Tatum-only version didn't: every provider's own
 * webhook fires at a shallow, provider-chosen confirmation depth, too
 * shallow to trust for real money. DepositConfirmationService (unchanged,
 * genuinely provider-agnostic - it only ever reads crypto_deposit_events by
 * network_code) is what actually credits, once each chain's own real
 * minimum is met.
 */
@Injectable()
export class DepositDetectionService {
  private readonly logger = new Logger(DepositDetectionService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async recordDetectedDeposit(
    activity: NormalizedDepositActivity,
  ): Promise<void> {
    const { network, address, txHash, amount, reportedSymbol, providerLabel } =
      activity;

    if (!address || !txHash || !Number.isFinite(amount) || amount <= 0) {
      this.logger.warn(
        `${providerLabel} webhook has an invalid address/txHash/amount ("${address}"/"${txHash}"/"${amount}") - ignoring.`,
      );
      return;
    }

    const client = this.supabaseService.getClient();

    // Every symbol row this user has on this exact network shares the same
    // address (e.g. ETH/USDT/USDC all on ERC20) - all belong to the same
    // user_id, but only one of them is the actual asset that just arrived,
    // per the provider's own reported asset/symbol field.
    const { data: rows } = await client
      .from('user_crypto_addresses')
      .select('user_id, symbol')
      .eq('address', address)
      .eq('network', network);

    if (!rows || rows.length === 0) {
      this.logger.warn(
        `${providerLabel} webhook for ${address}/${network} matches no user_crypto_addresses row - ignoring (not one of ours, an outgoing/sweep transfer, or a stale registration).`,
      );
      return;
    }

    const userId = rows[0].user_id as string;
    const matchedRow = rows.find(
      (r) => (r.symbol as string).toUpperCase() === reportedSymbol,
    );

    if (!matchedRow) {
      // Recorded anyway (see insert below) rather than dropped - same
      // safety net the original Tatum-only version always applied: a
      // future admin view can still see and investigate an asset we
      // didn't expect on this address, rather than it vanishing silently.
      // It just won't be auto-creditable under an unrecognized symbol.
      this.logger.warn(
        `${providerLabel} webhook reported asset "${reportedSymbol}" for ${address}/${network}, which doesn't match this user's tracked symbols (${rows.map((r) => r.symbol as string).join(', ')}) - recording for manual review, not auto-crediting.`,
      );
    }

    const symbol = matchedRow ? (matchedRow.symbol as string) : reportedSymbol;

    const { error } = await client.from('crypto_deposit_events').insert({
      user_id: userId,
      symbol,
      network,
      address,
      tx_hash: txHash,
      amount,
      status: 'pending_confirmation',
    });

    if (error) {
      if (this.isUniqueViolation(error)) {
        // UNIQUE(network, tx_hash, address) caught a duplicate delivery (a
        // provider retry, or a genuine double-fire) of a tx already
        // recorded - exactly what it's for. Nothing further to do.
        return;
      }
      // Not a dedupe hit - a real (likely transient) failure. Throw so the
      // controller returns non-2xx and the provider's own retry policy
      // gets a chance to redeliver, rather than silently losing a real
      // deposit notification.
      throw new Error(
        `Failed to record deposit event for ${address}/${network} tx ${txHash}: ${error.message}`,
      );
    }

    if (matchedRow) {
      await this.notifyDetected(userId, matchedRow.symbol as string, amount);
    }
  }

  // Fires once, right when the deposit is first recorded (not on a
  // duplicate/retry delivery, which returns earlier above) - separate from
  // DepositConfirmationService's notifyCredited, which fires later once
  // the confirmation-depth poller actually credits it. Best-effort: a
  // notification failure here must never turn into a thrown error, since
  // that would make the controller return non-2xx and trigger a provider
  // redelivery that then hits the UNIQUE dedupe and silently loses the
  // notification for good.
  private async notifyDetected(
    userId: string,
    symbol: string,
    amount: number,
  ): Promise<void> {
    const client = this.supabaseService.getClient();
    const title = "We've spotted your incoming deposit";
    const body = `Your ${amount} ${symbol} deposit has been detected and is waiting on network confirmations. We'll notify you again once it's credited.`;

    try {
      const { error: notifError } = await client.from('notifications').insert({
        user_id: userId,
        category: 'wallet',
        title,
        body,
      });
      if (notifError) {
        this.logger.error(
          `Failed to insert in-app deposit-detected notification for user ${userId}: ${notifError.message}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to insert in-app deposit-detected notification for user ${userId}: ${(err as Error).message}`,
      );
    }

    try {
      const { data: user } = await client
        .from('users')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle();
      const emailByUserId = await this.supabaseService.getUserEmailsByIds([
        userId,
      ]);
      const email = emailByUserId.get(userId);
      if (!email) return;

      await this.notificationsService.sendCryptoDepositDetectedEmail({
        email,
        name: (user?.display_name as string | null) ?? 'there',
        amount: `${amount} ${symbol}`,
        asset: symbol,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send deposit-detected email for user ${userId}: ${(err as Error).message}`,
      );
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      (err as { code?: string }).code === '23505'
    );
  }
}
