import { Module } from '@nestjs/common';
import { DepositConfirmationService } from './deposit-confirmation.service';
import { TatumChainDataService } from './tatum-chain-data.service';
import { CryptoWalletModule } from '../crypto-wallet/crypto-wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProviderHealthModule } from '../provider-health/provider-health.module';
import { EarnModule } from '../earn/earn.module';
import { WelcomeBonusModule } from '../welcome-bonus/welcome-bonus.module';

@Module({
  imports: [
    CryptoWalletModule,
    NotificationsModule,
    ProviderHealthModule,
    EarnModule,
    WelcomeBonusModule,
  ],
  providers: [DepositConfirmationService, TatumChainDataService],
})
export class CryptoDepositEventsModule {}
