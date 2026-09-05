import { Module } from '@nestjs/common';
import { AlchemyWebhookController } from './alchemy-webhook.controller';
import { AlchemyWebhookService } from './alchemy-webhook.service';
import { AlchemyWebhookGuard } from './alchemy-webhook.guard';
import { DepositDetectionModule } from '../../deposit-detection/deposit-detection.module';

@Module({
  imports: [DepositDetectionModule],
  controllers: [AlchemyWebhookController],
  providers: [AlchemyWebhookService, AlchemyWebhookGuard],
})
export class AlchemyWebhookModule {}
