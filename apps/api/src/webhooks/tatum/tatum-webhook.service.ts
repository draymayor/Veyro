import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CHAIN_CONFIGS } from '../../crypto-addresses/chain-config';
import { NotificationsService } from '../../notifications/notifications.service';

// Reverse of CHAIN_CONFIGS' network_code -> webhookChain mapping - built
// once, since a webhook payload identifies the chain by Tatum's own
// normalized "chain" value (e.g. "ethereum-mainnet", "tron-mainnet"),
// which has to be translated back to this codebase's internal network_code
// (e.g. "ERC20", "TRC20") to match user_crypto_addresses.network. Keyed
// from `webhookChain`, NOT `tatumChain` - a real captured TRON payload
// (2026-09-04) carries "tron-mainnet", never bare "tron" (that's only
// the /v3/{chain}/address and /v3/{chain}/transaction path segment, a
// separate value space - see ChainConfig.webhookChain's doc comment).
// Building this from `tatumChain` (the original version of this map) made
// every real inbound webhook match nothing and silently no-op.
const NETWORK_CODE_BY_WEBHOOK_CHAIN: Record<string, string> = {};
for (const [networkCode, config] of Object.entries(CHAIN_CONFIGS)) {
  if (config.webhookChain)
    NETWORK_CODE_BY_WEBHOOK_CHAIN[config.webhookChain] = networkCode;
}

// Shape confirmed live (2026-09-04) from a real TRON ADDRESS_TRANSACTION
// delivery - NOT the flat {address, amount, asset, type} shape Tatum's own
// createsubscription reference docs show (that page is stale relative to
// what the account actually sends; caught by capturing a real payload, not
// by reading docs). Verified only for TRON so far; presumed identical for
// other chains (Tatum's ADDRESS_TRANSACTION notification schema is meant
// to be uniform across chains under one subscription type), pending its
// own live capture per chain the same way TRON was.
export interface TatumAddressTransactionPayload {
  kind?: string;
  blockHash?: string;
  blockNumber?: number;
  blockTimestamp?: number;
  txId: string;
  txTimestamp?: number;
  from?: string;
  to?: string;
  value: string;
  currency?: string;
  tokenMetadata?: {
    type: string; // 'native' confirmed live for a real TRX transfer - a real 'token' transfer's exact `symbol` value (ticker vs. contract address) is a separate open question, not yet captured
    symbol: string;
    name?: string;
    decimals?: number;
  };
  chain: string;
  subscriptionId?: string;
  subscriptionType: string;
}

/**
 * Records a webhook-detected deposit into crypto_deposit_events -
 * detection and dedupe only. Deliberately does NOT credit
 * crypto_wallets here: Tatum fires this webhook at a fixed, thin
 * confirmation depth (1 conf for EVM chains, 2 for UTXO chains, per
 * their own docs, not configurable) - too shallow to trust for real
 * money on every chain given real reorg risk. The confirmation-depth
 * poller (a separate piece) is what actually credits, once each chain's
 * own real minimum is met.
 */
@Injectable()
export class TatumWebhookService {
  private readonly logger = new Logger(TatumWebhookService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async handleAddressTransaction(
    payload: TatumAddressTransactionPayload,
  ): Promise<void> {
    const network = NETWORK_CODE_BY_WEBHOOK_CHAIN[payload.chain];
    if (!network) {
      this.logger.warn(
        `Tatum webhook for unrecognized chain "${payload.chain}" (to ${payload.to}) - ignoring.`,
      );
      return;
    }

    // `to` is the recipient - the only direction that's a deposit. This
    // subscription also fires for OUTGOING transfers (e.g. the sweeper
    // emptying this exact address into the consolidation wallet, where
    // this address is `from`, not `to`) - `to` not matching any tracked
    // address (checked via the user_crypto_addresses lookup below) is
    // exactly how an outgoing/sweep event gets naturally ignored here,
    // no separate direction check needed.
    const address = payload.to;
    const amount = Number(payload.value);
    if (!address || !payload.txId || !Number.isFinite(amount) || amount <= 0) {
      this.logger.warn(
        `Tatum webhook has an invalid to/txId/value ("${address}"/"${payload.txId}"/"${payload.value}") - ignoring.`,
      );
      return;
    }

    const client = this.supabaseService.getClient();

    // Every symbol row this user has on this exact network shares the
    // same address (e.g. ETH/USDT/USDC all on ERC20) - all belong to the
    // same user_id, but only one of them is the actual asset that just
    // arrived, per the webhook's own `tokenMetadata.symbol` field.
    const { data: rows } = await client
      .from('user_crypto_addresses')
      .select('user_id, symbol')
      .eq('address', address)
      .eq('network', network);

    if (!rows || rows.length === 0) {
      this.logger.warn(
        `Tatum webhook for ${address}/${network} matches no user_crypto_addresses row - ignoring (not one of ours, an outgoing/sweep transfer, or a stale subscription).`,
      );
      return;
    }

    const userId = rows[0].user_id as string;
    const reportedAsset = payload.tokenMetadata?.symbol?.trim().toUpperCase();
    const matchedRow = rows.find(
      (r) => (r.symbol as string).toUpperCase() === reportedAsset,
    );

    if (!matchedRow) {
      // Recorded anyway (see insert below) rather than dropped - the
      // confirmation-depth poller / a future admin view can still see
      // and investigate an asset we didn't expect on this address,
      // rather than it vanishing silently. It just won't be
      // auto-creditable under an unrecognized symbol.
      this.logger.warn(
        `Tatum webhook reported asset "${payload.tokenMetadata?.symbol}" for ${address}/${network}, which doesn't match this user's tracked symbols (${rows.map((r) => r.symbol as string).join(', ')}) - recording for manual review, not auto-crediting.`,
      );
    }

    const symbol = matchedRow ? (matchedRow.symbol as string) : reportedAsset;

    const { error } = await client.from('crypto_deposit_events').insert({
      user_id: userId,
      symbol,
      network,
      address,
      tx_hash: payload.txId,
      amount,
      status: 'pending_confirmation',
    });

    if (error) {
      if (this.isUniqueViolation(error)) {
        // UNIQUE(network, tx_hash, address) caught a duplicate delivery
        // (Tatum retry, or a genuine double-fire) of a tx already
        // recorded - exactly what it's for. Nothing further to do.
        return;
      }
      // Not a dedupe hit - a real (likely transient) failure. Throw so
      // the controller returns non-2xx and Tatum's own retry (3x on this
      // plan) gets a chance to redeliver, rather than silently losing a
      // real deposit notification.
      throw new Error(
        `Failed to record deposit event for ${address}/${network} tx ${payload.txId}: ${error.message}`,
      );
    }

    if (matchedRow) {
      await this.notifyDetected(userId, matchedRow.symbol as string, amount);
    }
  }

  // Fires once, right when the deposit is first recorded (not on a
  // duplicate/retry delivery, which returns earlier above) - separate
  // from DepositConfirmationService's notifyCredited, which fires later
  // once the confirmation-depth poller actually credits it. Best-effort:
  // a notification failure here must never turn into a thrown error, since
  // that would make the controller return non-2xx and trigger a Tatum
  // redelivery that then hits the UNIQUE dedupe and silently loses the
  // notification for good (see isUniqueViolation above).
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
