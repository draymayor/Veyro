import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  // The Referrals page's table (docs/context.md), filterable by status
  // (Pending/Success), always scoped to the caller's own referrals.
  @UseGuards(SupabaseAuthGuard)
  @Get('table')
  table(@Req() req: AuthenticatedRequest, @Query('status') status?: string) {
    return this.referralsService.table(req.user, status);
  }
}
