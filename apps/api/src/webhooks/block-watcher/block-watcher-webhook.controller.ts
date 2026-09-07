import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { BlockWatcherWebhookGuard } from './block-watcher-webhook.guard';
import { BlockWatcherWebhookService } from './block-watcher-webhook.service';
import type { BlockWatcherDetectionPayload } from './block-watcher-webhook.service';

// Deliberately excluded from the global 'api/v1' prefix (see main.ts) - same
// posture as /webhooks/tatum and /webhooks/alchemy, even though the caller
// here (apps/block-watcher) is first-party, not a third party: this is a
// fixed integration target another deployable's config points at, and a
// plain top-level path is clearer than versioning it. Guarded by
// BlockWatcherWebhookGuard's shared-secret HMAC check, not a Supabase
// session, since block-watcher has no user session of its own.
@Controller('webhooks/block-watcher')
export class BlockWatcherWebhookController {
  constructor(
    private readonly blockWatcherWebhookService: BlockWatcherWebhookService,
  ) {}

  @Post()
  @UseGuards(BlockWatcherWebhookGuard)
  @HttpCode(200)
  async handle(@Body() body: BlockWatcherDetectionPayload) {
    await this.blockWatcherWebhookService.handleDetections(body);
    return { received: true };
  }
}
