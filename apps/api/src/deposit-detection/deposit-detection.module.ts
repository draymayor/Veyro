import { Module } from '@nestjs/common';
import { DepositDetectionService } from './deposit-detection.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [DepositDetectionService],
  exports: [DepositDetectionService],
})
export class DepositDetectionModule {}
