import { Module } from '@nestjs/common';
import { BonusWithdrawalLockService } from './bonus-withdrawal-lock.service';
import { BonusReminderService } from './bonus-reminder.service';
import { CryptoPriceModule } from '../crypto-price/crypto-price.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CryptoPriceModule, NotificationsModule],
  providers: [BonusWithdrawalLockService, BonusReminderService],
  exports: [BonusWithdrawalLockService],
})
export class BonusesModule {}
