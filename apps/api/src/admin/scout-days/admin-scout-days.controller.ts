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
import { AdminScoutDaysService } from './admin-scout-days.service';
import { AdminAuthGuard } from '../admin-auth.guard';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../../auth/supabase-auth.guard';

@Controller('admin/scout-days')
@UseGuards(SupabaseAuthGuard, AdminAuthGuard)
export class AdminScoutDaysController {
  constructor(private readonly adminScoutDaysService: AdminScoutDaysService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.adminScoutDaysService.list({ status });
  }

  @Get(':dayId')
  detail(@Param('dayId') dayId: string) {
    return this.adminScoutDaysService.detail(dayId);
  }

  @Post(':dayId/links/:linkId/approve')
  approveLink(
    @Req() req: AuthenticatedRequest,
    @Param('dayId') dayId: string,
    @Param('linkId') linkId: string,
  ) {
    return this.adminScoutDaysService.reviewLink(
      req.user.id,
      dayId,
      linkId,
      'approve',
    );
  }

  @Post(':dayId/links/:linkId/reject')
  rejectLink(
    @Req() req: AuthenticatedRequest,
    @Param('dayId') dayId: string,
    @Param('linkId') linkId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminScoutDaysService.reviewLink(
      req.user.id,
      dayId,
      linkId,
      'reject',
      reason,
    );
  }

  @Post(':dayId/approve')
  approveDay(@Req() req: AuthenticatedRequest, @Param('dayId') dayId: string) {
    return this.adminScoutDaysService.approveDay(req.user.id, dayId);
  }

  @Post(':dayId/reject')
  rejectDay(
    @Req() req: AuthenticatedRequest,
    @Param('dayId') dayId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminScoutDaysService.rejectDay(req.user.id, dayId, reason);
  }
}
