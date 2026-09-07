import { Module } from '@nestjs/common';
import { BlockWatcherWebhookController } from './block-watcher-webhook.controller';
import { BlockWatcherWebhookService } from './block-watcher-webhook.service';
import { BlockWatcherWebhookGuard } from './block-watcher-webhook.guard';
import { DepositDetectionModule } from '../../deposit-detection/deposit-detection.module';
import { ProviderHealthModule } from '../../provider-health/provider-health.module';

@Module({
  imports: [DepositDetectionModule, ProviderHealthModule],
  controllers: [BlockWatcherWebhookController],
  providers: [BlockWatcherWebhookService, BlockWatcherWebhookGuard],
})
export class BlockWatcherWebhookModule {}
