import { Module } from '@nestjs/common';
import { WithdrawalsController } from './withdrawals.controller';
import { WithdrawalsService } from './withdrawals.service';
import { AuthModule } from '../auth/auth.module';
import { WalletModule } from '../wallet/wallet.module';
import { CryptoWalletModule } from '../crypto-wallet/crypto-wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { NetworkFeesModule } from '../network-fees/network-fees.module';
import { ScoutModule } from '../scout/scout.module';

@Module({
  imports: [
    AuthModule,
    WalletModule,
    CryptoWalletModule,
    NotificationsModule,
    NetworkFeesModule,
    ScoutModule,
  ],
  controllers: [WithdrawalsController],
  providers: [WithdrawalsService],
})
export class WithdrawalsModule {}
