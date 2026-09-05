import { Injectable, Logger } from '@nestjs/common';
import { CHAIN_CONFIGS } from '../../crypto-addresses/chain-config';
import { DepositDetectionService } from '../../deposit-detection/deposit-detection.service';

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
// own live capture per chain the same way TRON was. Now only relevant to
// TRON in practice - Tatum stopped receiving new EVM subscriptions once
// Alchemy took over EVM detection (see CryptoAddressesService's provider
// dispatch), but the shape itself is unrelated to that and unchanged.
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
 * Translates a raw Tatum ADDRESS_TRANSACTION payload into this codebase's
 * normalized deposit-activity shape and hands it to the shared
 * DepositDetectionService (record + dedupe + notify - see that file; the
 * insert/dedupe/notify logic used to live here directly until Alchemy was
 * added as a second provider and it was extracted so both share it).
 * Tatum's webhook itself fires at a fixed, thin confirmation depth (1 conf
 * for EVM chains, 2 for UTXO chains, per their own docs, not configurable)
 * - too shallow to trust for real money on every chain given real reorg
 * risk, which is why this only ever detects, never credits.
 */
@Injectable()
export class TatumWebhookService {
  private readonly logger = new Logger(TatumWebhookService.name);

  constructor(
    private readonly depositDetectionService: DepositDetectionService,
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
    // address (checked inside DepositDetectionService's own lookup) is
    // exactly how an outgoing/sweep event gets naturally ignored here, no
    // separate direction check needed.
    const address = payload.to ?? '';
    const amount = Number(payload.value);

    // OPEN QUESTION (2026-09-04), deliberately not guessed at: this is
    // confirmed correct for a NATIVE transfer (tokenMetadata.symbol =
    // "TRX", live-verified end to end). What tokenMetadata.symbol
    // contains for an actual TOKEN transfer (e.g. real USDT-TRC20) is
    // still unconfirmed - Tatum's own createsubscription reference shows
    // a DIFFERENT, older payload shape where the equivalent field holds a
    // contract address for tokens, not a ticker; a newer v4 schema
    // reference doc suggests it's a ticker with the contract address
    // broken out into a separate `contractAddress` field instead - but
    // that's still documentation, and this codebase has hit real
    // doc-vs-reality gaps three separate times already. Testnet
    // verification was ruled out live: this account's TATUM_API_KEY is
    // mainnet-only (`403 unsupported.apiKey.network.combination` creating
    // a tron-testnet subscription), and a separate testnet account/key is
    // out of scope for now. Left exactly as-is (correct for the confirmed
    // native case) until a real USDT-TRC20 deposit happens and can be
    // captured the same way TRX was - do not change this matching logic
    // based on documentation alone.
    const reportedSymbol = payload.tokenMetadata?.symbol?.trim().toUpperCase();

    await this.depositDetectionService.recordDetectedDeposit({
      network,
      address,
      txHash: payload.txId,
      amount,
      reportedSymbol: reportedSymbol ?? '',
      providerLabel: 'Tatum',
    });
  }
}
