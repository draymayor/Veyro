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
import { AdminTradesService } from './admin-trades.service';
import { AdminAuthGuard } from '../admin-auth.guard';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../../auth/supabase-auth.guard';

// GET /admin/trades, the Trade Review queue (docs/admin-guide.md),
// filterable by status/asset type. Same guard pair as every other admin
// route (see admin.controller.ts): SupabaseAuthGuard for a valid session,
// AdminAuthGuard for is_admin.
@Controller('admin/trades')
@UseGuards(SupabaseAuthGuard, AdminAuthGuard)
export class AdminTradesController {
  constructor(private readonly adminTradesService: AdminTradesService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('assetType') assetType?: string,
  ) {
    return this.adminTradesService.list({ status, assetType });
  }

  @Get(':tradeId')
  detail(@Param('tradeId') tradeId: string) {
    return this.adminTradesService.detail(tradeId);
  }

  // On Approve: wallet ledger credited automatically, no separate manual
  // "credit wallet" step (docs/admin-guide.md's Trade Review section).
  @Post(':tradeId/approve')
  approve(@Req() req: AuthenticatedRequest, @Param('tradeId') tradeId: string) {
    return this.adminTradesService.approve(req.user.id, tradeId);
  }

  // On Reject: a reason is required and stored on the trade
  // (rejection_reason), surfaced to the user via the notifications table.
  @Post(':tradeId/reject')
  reject(
    @Req() req: AuthenticatedRequest,
    @Param('tradeId') tradeId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminTradesService.reject(req.user.id, tradeId, reason);
  }
}
