import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AdminDepositsService } from './admin-deposits.service';
import { AdminAuthGuard } from '../admin-auth.guard';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../../auth/supabase-auth.guard';
import type { ManualDepositType } from './admin-deposits.service';

interface ManualDepositBody {
  userId: string;
  depositType: ManualDepositType;
  amount: number;
  symbol?: string;
  network?: string;
}

// Manual Deposit (docs/admin-guide.md): a review-before-confirm flow, the
// preview endpoint computes what would be credited without touching the
// ledger, the confirm endpoint requires a reason and actually executes.
// Same guard pair as every other admin route.
@Controller('admin/deposits/manual')
@UseGuards(SupabaseAuthGuard, AdminAuthGuard)
export class AdminDepositsController {
  constructor(private readonly adminDepositsService: AdminDepositsService) {}

  @Post('preview')
  preview(@Body() body: ManualDepositBody) {
    return this.adminDepositsService.quote({
      userId: body.userId,
      depositType: body.depositType,
      amount: Number(body.amount),
      symbol: body.symbol,
      network: body.network,
    });
  }

  @Post()
  execute(
    @Req() req: AuthenticatedRequest,
    @Body() body: ManualDepositBody & { reason: string },
  ) {
    return this.adminDepositsService.execute(
      req.user.id,
      {
        userId: body.userId,
        depositType: body.depositType,
        amount: Number(body.amount),
        symbol: body.symbol,
        network: body.network,
      },
      body.reason,
    );
  }
}
