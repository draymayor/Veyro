import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithTimeout } from '../common/fetch-with-timeout';

const ALCHEMY_NOTIFY_BASE_URL = 'https://dashboard.alchemy.com/api';
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Thin wrapper around Alchemy's Notify (webhook management) REST API -
 * same fetchWithTimeout pattern as TatumService, deliberately not an SDK.
 * Address REGISTRATION only (adding an address to an already-existing
 * Address Activity webhook). Webhook CREATION itself (one webhook per
 * active EVM chain, five total on the free tier - see chain-config.ts's
 * alchemyNetwork field) is a one-time setup step done once via the
 * Alchemy dashboard or Notify API directly, not something this app does
 * at runtime; the resulting webhook ids are supplied via
 * ALCHEMY_WEBHOOK_IDS.
 *
 * Alchemy's Address Activity webhook is strictly one network per webhook
 * (confirmed against docs.alchemy.com/docs/reference/address-activity-webhook
 * and .../webhook-types, 2026-09-05 - no multi-chain pipeline exists),
 * which is the real reason only 5 of Veyro's 14 EVM chains are covered on
 * the free tier: the account gets 5 webhooks total, so 5 chains, not
 * 5-per-chain.
 */
@Injectable()
export class AlchemyService {
  private readonly logger = new Logger(AlchemyService.name);
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('ALCHEMY_API_KEY');
  }

  // Keyed by Alchemy's own network enum value (e.g. 'ETH_MAINNET'), the
  // same keyspace AlchemyWebhookGuard uses for ALCHEMY_WEBHOOK_SIGNING_KEYS
  // - one JSON object, not one env var per chain, since more chains are
  // expected to activate over time (chain-config.ts's alchemyNetwork doc
  // comment).
  getWebhookId(alchemyNetwork: string): string | undefined {
    const raw = this.configService.getOrThrow<string>('ALCHEMY_WEBHOOK_IDS');
    let ids: Record<string, string>;
    try {
      ids = JSON.parse(raw) as Record<string, string>;
    } catch {
      throw new Error('ALCHEMY_WEBHOOK_IDS is not valid JSON.');
    }
    return ids[alchemyNetwork];
  }

  /**
   * Adds one address to an existing Address Activity webhook. Returns
   * false - never throws - on any failure, same contract as
   * TatumService.createAddressSubscription: the caller's fallback is
   * simply "this address stays on the manual-admin-check path", not an
   * error condition. Idempotent on Alchemy's side (their own docs:
   * "identical requests can be made once or several times with the same
   * effect"), so a retry from the caller after a transient failure is
   * always safe.
   *
   * Endpoint/shape confirmed directly against
   * docs.alchemy.com/docs/data/webhooks/webhooks-api-endpoints/notify-api-endpoints/update-webhook-addresses
   * (2026-09-05): PATCH, `X-Alchemy-Token` header (the Notify API auth
   * token - a DIFFERENT value from the per-webhook signing key
   * AlchemyWebhookGuard checks incoming deliveries against), body
   * `{ webhook_id, addresses_to_add, addresses_to_remove }`. NOT yet
   * verified against a real live response (no funded Alchemy account to
   * test against) - flagged here rather than silently assumed correct,
   * same posture as AlchemyWebhookService's own open question.
   */
  async addAddressToWebhook(
    webhookId: string,
    address: string,
  ): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(
        `${ALCHEMY_NOTIFY_BASE_URL}/update-webhook-addresses`,
        {
          method: 'PATCH',
          headers: {
            'X-Alchemy-Token': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webhook_id: webhookId,
            addresses_to_add: [address],
            addresses_to_remove: [],
          }),
        },
        REQUEST_TIMEOUT_MS,
      );

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.warn(
          `Alchemy address registration not applied for webhook ${webhookId} address ${address} (falls back to manual admin check): ${res.status} ${body}`,
        );
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn(
        `Alchemy address registration request failed for webhook ${webhookId} address ${address} (falls back to manual admin check): ${(err as Error).message}`,
      );
      return false;
    }
  }
}
