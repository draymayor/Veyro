import { Module } from '@nestjs/common';
import { DepositConfirmationService } from './deposit-confirmation.service';
import { TatumChainDataService } from './tatum-chain-data.service';
import { CryptoWalletModule } from '../crypto-wallet/crypto-wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CryptoWalletModule, NotificationsModule],
  providers: [DepositConfirmationService, TatumChainDataService],
})
export class CryptoDepositEventsModule {}
