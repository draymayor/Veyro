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
  list(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('unread') unread?: string,
  ) {
    return this.adminSupportService.list({
      status,
      category,
      unread: unread === 'true',
    });
  }

  @Get('threads/:ticketId')
  detail(@Param('ticketId') ticketId: string) {
    return this.adminSupportService.detail(ticketId);
  }

  @Post('threads/:ticketId/messages')
  sendMessage(
    @Req() req: AuthenticatedRequest,
    @Param('ticketId') ticketId: string,
    @Body('body') body: string,
  ) {
    return this.adminSupportService.sendMessage(req.user.id, ticketId, body);
  }

  @Post('threads/:ticketId/resolve')
  resolve(
    @Req() req: AuthenticatedRequest,
    @Param('ticketId') ticketId: string,
  ) {
    return this.adminSupportService.resolve(req.user.id, ticketId);
  }
}
