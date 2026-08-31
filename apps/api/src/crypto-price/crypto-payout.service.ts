import { Injectable } from '@nestjs/common';
import { CryptoPriceService } from './crypto-price.service';
import { FxRateService } from '../fx/fx.service';
import { SupabaseService } from '../supabase/supabase.service';

export interface PayoutQuote {
  symbol: string;
  network: string;
  amount: number;
  currency: string;
  priceUsd: number;
  fxRate: number;
  marginPercentage: number;
  payout: number;
}

/**
 * The one place Veyro's crypto payout formula lives (docs/database-schema.md):
 *
 *   payout = amount * (coingecko_usd_price * (1 - margin_percentage/100)) * fx_rate
 *
 * margin_percentage is Veyro's spread, set per symbol/network in
 * crypto_assets and admin-adjustable. Every screen that shows what Veyro
 * would actually pay for a crypto sale must go through this. Raw market
 * price displays (the rate card ticker, etc.) call CryptoPriceService
 * directly instead, which never does the margin markdown or currency
 * conversion.
 */
@Injectable()
export class CryptoPayoutService {
  constructor(
    private readonly cryptoPriceService: CryptoPriceService,
    private readonly fxRateService: FxRateService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async getQuote(params: {
    symbol: string;
    network: string;
    amount: number;
    currency: string;
  }): Promise<PayoutQuote> {
    const symbol = params.symbol.toUpperCase();
    const currency = params.currency.toUpperCase();

    const [rates, fxRate, marginPercentage] = await Promise.all([
      this.cryptoPriceService.getRates(),
      this.fxRateService.getRate(currency),
      this.getMarginPercentage(symbol, params.network),
    ]);

    const priceUsd = rates[symbol]?.priceUsd ?? 0;
    const payout =
      params.amount * (priceUsd * (1 - marginPercentage / 100)) * fxRate;

    return {
      symbol,
      network: params.network,
      amount: params.amount,
      currency,
      priceUsd,
      fxRate,
      marginPercentage,
      payout,
    };
  }

  private async getMarginPercentage(
    symbol: string,
    network: string,
  ): Promise<number> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('crypto_assets')
      .select('margin_percentage')
      .eq('symbol', symbol)
      .eq('network', network)
      .maybeSingle();

    if (error || !data) {
      throw new Error(
        `No crypto_assets row for ${symbol}/${network}: cannot determine margin_percentage`,
      );
    }

    return Number(data.margin_percentage);
  }
}
