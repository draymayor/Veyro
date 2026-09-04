import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';

/**
 * Verifies an inbound Tatum webhook is genuinely from Tatum, not any POST
 * pretending to be one - the first unauthenticated-by-session route in
 * this API (docs.tatum.io/docs/authenticating-notification-webhooks,
 * verified directly, not assumed): Tatum sends an `x-payload-hash` header
 * containing Base64(HMAC-SHA512(hmacSecret, JSON.stringify(body-with-no-
 * whitespace))). Per Tatum's own documented algorithm this hashes the
 * ALREADY-PARSED body re-stringified (`JSON.stringify(webhook.event.body)`
 * is their literal example), not the raw request bytes - so this
 * deliberately does NOT need raw-body-preserving middleware, just Nest's
 * normal parsed `req.body`, since both sides converge on the same
 * canonical string as long as neither reorders keys or loses numeric
 * precision, which JSON.stringify on either side won't do for this
 * payload's flat string/number fields.
 *
 * TATUM_WEBHOOK_HMAC_SECRET must match whatever secret was set via
 * Tatum's own "enable HMAC" endpoint for this API key - a one-time,
 * separate account-level setup step, not something this API re-sends on
 * every boot.
 */
@Injectable()
export class TatumWebhookGuard implements CanActivate {
  private readonly logger = new Logger(TatumWebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const receivedHash = req.header('x-payload-hash');
    if (!receivedHash) {
      this.logger.warn(
        `Tatum webhook rejected: no x-payload-hash header present (content-type: ${req.header('content-type')}).`,
      );
      return false;
    }

    const secret = this.configService.getOrThrow<string>(
      'TATUM_WEBHOOK_HMAC_SECRET',
    );
    const canonicalBody = JSON.stringify(req.body ?? {});
    const expectedHash = createHmac('sha512', secret)
      .update(canonicalBody)
      .digest('base64');

    const received = Buffer.from(receivedHash);
    const expected = Buffer.from(expectedHash);
    // timingSafeEqual throws on mismatched lengths rather than returning
    // false - an attacker-controlled header must never reach it un-checked.
    const matches =
      received.length === expected.length &&
      timingSafeEqual(received, expected);

    if (!matches) {
      // TEMPORARY diagnostic logging (2026-09-04): a real Tatum-delivered
      // webhook (confirmed via Cloud Run access logs - genuine axios
      // user-agent, 3 real retries) was rejected here while a synthetic
      // curl test with a hand-computed hash over the same JSON.stringify
      // shape passed - meaning req.body, once parsed by Express, doesn't
      // roundtrip to the exact same string Tatum hashed. Logging the
      // reconstructed body and both hashes (never the secret) to find the
      // exact mismatch (extra/reordered fields, number formatting,
      // content-type mismatch) on the next real delivery, rather than
      // guessing at a fix. Remove once the real cause is confirmed and
      // fixed.
      this.logger.warn(
        `Tatum webhook HMAC mismatch. content-type=${req.header('content-type')} ` +
          `canonicalBody=${canonicalBody} receivedHash=${receivedHash} expectedHash=${expectedHash}`,
      );
    }

    return matches;
  }
}
