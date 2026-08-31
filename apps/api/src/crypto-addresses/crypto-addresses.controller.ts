import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { CryptoAddressesService } from './crypto-addresses.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';

// Deposit Crypto and Sell Crypto (docs/context.md) both call this to get
// the current user's real deposit address for an asset/network, generated
// on first request rather than pre-generated for everyone upfront
// (docs/product-rules.md rule 16).
@Controller('crypto-addresses')
@UseGuards(SupabaseAuthGuard)
export class CryptoAddressesController {
  constructor(
    private readonly cryptoAddressesService: CryptoAddressesService,
  ) {}

  @Get(':symbol/:network')
  getOrCreate(
    @Req() req: AuthenticatedRequest,
    @Param('symbol') symbol: string,
    @Param('network') network: string,
  ) {
    return this.cryptoAddressesService.getOrCreateAddress(
      req.user.id,
      symbol.toUpperCase(),
      network,
    );
  }
}
