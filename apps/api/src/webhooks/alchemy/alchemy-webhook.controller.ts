import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AlchemyWebhookGuard } from './alchemy-webhook.guard';
import { AlchemyWebhookService } from './alchemy-webhook.service';
import type { AlchemyAddressActivityPayload } from './alchemy-webhook.service';

// Deliberately excluded from the global 'api/v1' prefix (see main.ts) -
// same posture as /webhooks/tatum: a third party's own callback URL, a
// plain top-level path is clearer than versioning it. Guarded by
// AlchemyWebhookGuard's X-Alchemy-Signature HMAC check, not a Supabase
// session. One route covers every active EVM chain - the payload's own
// event.network field says which, not one route per chain.
@Controller('webhooks/alchemy')
export class AlchemyWebhookController {
  constructor(private readonly alchemyWebhookService: AlchemyWebhookService) {}

  @Post()
  @UseGuards(AlchemyWebhookGuard)
  @HttpCode(200)
  async handle(@Body() body: AlchemyAddressActivityPayload) {
    await this.alchemyWebhookService.handleAddressActivity(body);
    return { received: true };
  }
}
