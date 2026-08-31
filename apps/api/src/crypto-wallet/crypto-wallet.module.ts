import { Module } from '@nestjs/common';
import { CryptoWalletService } from './crypto-wallet.service';

@Module({
  providers: [CryptoWalletService],
  exports: [CryptoWalletService],
})
export class CryptoWalletModule {}
