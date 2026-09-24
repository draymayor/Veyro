import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import type { WithdrawalMethod } from './withdrawals.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';

// Withdrawal Request page (docs/context.md). The mandatory withdrawal PIN
// check (product-rules.md rule 18a) happens client-side via
// POST /withdrawal-pin/verify before this endpoint is ever called.
//
// Withdrawals are free to the user - Veyro pays the real network fee out of
// the consolidation wallet on top of the requested amount, same as always
// (see apps/consolidator), it's just never shown or estimated here anymore;
// nothing about that payout logic changes with the display being gone.
@Controller('withdrawals')
@UseGuards(SupabaseAuthGuard)
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

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
