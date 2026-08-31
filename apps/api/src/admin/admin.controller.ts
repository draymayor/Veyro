import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';

// Every admin route must verify both a valid session (SupabaseAuthGuard)
// and admin access (AdminAuthGuard, checking users.is_admin), server-side,
// per docs/context.md's Admin Authentication Architecture, never a
// client-side-only hide.
@Controller('admin')
@UseGuards(SupabaseAuthGuard, AdminAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Called by the frontend admin layout (apps/web/src/app/admin/layout.tsx)
  // to verify admin access server-side before rendering any admin page.
  // Reaching this handler at all means both guards above passed.
  @Get('session')
  getSession(@Req() req: AuthenticatedRequest) {
    return { id: req.user.id };
  }
}
