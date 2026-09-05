import { Injectable, Logger } from '@nestjs/common';
import { CHAIN_CONFIGS } from '../../crypto-addresses/chain-config';
import { DepositDetectionService } from '../../deposit-detection/deposit-detection.service';

// Reverse of CHAIN_CONFIGS' network_code -> alchemyNetwork mapping, same
// pattern as Tatum's own NETWORK_CODE_BY_WEBHOOK_CHAIN
// (../tatum/tatum-webhook.service.ts) - a webhook payload identifies the
// chain by Alchemy's own network enum value (e.g. 'ETH_MAINNET'), which
// has to be translated back to this codebase's internal network_code
// (e.g. 'ERC20') to match user_crypto_addresses.network.
const NETWORK_CODE_BY_ALCHEMY_NETWORK: Record<string, string> = {};
for (const [networkCode, config] of Object.entries(CHAIN_CONFIGS)) {
  if (config.alchemyNetwork)
    NETWORK_CODE_BY_ALCHEMY_NETWORK[config.alchemyNetwork] = networkCode;
}

// Categories that represent an actual on-chain value transfer worth
// recording as a deposit candidate: 'external' (a plain native-asset
// transfer, e.g. ETH/BNB/MATIC) and 'token' (an ERC20 transfer - the
// literal category value in Alchemy's own documented example payload,
// docs.alchemy.com/docs/reference/address-activity-webhook, 2026-09-05).
// Deliberately excludes 'internal' (a contract-internal value transfer,
// not a top-level tx to the tracked address) and 'erc721'/'erc1155'
// (NFTs - not a supported deposit asset on this platform). NOTE: some of
// Alchemy's own prose elsewhere describes category values as "external,
// internal, erc20, erc721, erc1155, or token" - 'erc20' does NOT appear
// in their own literal example payload, where the equivalent transfer is
// tagged 'token' instead. This is a doc-vs-example inconsistency, the
// same species of gap that bit this codebase's Tatum integration
// multiple times (see chain-config.ts/tatum-webhook.service.ts) - 'token'
// is trusted here because it's what the literal example actually shows,
// not because the prose was resolved. Flagged, not silently guessed.
const DEPOSIT_CATEGORIES = new Set(['external', 'token']);

export interface AlchemyActivityItem {
  fromAddress?: string;
  toAddress?: string;
  value: number;
  asset: string;
  category: string;
  hash: string;
}

export interface AlchemyAddressActivityPayload {
  webhookId?: string;
  id?: string;
  type?: string;
  event: {
    network: string;
    activity: AlchemyActivityItem[];
  };
}

/**
 * Translates a raw Alchemy Address Activity payload into this codebase's
 * normalized deposit-activity shape (one call per activity item - a
 * single delivery can carry several) and hands each to the shared
 * DepositDetectionService (record + dedupe + notify - see that file,
 * shared with Tatum's identical detection-only responsibility). Alchemy
 * covers EVM chains only (5 of 14, see chain-config.ts's alchemyNetwork
 * field); Tatum stays exactly as-is for TRON.
 *
 * OPEN QUESTION (2026-09-05), deliberately not guessed at: this payload
 * shape is taken from Alchemy's own documented literal example, NOT a
 * real live capture the way Tatum's payload eventually was (see
 * tatum-webhook.service.ts's own header comment on that process) - there
 * is no funded Alchemy account or live deposit to verify against yet. Do
 * not treat this shape as equally trusted; the first real inbound
 * delivery should be captured and diffed against this before leaning on
 * it for auto-crediting decisions the way Tatum's TRON path now can.
 */
@Injectable()
export class AlchemyWebhookService {
  private readonly logger = new Logger(AlchemyWebhookService.name);

  constructor(
    private readonly depositDetectionService: DepositDetectionService,
  ) {}

  async handleAddressActivity(
    payload: AlchemyAddressActivityPayload,
  ): Promise<void> {
    const network = NETWORK_CODE_BY_ALCHEMY_NETWORK[payload.event?.network];
    if (!network) {
      this.logger.warn(
        `Alchemy webhook for unrecognized network "${payload.event?.network}" - ignoring.`,
      );
      return;
    }

    for (const item of payload.event?.activity ?? []) {
      await this.handleOne(network, item);
    }
  }

  private async handleOne(
    network: string,
    item: AlchemyActivityItem,
  ): Promise<void> {
    // NFT transfer or an internal contract call, not a supported deposit
    // asset - see DEPOSIT_CATEGORIES' doc comment.
    if (!DEPOSIT_CATEGORIES.has(item.category)) return;

    // toAddress is the recipient - the only direction that's a deposit.
    // The same tracked address also appears as fromAddress for an
    // OUTGOING transfer (e.g. the sweeper emptying it into the
    // consolidation wallet) - toAddress not matching any tracked address
    // (checked inside DepositDetectionService's own lookup) is exactly
    // how an outgoing/sweep event gets naturally ignored here, mirroring
    // Tatum's identical `to`-only handling.
    const address = item.toAddress ?? '';
    const reportedSymbol = item.asset?.trim().toUpperCase() ?? '';

    await this.depositDetectionService.recordDetectedDeposit({
      network,
      address,
      txHash: item.hash,
      amount: item.value,
      reportedSymbol,
      providerLabel: 'Alchemy',
    });
  }
}
