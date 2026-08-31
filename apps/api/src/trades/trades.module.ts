import { Module } from '@nestjs/common';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';
import { AuthModule } from '../auth/auth.module';
import { WalletModule } from '../wallet/wallet.module';
import { CryptoWalletModule } from '../crypto-wallet/crypto-wallet.module';
import { CryptoPriceModule } from '../crypto-price/crypto-price.module';

@Module({
  imports: [AuthModule, WalletModule, CryptoWalletModule, CryptoPriceModule],
  controllers: [TradesController],
  providers: [TradesService],
})
export class TradesModule {}
