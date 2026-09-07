import { Module } from '@nestjs/common';
import { ProviderHealthService } from './provider-health.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [ProviderHealthService],
  exports: [ProviderHealthService],
})
export class ProviderHealthModule {}
