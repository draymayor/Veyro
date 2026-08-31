import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { CryptoPriceService } from './crypto-price.service';
import { CryptoPayoutService } from './crypto-payout.service';

function assertPresent(value: string | undefined, field: string): string {
  if (!value || !value.trim()) {
    throw new BadRequestException(`${field} is required`);
  }
  return value;
}

function parseAmount(raw: string | undefined): number {
  const value = Number(raw);
  if (!raw || !Number.isFinite(value) || value <= 0) {
    throw new BadRequestException('amount must be a positive number');
  }
  return value;
}

// Mounted at "crypto" (not "crypto-price") so it serves GET /crypto/rates
// per docs/api-spec.md's public crypto catalog routes.
@Controller('crypto')
export class CryptoPriceController {
  constructor(
    private readonly cryptoPriceService: CryptoPriceService,
    private readonly cryptoPayoutService: CryptoPayoutService,
  ) {}

  // Raw, unmarked-up CoinGecko market price. Stays exactly as-is: the rate
  // card ticker and every other "pure market price" display reads from
  // here, never from the payout quote below.
  @Get('rates')
  getRates() {
    return this.cryptoPriceService.getRates();
  }

  // What Veyro would actually pay: live price converted to `currency` via
  // the live FX rate, no markdown. Used by every screen that shows a
  // payout figure rather than a raw market price.
  @Get('payout')
  getPayout(
    @Query('symbol') symbol?: string,
    @Query('network') network?: string,
    @Query('amount') amount?: string,
    @Query('currency') currency?: string,
  ) {
    return this.cryptoPayoutService.getQuote({
      symbol: assertPresent(symbol, 'symbol'),
      network: assertPresent(network, 'network'),
      amount: parseAmount(amount),
      currency: assertPresent(currency, 'currency'),
    });
  }
}
