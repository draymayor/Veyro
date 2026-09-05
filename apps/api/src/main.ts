import { NestFactory } from '@nestjs/core';
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
  await app.listen(process.env.PORT ?? 8080);
}
void bootstrap();
