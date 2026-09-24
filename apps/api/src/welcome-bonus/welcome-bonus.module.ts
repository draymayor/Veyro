import { Module } from '@nestjs/common';
import { WelcomeBonusService } from './welcome-bonus.service';
import { CryptoWalletModule } from '../crypto-wallet/crypto-wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BonusesModule } from '../bonuses/bonuses.module';

@Module({
  imports: [CryptoWalletModule, NotificationsModule, BonusesModule],
  providers: [WelcomeBonusService],
  exports: [WelcomeBonusService],
})
export class WelcomeBonusModule {}
