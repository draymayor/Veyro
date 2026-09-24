import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { WelcomeBonusModule } from '../welcome-bonus/welcome-bonus.module';

@Module({
  imports: [NotificationsModule, WelcomeBonusModule],
  controllers: [AuthController],
  providers: [AuthService, SupabaseAuthGuard],
  exports: [AuthService, SupabaseAuthGuard],
})
export class AuthModule {}
