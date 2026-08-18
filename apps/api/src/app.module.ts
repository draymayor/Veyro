import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TradesModule } from './trades/trades.module';
import { RatesModule } from './rates/rates.module';
import { WalletModule } from './wallet/wallet.module';
import { ReferralsModule } from './referrals/referrals.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CryptoPriceModule } from './crypto-price/crypto-price.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    TradesModule,
    RatesModule,
    WalletModule,
    ReferralsModule,
    LeaderboardModule,
    AdminModule,
    NotificationsModule,
    CryptoPriceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
