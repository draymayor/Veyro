import { Module } from '@nestjs/common';
import { TatumWebhookController } from './tatum-webhook.controller';
import { TatumWebhookService } from './tatum-webhook.service';
import { TatumWebhookGuard } from './tatum-webhook.guard';
import { DepositDetectionModule } from '../../deposit-detection/deposit-detection.module';

@Module({
  imports: [DepositDetectionModule],
  controllers: [TatumWebhookController],
  providers: [TatumWebhookService, TatumWebhookGuard],
})
export class TatumWebhookModule {}
