import { Body, Controller, Delete, Post, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';

interface PushSubscribeInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

@Controller('notifications')
@UseGuards(SupabaseAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('push-subscriptions')
  subscribe(
    @Req() req: AuthenticatedRequest,
    @Body() body: PushSubscribeInput,
  ) {
    return this.notificationsService.savePushSubscription(req.user.id, body);
  }

  @Delete('push-subscriptions')
  unsubscribe(
    @Req() req: AuthenticatedRequest,
    @Body() body: { endpoint: string },
  ) {
    return this.notificationsService.deletePushSubscription(
      req.user.id,
      body.endpoint,
    );
  }
}
