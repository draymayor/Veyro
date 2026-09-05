import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminTradesController } from './trades/admin-trades.controller';
import { AdminTradesService } from './trades/admin-trades.service';
import { AdminWithdrawalsController } from './withdrawals/admin-withdrawals.controller';
import { AdminWithdrawalsService } from './withdrawals/admin-withdrawals.service';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';
import { AdminDashboardController } from './dashboard/admin-dashboard.controller';
import { AdminDashboardService } from './dashboard/admin-dashboard.service';
import { AdminRatesController } from './rates/admin-rates.controller';
import { AdminRatesService } from './rates/admin-rates.service';
import { NetworkFeesService } from './rates/network-fees.service';
import { AdminSupportController } from './support/admin-support.controller';
import { AdminSupportService } from './support/admin-support.service';
import { AdminDepositsController } from './deposits/admin-deposits.controller';
import { AdminDepositsService } from './deposits/admin-deposits.service';
import { AdminTransactionsController } from './transactions/admin-transactions.controller';
import { AdminTransactionsService } from './transactions/admin-transactions.service';
import { AuthModule } from '../auth/auth.module';
import { FxModule } from '../fx/fx.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CryptoPriceModule } from '../crypto-price/crypto-price.module';
import { WalletModule } from '../wallet/wallet.module';
import { CryptoWalletModule } from '../crypto-wallet/crypto-wallet.module';

@Module({
  imports: [
    AuthModule,
    FxModule,
    NotificationsModule,
    CryptoPriceModule,
    WalletModule,
    CryptoWalletModule,
  ],
  controllers: [
    AdminController,
    AdminTradesController,
    AdminWithdrawalsController,
    AdminUsersController,
    AdminDashboardController,
    AdminRatesController,
    AdminSupportController,
    AdminDepositsController,
    AdminTransactionsController,
  ],
  providers: [
    AdminService,
    AdminAuthGuard,
    AdminTradesService,
    AdminWithdrawalsService,
    AdminUsersService,
    AdminDashboardService,
    AdminRatesService,
    NetworkFeesService,
    AdminSupportService,
    AdminDepositsService,
    AdminTransactionsService,
  ],
})
export class AdminModule {}
