import { Module } from '@nestjs/common';
import { EarnController } from './earn.controller';
import { EarnService } from './earn.service';
import { AuthModule } from '../auth/auth.module';
import { CryptoWalletModule } from '../crypto-wallet/crypto-wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BonusesModule } from '../bonuses/bonuses.module';

@Module({
  imports: [AuthModule, CryptoWalletModule, NotificationsModule, BonusesModule],
  controllers: [EarnController],
  providers: [EarnService],
  exports: [EarnService],
})
export class EarnModule {}
