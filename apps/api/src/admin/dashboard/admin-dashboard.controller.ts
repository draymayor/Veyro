import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminAuthGuard } from '../admin-auth.guard';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';

// GET /admin/dashboard: top-level metrics + notification counts
// (docs/admin-guide.md's Dashboard Overview). Same guard pair as every
// other admin route: SupabaseAuthGuard for a valid session, AdminAuthGuard
// for is_admin.
@Controller('admin/dashboard')
@UseGuards(SupabaseAuthGuard, AdminAuthGuard)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  getMetrics() {
    return this.adminDashboardService.getMetrics();
  }
}
