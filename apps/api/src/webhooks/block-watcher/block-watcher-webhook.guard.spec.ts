import { createHmac } from 'crypto';
import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockWatcherWebhookGuard } from './block-watcher-webhook.guard';

const SHARED_SECRET = 'test_shared_secret';
const BODY = {
  detections: [
    {
      network: 'ERC20',
      address: '0xabc',
      txHash: '0xhash1',
      amount: 1.5,
      reportedSymbol: 'USDT',
    },
  ],
};

function signature(body: unknown, secret: string): string {
  return createHmac('sha256', secret)
    .update(JSON.stringify(body ?? {}))
    .digest('hex');
}

// Minimal fake of Nest's ExecutionContext - the guard only ever calls
// context.switchToHttp().getRequest(), same as AlchemyWebhookGuard's own
// spec. Unlike that guard, this one hashes req.body (JSON.stringify), not
// req.rawBody, since both ends of this integration are this codebase's own
// code (see the guard's doc comment) - no raw-body fixture needed.
function fakeContext(headers: Record<string, string>, body: unknown) {
  const req = {
    header: (name: string) => headers[name.toLowerCase()],
    body,
  };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function fakeConfigService(secret: string): ConfigService {
  return { getOrThrow: () => secret } as unknown as ConfigService;
}

describe('BlockWatcherWebhookGuard', () => {
  const guard = new BlockWatcherWebhookGuard(fakeConfigService(SHARED_SECRET));

  it('accepts a correctly-signed payload', () => {
    const context = fakeContext(
      { 'x-block-watcher-signature': signature(BODY, SHARED_SECRET) },
      BODY,
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects a tampered body against the original signature', () => {
    const validSignature = signature(BODY, SHARED_SECRET);
    const tampered = {
      detections: [{ ...BODY.detections[0], amount: 999999 }],
    };
    const context = fakeContext(
      { 'x-block-watcher-signature': validSignature },
      tampered,
    );
    expect(guard.canActivate(context)).toBe(false);
  });

  it('rejects a signature computed with the wrong secret', () => {
    const context = fakeContext(
      { 'x-block-watcher-signature': signature(BODY, 'wrong_secret') },
      BODY,
    );
    expect(guard.canActivate(context)).toBe(false);
  });

  it('rejects a request with no x-block-watcher-signature header at all', () => {
    const context = fakeContext({}, BODY);
    expect(guard.canActivate(context)).toBe(false);
  });
});
