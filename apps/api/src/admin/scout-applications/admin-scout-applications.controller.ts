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
import { AdminScoutApplicationsService } from './admin-scout-applications.service';
import { AdminAuthGuard } from '../admin-auth.guard';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../../auth/supabase-auth.guard';

@Controller('admin/scout-applications')
@UseGuards(SupabaseAuthGuard, AdminAuthGuard)
export class AdminScoutApplicationsController {
  constructor(
    private readonly adminScoutApplicationsService: AdminScoutApplicationsService,
  ) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.adminScoutApplicationsService.list({ status });
  }

  @Get(':applicationId')
  detail(@Param('applicationId') applicationId: string) {
    return this.adminScoutApplicationsService.detail(applicationId);
  }

  @Post(':applicationId/approve')
  approve(
    @Req() req: AuthenticatedRequest,
    @Param('applicationId') applicationId: string,
  ) {
    return this.adminScoutApplicationsService.approve(
      req.user.id,
      applicationId,
    );
  }

  @Post(':applicationId/reject')
  reject(
    @Req() req: AuthenticatedRequest,
    @Param('applicationId') applicationId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminScoutApplicationsService.reject(
      req.user.id,
      applicationId,
      reason,
    );
  }
}
