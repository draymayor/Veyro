import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';

/**
 * Verifies an inbound Alchemy webhook is genuinely from Alchemy, not any
 * POST pretending to be one - confirmed directly against Alchemy's own
 * docs (docs.alchemy.com/docs/how-to-verify-webhook-signatures, cross-
 * checked against a second independent source since the primary page
 * intermittently 404'd during research, 2026-09-05), NOT assumed to match
 * Tatum's HMAC scheme (see TatumWebhookGuard) - it doesn't:
 *
 * - Header is `X-Alchemy-Signature`, algorithm is HMAC-SHA256, hex-encoded
 *   (no `sha256=` prefix, no timestamp component).
 * - Computed over the EXACT RAW REQUEST BYTES, not a parsed-then-
 *   restringified body - Alchemy's own docs are explicit that "a re-
 *   serialized JSON body will not match". This is the opposite of Tatum's
 *   scheme, which deliberately hashes `JSON.stringify(body)` per Tatum's
 *   own documented algorithm. That's why this guard needs Nest's rawBody
 *   capture (`NestFactory.create(AppModule, { rawBody: true })` in
 *   main.ts) rather than reusing Tatum's `req.body` + JSON.stringify
 *   approach - doing that here would silently reject every real delivery.
 * - The signing key is PER-WEBHOOK, not account-wide like Tatum's single
 *   TATUM_WEBHOOK_HMAC_SECRET - each Alchemy webhook (one per active EVM
 *   chain, see chain-config.ts's alchemyNetwork field) has its own key,
 *   copied from the Notify dashboard at webhook-creation time. That's why
 *   ALCHEMY_WEBHOOK_SIGNING_KEYS is a keyed-by-network JSON object rather
 *   than a single secret - which key to check against is read from the
 *   payload's own `event.network` field. This does NOT weaken the check:
 *   an attacker-controlled network value only selects which candidate key
 *   gets tried, the raw-byte HMAC itself still has to match that key
 *   exactly, so claiming the wrong network just fails against the wrong
 *   key rather than granting access.
 *
 * NOT yet verified against a real live delivery (no funded Alchemy account
 * to capture one against, same caveat Tatum's own chain mappings
 * originally lacked before their 2026-09-04 live captures) - flagged here
 * rather than silently assumed correct.
 */
@Injectable()
export class AlchemyWebhookGuard implements CanActivate {
  private readonly logger = new Logger(AlchemyWebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const receivedSignature = req.header('x-alchemy-signature');
    if (!receivedSignature) {
      this.logger.warn(
        `Alchemy webhook rejected: no x-alchemy-signature header present (content-type: ${req.header('content-type')}).`,
      );
      return false;
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      // Only reachable if rawBody capture is ever removed from main.ts -
      // a config bug, not a real request outcome. Fails closed rather
      // than falling back to req.body, which would silently mismatch
      // Alchemy's actual signing scheme (see class doc comment).
      this.logger.error(
        'Alchemy webhook rejected: no raw request body captured - rawBody must be enabled in main.ts.',
      );
      return false;
    }

    const network = (req.body as { event?: { network?: string } })?.event
      ?.network;
    const signingKey = network ? this.getSigningKeys()[network] : undefined;
    if (!signingKey) {
      this.logger.warn(
        `Alchemy webhook rejected: no configured signing key for network "${network}".`,
      );
      return false;
    }

    const expectedSignature = createHmac('sha256', signingKey)
      .update(rawBody)
      .digest('hex');

    const received = Buffer.from(receivedSignature);
    const expected = Buffer.from(expectedSignature);
    // timingSafeEqual throws on mismatched lengths rather than returning
    // false - an attacker-controlled header must never reach it un-checked.
    const matches =
      received.length === expected.length &&
      timingSafeEqual(received, expected);

    if (!matches) {
      this.logger.warn(
        `Alchemy webhook HMAC mismatch for network "${network}". receivedPrefix=${receivedSignature.slice(0, 12)} expectedPrefix=${expectedSignature.slice(0, 12)}`,
      );
    }

    return matches;
  }

  // Keyed by Alchemy's own network enum value (e.g. 'ETH_MAINNET'), the
  // same keyspace as ALCHEMY_WEBHOOK_IDS (crypto-addresses/alchemy.service.ts)
  // - one JSON object, not one env var per chain, since the active chain
  // count is expected to grow (see chain-config.ts's alchemyNetwork doc
  // comment) and a discrete env var per chain doesn't scale past a
  // handful.
  private getSigningKeys(): Record<string, string> {
    const raw = this.configService.getOrThrow<string>(
      'ALCHEMY_WEBHOOK_SIGNING_KEYS',
    );
    try {
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      throw new Error('ALCHEMY_WEBHOOK_SIGNING_KEYS is not valid JSON.');
    }
  }
}
