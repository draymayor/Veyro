import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import type { WithdrawalMethod } from './withdrawals.service';
import { NetworkFeesService } from '../network-fees/network-fees.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';

// Withdrawal Request page (docs/context.md). The mandatory withdrawal PIN
// check (product-rules.md rule 18a) happens client-side via
// POST /withdrawal-pin/verify before this endpoint is ever called.
@Controller('withdrawals')
@UseGuards(SupabaseAuthGuard)
export class WithdrawalsController {
  constructor(
    private readonly withdrawalsService: WithdrawalsService,
    private readonly networkFeesService: NetworkFeesService,
  ) {}

  // Live network fee for the crypto withdrawal amount screen - the exact
  // same lookup/formula the admin Network Fees panel and the
  // sweeper/consolidator use for this chain (see NetworkFeesService), not a
  // separate estimate. `network` is a CryptoNetwork.label value (e.g.
  // 'Bitcoin', 'ERC20', 'TRC20'). Withdrawals pay this fee on top of the
  // requested amount from the consolidation wallet - it is never deducted
  // from what the user receives, so this is a display-only read, no
  // withdrawal amount math happens here.
  @Get('crypto/network-fee')
  getCryptoNetworkFee(@Query('network') network: string) {
    return this.networkFeesService.getNetworkFee(network);
  }

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body('amount') amount: number,
    @Body('method') method: WithdrawalMethod,
    @Body('bankAccountId') bankAccountId?: string,
    @Body('paypalEmail') paypalEmail?: string,
    @Body('cryptoSymbol') cryptoSymbol?: string,
    @Body('cryptoNetwork') cryptoNetwork?: string,
    @Body('cryptoPayoutAddress') cryptoPayoutAddress?: string,
  ) {
    return this.withdrawalsService.create(req.user, {
      amount,
      method,
      bankAccountId,
      paypalEmail,
      cryptoSymbol,
      cryptoNetwork,
      cryptoPayoutAddress,
    });
  }
}
