import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CryptoWalletService,
  CryptoWalletResult,
} from '../crypto-wallet/crypto-wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TatumChainDataService } from './tatum-chain-data.service';
import { CHAIN_CONFIGS } from '../crypto-addresses/chain-config';
import {
  CONFIRMATION_REQUIREMENTS,
  ConfirmationRule,
} from './confirmation-requirements';

const REORG_CHECK_WINDOW_HOURS = 48;

interface DepositEventRow {
  id: string;
  user_id: string;
  symbol: string;
  network: string;
  address: string;
  tx_hash: string;
  amount: number;
}

/**
 * Piece 3 of webhook-based deposit auto-crediting: the confirmation-depth
 * poller (credits once each chain's own real minimum is met - Tatum's
 * webhook itself fires far too shallow, 1 conf EVM / 2 conf UTXO, to
 * trust for real money - see tatum-webhook.service.ts) and the
 * reorg-reversal check. Runs on a schedule, not per-event: a per-event
 * timer wouldn't survive Cloud Run scaling to zero between ticks, same
 * reason the sweeper polls rather than reacts.
 */
@Injectable()
export class DepositConfirmationService {
  private readonly logger = new Logger(DepositConfirmationService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly cryptoWalletService: CryptoWalletService,
    private readonly notificationsService: NotificationsService,
    private readonly tatumChainDataService: TatumChainDataService,
  ) {}

  @Cron('*/2 * * * *')
  async run(): Promise<void> {
    await this.creditReadyDeposits();
    await this.checkForReorgs();
  }

  private async creditReadyDeposits(): Promise<void> {
    const client = this.supabaseService.getClient();
    const { data: rows, error } = await client
      .from('crypto_deposit_events')
      .select('id, user_id, symbol, network, address, tx_hash, amount')
      .eq('status', 'pending_confirmation');

    if (error) {
      this.logger.error(
        `Could not load pending deposit events: ${error.message}`,
      );
      return;
    }

    for (const raw of rows ?? []) {
      const row = this.toDepositEventRow(raw);
      try {
        await this.tryCreditOne(row);
      } catch (err) {
        this.logger.error(
          `Confirmation check failed for deposit event ${row.id} (${row.network} tx ${row.tx_hash}): ${(err as Error).message}`,
        );
      }
    }
  }

  private async tryCreditOne(row: DepositEventRow): Promise<void> {
    const chainConfig = CHAIN_CONFIGS[row.network];
    const rule = CONFIRMATION_REQUIREMENTS[row.network];
    if (!chainConfig?.tatumChain || !rule) {
      this.logger.warn(
        `No chain config/confirmation rule for network "${row.network}" (deposit event ${row.id}) - skipping.`,
      );
      return;
    }

    const ready = await this.isConfirmed(chainConfig.tatumChain, rule, row);
    if (!ready) return;

    await this.claimAndCredit(row);
  }

  private async isConfirmed(
    tatumChain: string,
    rule: ConfirmationRule,
    row: DepositEventRow,
  ): Promise<boolean> {
    const tx = await this.tatumChainDataService.getTransaction(
      tatumChain,
      row.tx_hash,
    );
    // Not found yet (still in mempool) or found with no block yet -
    // either way, not confirmed at all, let alone confirmed enough.
    if (!tx.found || tx.blockNumber == null) return false;

    if (rule.kind === 'finalized') {
      const finalized =
        await this.tatumChainDataService.getFinalizedBlockNumber(tatumChain);
      return tx.blockNumber <= finalized;
    }

    const isUtxo = CHAIN_CONFIGS[row.network]?.sweepGroup === 'utxo';
    const confirmations = isUtxo
      ? await this.tatumChainDataService.getUtxoConfirmations(
          tatumChain,
          tx.blockNumber,
        )
      : (await this.tatumChainDataService.getCurrentBlockNumber(tatumChain)) -
        tx.blockNumber +
        1;

    return confirmations >= rule.minConfirmations;
  }

  private async claimAndCredit(row: DepositEventRow): Promise<void> {
    const client = this.supabaseService.getClient();

    // The actual serialization point against concurrent poller
    // instances - Cloud Run here can scale beyond one (same caveat
    // ThrottlerModule's in-memory store already carries). Only the
    // caller whose UPDATE affects exactly 1 row proceeds to the real
    // money-moving step; doing this check AFTER crediting instead would
    // let two instances both pass a plain read and both credit before
    // either updates status.
    const { data: claimed, error: claimError } = await client
      .from('crypto_deposit_events')
      .update({ status: 'crediting' })
      .eq('id', row.id)
      .eq('status', 'pending_confirmation')
      .select('id');

    if (claimError) {
      this.logger.error(
        `Claim update failed for deposit event ${row.id}: ${claimError.message}`,
      );
      return;
    }
    if (!claimed || claimed.length === 0) {
      // Another instance's tick already claimed this one - not an
      // error, nothing left for this run to do.
      return;
    }

    let credit: CryptoWalletResult;
    try {
      credit = await this.cryptoWalletService.creditWallet(
        client,
        row.user_id,
        row.symbol,
        row.amount,
        'webhook_deposit',
      );
    } catch (err) {
      // Left stuck in 'crediting' deliberately: never re-picked-up by
      // the normal pending_confirmation query, so it can never be
      // double-credited by a retry. Needs a stuck-state recovery pass
      // (not built here) rather than an automatic retry that could
      // double-credit if this failure was actually partial.
      this.logger.error(
        `Credit failed for claimed deposit event ${row.id} - left in 'crediting' for manual recovery: ${(err as Error).message}`,
      );
      return;
    }

    const { error: finalizeError } = await client
      .from('crypto_deposit_events')
      .update({
        status: 'credited',
        crypto_wallet_transaction_id: credit.cryptoWalletTransactionId,
        credited_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (finalizeError) {
      // The credit itself is real and already applied - this is a
      // bookkeeping failure, not a money failure. Logged loudly (same
      // posture AdminDepositsService already takes for its own
      // admin_actions insert failure) rather than surfaced as if the
      // credit had failed, since it genuinely succeeded.
      this.logger.error(
        `Deposit event ${row.id} credited (crypto_wallet_transaction ${credit.cryptoWalletTransactionId}) but finalizing its status failed: ${finalizeError.message}`,
      );
    }

    await this.notifyCredited(row, credit.balanceAfter);
  }

  private async notifyCredited(
    row: DepositEventRow,
    balanceAfter: number,
  ): Promise<void> {
    const client = this.supabaseService.getClient();
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
      await this.notificationsService.sendCryptoDepositCreditedEmail({
        email,
        name: (user?.display_name as string | null) ?? 'there',
        amount: `${row.amount} ${row.symbol}`,
        balance: `${balanceAfter} ${row.symbol}`,
      });
    } catch {
      // Already logged inside NotificationsService.send() - the credit
      // itself already succeeded regardless of whether the email does.
    }
  }

  private async checkForReorgs(): Promise<void> {
    const client = this.supabaseService.getClient();
    const cutoff = new Date(
      Date.now() - REORG_CHECK_WINDOW_HOURS * 60 * 60 * 1000,
    ).toISOString();

    const { data: rows, error } = await client
      .from('crypto_deposit_events')
      .select('id, user_id, symbol, network, address, tx_hash, amount')
      .eq('status', 'credited')
      .gte('credited_at', cutoff);

    if (error) {
      this.logger.error(
        `Could not load credited deposit events for reorg check: ${error.message}`,
      );
      return;
    }

    for (const raw of rows ?? []) {
      const row = this.toDepositEventRow(raw);
      try {
        await this.checkOneForReorg(row);
      } catch (err) {
        this.logger.error(
          `Reorg check failed for deposit event ${row.id} (${row.network} tx ${row.tx_hash}): ${(err as Error).message}`,
        );
      }
    }
  }

  private async checkOneForReorg(row: DepositEventRow): Promise<void> {
    const chainConfig = CHAIN_CONFIGS[row.network];
    if (!chainConfig?.tatumChain) return;

    const tx = await this.tatumChainDataService.getTransaction(
      chainConfig.tatumChain,
      row.tx_hash,
    );
    if (tx.found) return; // still there, nothing to do

    // Vanished - a real reorg. Reverse it.
    const client = this.supabaseService.getClient();
    try {
      const debit = await this.cryptoWalletService.debitWallet(
        client,
        row.user_id,
        row.symbol,
        row.amount,
        'reorg_reversal',
      );

      await client
        .from('crypto_deposit_events')
        .update({ status: 'orphaned_reorg' })
        .eq('id', row.id);

      this.logger.warn(
        `Reorg reversal: deposit event ${row.id} (${row.network} tx ${row.tx_hash}) reversed, new ${row.symbol} balance ${debit.balanceAfter} for user ${row.user_id}.`,
      );
    } catch (err) {
      if (err instanceof BadRequestException) {
        // The user already spent/withdrew this before the reorg was
        // caught - deliberately NOT a silent negative balance or an
        // automatic write-off. Surfaced as its own distinct status so a
        // human makes the actual recovery/write-off decision, not a
        // log line that could be missed.
        await client
          .from('crypto_deposit_events')
          .update({ status: 'orphaned_reorg_unrecoverable' })
          .eq('id', row.id);
        this.logger.error(
          `UNRECOVERABLE reorg: deposit event ${row.id} (${row.network} tx ${row.tx_hash}, user ${row.user_id}) reorged out but ${row.amount} ${row.symbol} can no longer be debited (already spent/withdrawn) - needs admin review.`,
        );
        return;
      }
      throw err;
    }
  }

  // Supabase's client can hand back a numeric column as a string
  // (Postgres numeric -> JS, to avoid float precision loss) - same
  // coercion CryptoWalletService.getBalance already does at its own read
  // boundary, applied here too rather than trusting the driver's type.
  private toDepositEventRow(raw: Record<string, unknown>): DepositEventRow {
    return {
      id: raw.id as string,
      user_id: raw.user_id as string,
      symbol: raw.symbol as string,
      network: raw.network as string,
      address: raw.address as string,
      tx_hash: raw.tx_hash as string,
      amount: Number(raw.amount),
    };
  }
}
