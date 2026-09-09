import { Module } from '@nestjs/common';
import { NetworkFeesService } from './network-fees.service';
import { CryptoPriceModule } from '../crypto-price/crypto-price.module';

// Shared home for NetworkFeesService so both the admin Network Fees panel
// (admin/rates) and the user-facing crypto withdrawal fee display
// (crypto-price) reuse the exact same live fee lookups rather than each
// re-deriving their own.
@Module({
  imports: [CryptoPriceModule],
  providers: [NetworkFeesService],
  exports: [NetworkFeesService],
})
export class NetworkFeesModule {}
