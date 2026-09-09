import { Module } from '@nestjs/common';
import { EarnController } from './earn.controller';
import { EarnService } from './earn.service';
import { AuthModule } from '../auth/auth.module';
import { FxModule } from '../fx/fx.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, FxModule, WalletModule, NotificationsModule],
  controllers: [EarnController],
  providers: [EarnService],
  exports: [EarnService],
})
export class EarnModule {}
