import { Controller, Get } from '@nestjs/common';
import { CryptoPriceService } from './crypto-price.service';

// Mounted at "crypto" (not "crypto-price") so it serves GET /crypto/rates
// per docs/api-spec.md's public crypto catalog routes.
@Controller('crypto')
export class CryptoPriceController {
  constructor(private readonly cryptoPriceService: CryptoPriceService) {}

  @Get('rates')
  getRates() {
    return this.cryptoPriceService.getRates();
  }
}
