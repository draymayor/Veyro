import { Module } from '@nestjs/common';
import { ScoutController } from './scout.controller';
import { ScoutPublicController } from './scout-public.controller';
import { ScoutService } from './scout.service';
import { ScoutApprovedGuard } from './scout-approved.guard';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [ScoutController, ScoutPublicController],
  providers: [ScoutService, ScoutApprovedGuard],
  exports: [ScoutService],
})
export class ScoutModule {}
