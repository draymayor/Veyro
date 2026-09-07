import { Injectable, Logger } from '@nestjs/common';
import { DepositDetectionService } from '../../deposit-detection/deposit-detection.service';

/**
 * One deposit candidate detected by apps/block-watcher scanning a block
 * directly against a chain's own RPC/explorer, already translated into this
 * codebase's internal shape (network is CHAIN_CONFIGS' network_code, e.g.
 * 'ERC20', 'TRC20' - never a chain's own chain-id/name). Same shape as
 * DepositDetectionService's NormalizedDepositActivity minus providerLabel,
 * which this service supplies itself.
 */
export interface BlockWatcherDetection {
  network: string;
  address: string;
  txHash: string;
  amount: number;
  reportedSymbol: string;
}

export interface BlockWatcherDetectionPayload {
  detections: BlockWatcherDetection[];
}

/**
 * Third caller of DepositDetectionService.recordDetectedDeposit, alongside
 * Tatum and Alchemy (see that file's own doc comment) - block-watcher is a
 * genuinely redundant, independently-operated detection source (Strategy 3),
 * not a fallback that only runs when the others don't. For an address that
 * also has Tatum/Alchemy webhook coverage, whichever of the three reports a
 * given tx first wins the row; the others hit the UNIQUE(network, tx_hash,
 * address) constraint and no-op - no new dedupe logic needed here, exactly
 * as already true between Tatum and Alchemy.
 *
 * A single HTTP call can carry many detections (block-watcher batches
 * everything it found scanning one block, across every chain family it
 * covers), so this loops rather than handling one item per request the way
 * Tatum/Alchemy's own webhook deliveries do.
 */
@Injectable()
export class BlockWatcherWebhookService {
  private readonly logger = new Logger(BlockWatcherWebhookService.name);

  constructor(
    private readonly depositDetectionService: DepositDetectionService,
  ) {}

  async handleDetections(payload: BlockWatcherDetectionPayload): Promise<void> {
    // Every item is attempted even if an earlier one fails - one bad
    // detection in a batch must not block the rest. Real (non-dedupe)
    // failures are collected and re-thrown at the end (rather than
    // swallowed) so the controller returns non-2xx and block-watcher
    // retries the whole batch later: safe to retry indiscriminately since
    // the items that already succeeded just hit UNIQUE(network, tx_hash,
    // address) again and no-op, same as a Tatum/Alchemy redelivery does.
    const failures: string[] = [];
    for (const detection of payload.detections ?? []) {
      try {
        await this.depositDetectionService.recordDetectedDeposit({
          ...detection,
          providerLabel: 'block-watcher',
        });
      } catch (err) {
        const message = `${detection.address}/${detection.network} tx ${detection.txHash}: ${(err as Error).message}`;
        this.logger.error(
          `Failed to record block-watcher detection for ${message}`,
        );
        failures.push(message);
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `${failures.length} block-watcher detection(s) failed to record: ${failures.join('; ')}`,
      );
    }
  }
}
