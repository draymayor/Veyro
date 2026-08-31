import { Module } from '@nestjs/common';
import { WithdrawalPinController } from './withdrawal-pin.controller';
import { WithdrawalPinService } from './withdrawal-pin.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [WithdrawalPinController],
  providers: [WithdrawalPinService],
})
export class WithdrawalPinModule {}
