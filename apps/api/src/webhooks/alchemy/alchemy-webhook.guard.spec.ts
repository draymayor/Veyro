import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlchemyWebhookGuard } from './alchemy-webhook.guard';

// Fixture computed by hand (no equivalent "Alchemy's own documented
// worked example" exists the way Tatum's did) directly against the
// algorithm both Alchemy's own docs and a second independent source
// agree on: `crypto.createHmac('sha256', signingKey).update(rawBody,
// 'utf8').digest('hex')` over the EXACT raw body string below (computed
// in a real Node process, 2026-09-05) - see AlchemyWebhookGuard's doc
// comment for why this must be the raw string, not a re-stringified
// object.
const SIGNING_KEY = 'whsec_test_fixture_signing_key';
// Deliberately includes spaces after colons/commas - a realistic shape for
// bytes as actually received over HTTP, which JSON.stringify on the parsed
// object will NOT reproduce (it emits no whitespace) - exactly the
// divergence the "rejects a re-serialized body" test below exercises.
const RAW_BODY =
  '{"webhookId": "wh_test123", "id": "whevt_test456", "type": "ADDRESS_ACTIVITY", "event": {"network": "ETH_MAINNET", "activity": [{"fromAddress": "0xaaa", "toAddress": "0xbbb", "value": 1.5, "asset": "ETH", "category": "external", "hash": "0xhash1"}]}}';
const PARSED_BODY = JSON.parse(RAW_BODY) as unknown;
const EXPECTED_SIGNATURE =
  '33147014c8e4f8643cbbaf3ab559b7abc246177c5cab636ac7480bc00de536aa';

// Minimal fake of Nest's ExecutionContext - the guard only ever calls
// context.switchToHttp().getRequest(), so that's all this needs to
// provide. rawBody/body/headers are the real inputs the REAL
// AlchemyWebhookGuard.canActivate reads and hashes - nothing about the
// guard's own logic is mocked or stubbed here.
function fakeContext(
  headers: Record<string, string>,
  body: unknown,
  rawBody: Buffer | undefined,
) {
  const req = {
    header: (name: string) => headers[name.toLowerCase()],
    body,
    rawBody,
  };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function fakeConfigService(signingKeys: Record<string, string>): ConfigService {
  return {
    getOrThrow: () => JSON.stringify(signingKeys),
  } as unknown as ConfigService;
}

describe('AlchemyWebhookGuard', () => {
  const guard = new AlchemyWebhookGuard(
    fakeConfigService({ ETH_MAINNET: SIGNING_KEY }),
  );

  it('accepts a correctly-signed payload for a configured network', () => {
    const context = fakeContext(
      { 'x-alchemy-signature': EXPECTED_SIGNATURE },
      PARSED_BODY,
      Buffer.from(RAW_BODY, 'utf8'),
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects a signature computed over the parsed-then-restringified body instead of the raw bytes', () => {
    // Same JS object, re-stringified without RAW_BODY's whitespace -
    // exactly the failure mode this guard exists to avoid (see its doc
    // comment: "a re-serialized JSON body will not match"). If the guard
    // ever hashed req.body via JSON.stringify (Tatum's own approach)
    // instead of req.rawBody, this would wrongly pass.
    const restringified = Buffer.from(JSON.stringify(PARSED_BODY), 'utf8');
    expect(restringified.equals(Buffer.from(RAW_BODY, 'utf8'))).toBe(false);
    const context = fakeContext(
      { 'x-alchemy-signature': EXPECTED_SIGNATURE },
      PARSED_BODY,
      restringified,
    );
    expect(guard.canActivate(context)).toBe(false);
  });

  it('rejects a tampered raw body against the original signature', () => {
    const tampered = RAW_BODY.replace('"value": 1.5', '"value": 999999');
    const context = fakeContext(
      { 'x-alchemy-signature': EXPECTED_SIGNATURE },
      JSON.parse(tampered),
      Buffer.from(tampered, 'utf8'),
    );
    expect(guard.canActivate(context)).toBe(false);
  });

  it('rejects a request with no x-alchemy-signature header at all', () => {
    const context = fakeContext({}, PARSED_BODY, Buffer.from(RAW_BODY, 'utf8'));
    expect(guard.canActivate(context)).toBe(false);
  });

  it('rejects when no raw body was captured, even with a valid-looking signature', () => {
    const context = fakeContext(
      { 'x-alchemy-signature': EXPECTED_SIGNATURE },
      PARSED_BODY,
      undefined,
    );
    expect(guard.canActivate(context)).toBe(false);
  });

  it('rejects a network with no configured signing key', () => {
    const otherNetworkBody = {
      ...(PARSED_BODY as Record<string, unknown>),
      event: { network: 'MATIC_MAINNET', activity: [] },
    };
    const context = fakeContext(
      { 'x-alchemy-signature': EXPECTED_SIGNATURE },
      otherNetworkBody,
      Buffer.from(JSON.stringify(otherNetworkBody), 'utf8'),
    );
    expect(guard.canActivate(context)).toBe(false);
  });
});
