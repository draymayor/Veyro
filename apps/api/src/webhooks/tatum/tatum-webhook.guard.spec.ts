import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TatumWebhookGuard } from './tatum-webhook.guard';

// Fixture taken verbatim from Tatum's own documented worked example
// (docs.tatum.io/docs/authenticating-notification-webhooks) - secret,
// body, and resulting x-payload-hash all appear together on that page as
// one complete example. Independently re-verified by hand before trusting
// it here: `crypto.createHmac('sha512', HMAC_SECRET).update(JSON.stringify(WEBHOOK_BODY)).digest('base64')`
// was computed directly in a real Node process and matched EXPECTED_HASH
// byte-for-byte - this isn't just copied off the docs page on faith.
const HMAC_SECRET = 'c354b83b-d31b-4dda-9bab-d6a67715a1ed';
const WEBHOOK_BODY = {
  address: 'TJG7iciLGjsib9qhe6U6F7M2vxYJuDjWNM',
  amount: '20',
  counterAddress: 'TVf3RVEtzKtMfqQaCAWs9d4HKbC4bZGaWP',
  asset: 'TRON',
  blockNumber: 44087791,
  txId: '93442189d7bccbe009f8ab594831ff9d7d258cab712d74a404cd3dccdc4c6d69',
  type: 'native',
  tokenId: null,
  chain: 'tron-testnet',
  subscriptionType: 'ADDRESS_EVENT',
};
const EXPECTED_HASH =
  'WdhYQft+qP8LpYAdeOMncUzIZ7DSUWX9JVSjeGH3F4mCreUxtIpTl2VYigm+qUvkfSQ0lWmTrzADm4mGxSVcxA==';

// Minimal fake of Nest's ExecutionContext - the guard only ever calls
// context.switchToHttp().getRequest(), so that's all this needs to
// provide. The header/body values are the real inputs the REAL
// TatumWebhookGuard.canActivate reads and hashes - nothing about the
// guard's own logic is mocked or stubbed here.
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

describe('TatumWebhookGuard', () => {
  const guard = new TatumWebhookGuard(fakeConfigService(HMAC_SECRET));

  it("accepts Tatum's own documented example payload/hash pair", () => {
    const context = fakeContext(
      { 'x-payload-hash': EXPECTED_HASH },
      WEBHOOK_BODY,
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects a tampered body against the original hash', () => {
    const tampered = { ...WEBHOOK_BODY, amount: '999999' };
    const context = fakeContext({ 'x-payload-hash': EXPECTED_HASH }, tampered);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('rejects a request with no x-payload-hash header at all', () => {
    const context = fakeContext({}, WEBHOOK_BODY);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('rejects a well-formed but wrong hash of the same length', () => {
    const wrongHash = EXPECTED_HASH.slice(0, -4) + 'AAAA';
    const context = fakeContext({ 'x-payload-hash': wrongHash }, WEBHOOK_BODY);
    expect(guard.canActivate(context)).toBe(false);
  });
});
