import { Controller, Get } from '@nestjs/common';
import { FxRateService } from './fx.service';

// Public USD-based FX rates, so any wallet-currency display can convert
// live instead of freezing on the rate from whenever it first rendered.
@Controller('fx')
export class FxController {
  constructor(private readonly fxRateService: FxRateService) {}

  @Get('rates')
  getRates() {
    return this.fxRateService.getUsdRates();
  }
}
