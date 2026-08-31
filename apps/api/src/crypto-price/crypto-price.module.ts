import { Module } from '@nestjs/common';
import { CryptoPriceController } from './crypto-price.controller';
import { CryptoPriceService } from './crypto-price.service';
import { CryptoPayoutService } from './crypto-payout.service';
import { FxModule } from '../fx/fx.module';

@Module({
  imports: [FxModule],
  controllers: [CryptoPriceController],
  providers: [CryptoPriceService, CryptoPayoutService],
  exports: [CryptoPriceService, CryptoPayoutService],
})
export class CryptoPriceModule {}
