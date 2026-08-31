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
import { AdminUsersService } from './admin-users.service';
import { AdminAuthGuard } from '../admin-auth.guard';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../../auth/supabase-auth.guard';

// User Management (docs/admin-guide.md). Same guard pair as every other
// admin route.
@Controller('admin/users')
@UseGuards(SupabaseAuthGuard, AdminAuthGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  list(@Query('search') search?: string, @Query('status') status?: string) {
    return this.adminUsersService.list({ search, status });
  }

  @Get(':userId')
  detail(@Param('userId') userId: string) {
    return this.adminUsersService.detail(userId);
  }

  @Post(':userId/account-status')
  setAccountStatus(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body('status') status: string,
  ) {
    return this.adminUsersService.setAccountStatus(req.user.id, userId, status);
  }

  // Also called from the Payout Processing page (docs/admin-guide.md: same
  // underlying flag, two access points).
  @Post(':userId/withdrawals-suspended')
  setWithdrawalsSuspended(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body('suspended') suspended: boolean,
  ) {
    return this.adminUsersService.setWithdrawalsSuspended(
      req.user.id,
      userId,
      suspended,
    );
  }

  @Post(':userId/reset-totp')
  resetTotp(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminUsersService.resetTotp(req.user.id, userId, reason);
  }

  @Post(':userId/reset-withdrawal-pin')
  resetWithdrawalPin(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminUsersService.resetWithdrawalPin(
      req.user.id,
      userId,
      reason,
    );
  }
}
