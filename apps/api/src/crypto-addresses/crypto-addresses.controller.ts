import { Controller, Get, Header, Param, Req, UseGuards } from '@nestjs/common';
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

  // no-store: this response is per-user and carries no Vary: Authorization,
  // so without an explicit cache directive Express's default ETag behavior
  // lets a browser reuse one account's cached body (or a stale conditional
  // revalidation) for a completely different account on the same profile,
  // since the URL alone is identical across users. Confirmed reproducible
  // via a stale-cache session returning 304 with no corresponding row ever
  // written for that user - see the incident writeup this fix closes.
  @Get(':symbol/:network')
  @Header('Cache-Control', 'no-store')
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
