import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { AdminGuard } from './admin.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AuthController],
  providers: [AuthService, SupabaseAuthGuard, AdminGuard],
  exports: [SupabaseAuthGuard, AdminGuard],
})
export class AuthModule {}
