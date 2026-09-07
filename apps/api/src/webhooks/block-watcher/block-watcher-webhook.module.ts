import { Module } from '@nestjs/common';
import { BlockWatcherWebhookController } from './block-watcher-webhook.controller';
import { BlockWatcherWebhookService } from './block-watcher-webhook.service';
import { BlockWatcherWebhookGuard } from './block-watcher-webhook.guard';
import { DepositDetectionModule } from '../../deposit-detection/deposit-detection.module';

@Module({
  imports: [DepositDetectionModule],
  controllers: [BlockWatcherWebhookController],
  providers: [BlockWatcherWebhookService, BlockWatcherWebhookGuard],
})
export class BlockWatcherWebhookModule {}
