import { Module } from '@nestjs/common';
import { TatumWebhookController } from './tatum-webhook.controller';
import { TatumWebhookService } from './tatum-webhook.service';
import { TatumWebhookGuard } from './tatum-webhook.guard';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [TatumWebhookController],
  providers: [TatumWebhookService, TatumWebhookGuard],
})
export class TatumWebhookModule {}
