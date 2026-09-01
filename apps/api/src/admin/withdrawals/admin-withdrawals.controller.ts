import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminWithdrawalsService } from './admin-withdrawals.service';
import { AdminAuthGuard } from '../admin-auth.guard';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../../auth/supabase-auth.guard';

// GET /admin/withdrawals, the Payout Processing queue (docs/admin-guide.md),
// filterable by status/method. Same guard pair as every other admin route.
@Controller('admin/withdrawals')
@UseGuards(SupabaseAuthGuard, AdminAuthGuard)
export class AdminWithdrawalsController {
  constructor(
    private readonly adminWithdrawalsService: AdminWithdrawalsService,
  ) {}

  @Get()
  list(@Query('status') status?: string, @Query('method') method?: string) {
    return this.adminWithdrawalsService.list({ status, method });
  }

  // The crypto-approval toggle (docs/admin-guide.md, product-rules.md rule
  // 18b), lives ahead of the :withdrawalId sub-routes below since "settings"
  // is a static segment, not a param.
  @Get('settings')
  getSettings() {
    return this.adminWithdrawalsService.getSettings();
  }

  @Post('settings')
  updateSettings(
    @Req() req: AuthenticatedRequest,
    @Body('cryptoWithdrawalRequiresApproval')
    cryptoWithdrawalRequiresApproval: boolean,
  ) {
    return this.adminWithdrawalsService.updateSettings(
      req.user.id,
      cryptoWithdrawalRequiresApproval,
    );
  }

  @Post(':withdrawalId/processing')
  markProcessing(
    @Req() req: AuthenticatedRequest,
    @Param('withdrawalId') withdrawalId: string,
  ) {
    return this.adminWithdrawalsService.markProcessing(
      req.user.id,
      withdrawalId,
    );
  }

  // Paid requires a transaction_reference note (docs/admin-guide.md: "marks
  // the withdrawal Paid with a reference note"), enforced server-side in
  // the service, not just a required form field on the frontend.
  // The signing-mode approval gate (docs/database-schema.md's Withdrawal
  // signing mode section): distinct from markProcessing above, which
  // governs the separate requires-approval gate on the request itself.
  @Post(':withdrawalId/approve-signing')
  approveForSigning(
    @Req() req: AuthenticatedRequest,
    @Param('withdrawalId') withdrawalId: string,
  ) {
    return this.adminWithdrawalsService.approveForSigning(
      req.user.id,
      withdrawalId,
    );
  }

  @Post(':withdrawalId/paid')
  markPaid(
    @Req() req: AuthenticatedRequest,
    @Param('withdrawalId') withdrawalId: string,
    @Body('transactionReference') transactionReference: string,
  ) {
    return this.adminWithdrawalsService.markPaid(
      req.user.id,
      withdrawalId,
      transactionReference,
    );
  }

  @Post(':withdrawalId/failed')
  markFailed(
    @Req() req: AuthenticatedRequest,
    @Param('withdrawalId') withdrawalId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminWithdrawalsService.markFailed(
      req.user.id,
      withdrawalId,
      reason,
    );
  }
}
