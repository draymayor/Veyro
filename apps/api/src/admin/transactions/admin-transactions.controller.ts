import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminTransactionsService } from './admin-transactions.service';
import { AdminAuthGuard } from '../admin-auth.guard';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';

// GET /admin/transactions, the All Transactions View (docs/admin-guide.md):
// read-only oversight across every wallet_transactions (fiat) and
// crypto_wallet_transactions (crypto) row platform-wide, merged into one
// feed. No mutating routes on this controller - approve/reject stays on
// Trade Review and Payout Processing, never here.
@Controller('admin/transactions')
@UseGuards(SupabaseAuthGuard, AdminAuthGuard)
export class AdminTransactionsController {
  constructor(
    private readonly adminTransactionsService: AdminTransactionsService,
  ) {}

  @Get()
  list(
    @Query('userId') userId?: string,
    @Query('type') type?: string,
    @Query('source') source?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sort') sort?: string,
  ) {
    return this.adminTransactionsService.list({
      userId,
      type,
      source,
      dateFrom,
      dateTo,
      sort,
    });
  }
}
