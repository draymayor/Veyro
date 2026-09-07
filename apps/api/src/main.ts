import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true makes Nest additionally capture the exact, unparsed
  // request bytes as req.rawBody (a Buffer) alongside the normal parsed
  // req.body, for every route - added for AlchemyWebhookGuard, which
  // (unlike TatumWebhookGuard) MUST verify its HMAC over the raw bytes,
  // not a parsed-then-restringified body; see that guard's doc comment
  // for why the two providers' signature schemes genuinely differ.
  // Harmless for every other route: nothing else reads req.rawBody.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  // 'webhooks/tatum' and 'webhooks/alchemy' are excluded the same way
  // 'health' is: each is a third-party callback URL (registered with that
  // provider directly, not through this app's own routing), a plain
  // top-level path reads clearer than versioning someone else's webhook
  // target.
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'webhooks/tatum', 'webhooks/alchemy'],
  });
  // The web app runs on a different origin/port (e.g. localhost:3000 vs
  // this API's localhost:3001), so without CORS every browser fetch from
  // it, not just this one, would be blocked before it even reaches a
  // controller. CORS_ORIGIN allows overriding for staging/production, and
  // accepts a comma-separated list since production currently has more
  // than one valid frontend origin (stable Vercel alias, branch alias,
  // and eventually veyro.best once DNS is connected).
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : 'http://localhost:3000';
  app.enableCors({ origin: corsOrigin });
  // Global no-store: Express's default ETag is computed from response body
  // alone, with no Vary: Authorization. For any authenticated GET whose URL
  // is identical across callers (auth/me, bank-accounts, referrals/table,
  // withdrawal-pin/status, admin/session, ...), a browser can send another
  // account's stale If-None-Match for that URL and get a legitimate 304 back
  // for a completely different account (see PR #12, which first fixed this
  // one-off on crypto-addresses). Setting no-store on every response - not
  // just per route - closes the whole class at once, including any future
  // per-user GET endpoint that would otherwise ship with the same hole.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  await app.listen(process.env.PORT ?? 8080);
}
void bootstrap();
