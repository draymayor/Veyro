import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard, minutes } from '@nestjs/throttler';
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
import { FxModule } from './fx/fx.module';
import { WithdrawalPinModule } from './withdrawal-pin/withdrawal-pin.module';
import { BankAccountsModule } from './bank-accounts/bank-accounts.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { CryptoAddressesModule } from './crypto-addresses/crypto-addresses.module';
import { CryptoWalletModule } from './crypto-wallet/crypto-wallet.module';
import { TatumWebhookModule } from './webhooks/tatum/tatum-webhook.module';
import { AlchemyWebhookModule } from './webhooks/alchemy/alchemy-webhook.module';
import { CryptoDepositEventsModule } from './crypto-deposit-events/crypto-deposit-events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Global baseline rate limit, keyed by IP by default. 60 requests/min
    // is generous enough for normal browsing (catalog reads, dashboard
    // polling) but stops a single client from hammering the API. Endpoints
    // that need a tighter limit (OTP send, PIN verify, trade submission,
    // etc.) override this per-route with @Throttle().
    //
    // KNOWN LIMITATION (V1): this storage is in-memory (the package
    // default), which only enforces a correct global limit when the API
    // runs as a single instance. See deployment.md - Cloud Run here is
    // configured to allow scale-to-zero, not pinned to a single instance,
    // and has no max-instances=1 cap, so it CAN scale out to multiple
    // instances under load. When it does, each instance tracks its own
    // counter, so the real effective limit becomes (configured limit x
    // instance count) rather than the number below. Correct enforcement
    // across instances needs a shared store (e.g. a Redis-backed
    // ThrottlerStorage implementation) - not built here, flagged for
    // whoever picks this up post-V1.
    ThrottlerModule.forRoot([{ name: 'default', ttl: minutes(1), limit: 60 }]),
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
    FxModule,
    WithdrawalPinModule,
    BankAccountsModule,
    WithdrawalsModule,
    CryptoAddressesModule,
    CryptoWalletModule,
    TatumWebhookModule,
    AlchemyWebhookModule,
    CryptoDepositEventsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
