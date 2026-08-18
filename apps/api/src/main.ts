import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  // The web app runs on a different origin/port (e.g. localhost:3000 vs
  // this API's localhost:3001), so without CORS every browser fetch from
  // it, not just this one, would be blocked before it even reaches a
  // controller. CORS_ORIGIN allows overriding for staging/production.
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  });
  await app.listen(process.env.PORT ?? 8080);
}
void bootstrap();
