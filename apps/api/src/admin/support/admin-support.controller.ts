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
import { AdminSupportService } from './admin-support.service';
import { AdminAuthGuard } from '../admin-auth.guard';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../../auth/supabase-auth.guard';

// Support Inbox (docs/admin-guide.md): thread list, thread detail, admin
// reply, mark resolved. Same guard pair as every other admin route.
@Controller('admin/support')
@UseGuards(SupabaseAuthGuard, AdminAuthGuard)
export class AdminSupportController {
  constructor(private readonly adminSupportService: AdminSupportService) {}

  @Get('threads')
  list(@Query('status') status?: string, @Query('category') category?: string) {
    return this.adminSupportService.list({ status, category });
  }

  @Get('threads/:userId')
  detail(@Param('userId') userId: string) {
    return this.adminSupportService.detail(userId);
  }

  @Post('threads/:userId/messages')
  sendMessage(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body('body') body: string,
  ) {
    return this.adminSupportService.sendMessage(req.user.id, userId, body);
  }

  @Post('threads/:userId/resolve')
  resolve(@Req() req: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.adminSupportService.resolve(req.user.id, userId);
  }
}
