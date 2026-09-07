import { Module } from '@nestjs/common';
import { CryptoAddressesController } from './crypto-addresses.controller';
import { CryptoAddressesService } from './crypto-addresses.service';
import { TatumService } from './tatum.service';
import { AlchemyService } from './alchemy.service';
import { AuthModule } from '../auth/auth.module';
import { ProviderHealthModule } from '../provider-health/provider-health.module';

@Module({
  imports: [AuthModule, ProviderHealthModule],
  controllers: [CryptoAddressesController],
  providers: [CryptoAddressesService, TatumService, AlchemyService],
})
export class CryptoAddressesModule {}
