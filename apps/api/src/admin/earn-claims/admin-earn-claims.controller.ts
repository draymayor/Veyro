import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminEarnClaimsService } from './admin-earn-claims.service';
import { AdminAuthGuard } from '../admin-auth.guard';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';

// GET /admin/earn-claims - read-only monitoring view of the Earn bonus
// pool (docs/database-schema.md's earn_bonus_claims section). Same guard
// pair as every other admin route.
@Controller('admin/earn-claims')
@UseGuards(SupabaseAuthGuard, AdminAuthGuard)
export class AdminEarnClaimsController {
  constructor(
    private readonly adminEarnClaimsService: AdminEarnClaimsService,
  ) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.adminEarnClaimsService.list({ status });
  }
}
