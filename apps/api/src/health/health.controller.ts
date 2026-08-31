import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

// Cloud Run's own health/liveness probes hit this frequently; the global
// rate limit must never apply here or a busy probe interval could get the
// instance flagged unhealthy by its own infrastructure.
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  check() {
    return { status: 'ok' };
  }
}
