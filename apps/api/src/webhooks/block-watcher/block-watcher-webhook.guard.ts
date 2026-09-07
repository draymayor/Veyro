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
 * Verifies an inbound request is genuinely from this platform's own
 * self-hosted block-watcher service (apps/block-watcher), not any POST
 * pretending to be one. Unlike Tatum/Alchemy, block-watcher is a first-party
 * service this codebase controls end to end, so there's no third-party
 * signing scheme to match - a single shared secret (BLOCK_WATCHER_SHARED_SECRET,
 * generated once and given to both apps/api and apps/block-watcher via their
 * own env/Secret Manager config) HMAC'd over the parsed-and-restringified
 * body is enough, same shape as TatumWebhookGuard rather than Alchemy's
 * raw-byte scheme, since both sides here are our own code and will always
 * agree on JSON.stringify's output for this flat payload shape.
 */
@Injectable()
export class BlockWatcherWebhookGuard implements CanActivate {
  private readonly logger = new Logger(BlockWatcherWebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const receivedSignature = req.header('x-block-watcher-signature');
    if (!receivedSignature) {
      this.logger.warn(
        'block-watcher webhook rejected: no x-block-watcher-signature header present.',
      );
      return false;
    }

    const secret = this.configService.getOrThrow<string>(
      'BLOCK_WATCHER_SHARED_SECRET',
    );
    const canonicalBody = JSON.stringify(req.body ?? {});
    const expectedSignature = createHmac('sha256', secret)
      .update(canonicalBody)
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
        `block-watcher webhook HMAC mismatch. receivedPrefix=${receivedSignature.slice(0, 12)} expectedPrefix=${expectedSignature.slice(0, 12)}`,
      );
    }

    return matches;
  }
}
