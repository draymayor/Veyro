import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { TatumWebhookGuard } from './tatum-webhook.guard';
import { TatumWebhookService } from './tatum-webhook.service';
import type { TatumAddressTransactionPayload } from './tatum-webhook.service';

// Deliberately excluded from the global 'api/v1' prefix (see main.ts) -
// this is the URL registered with Tatum at subscription-creation time
// (TATUM_WEBHOOK_URL), a plain top-level /webhooks/tatum path is clearer
// than versioning a third party's own callback. Guarded by HMAC
// verification (TatumWebhookGuard), not a Supabase session - the first
// route in this API with that shape. Always returns 200 once the HMAC
// check passes and the handler completes without throwing, even for a
// payload this API chooses to ignore (unrecognized chain, no matching
// address) - "ignored, not an error" and "genuinely failed, please
// retry" are deliberately different outcomes, see
// TatumWebhookService.handleAddressTransaction.
@Controller('webhooks/tatum')
export class TatumWebhookController {
  constructor(private readonly tatumWebhookService: TatumWebhookService) {}

  @Post()
  @UseGuards(TatumWebhookGuard)
  @HttpCode(200)
  async handle(@Body() body: TatumAddressTransactionPayload) {
    await this.tatumWebhookService.handleAddressTransaction(body);
    return { received: true };
  }
}
