import { Module } from '@nestjs/common';
import { CryptoAddressesController } from './crypto-addresses.controller';
import { CryptoAddressesService } from './crypto-addresses.service';
import { TatumService } from './tatum.service';
import { AlchemyService } from './alchemy.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CryptoAddressesController],
  providers: [CryptoAddressesService, TatumService, AlchemyService],
})
export class CryptoAddressesModule {}
