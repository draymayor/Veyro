import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BankAccountsService } from './bank-accounts.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';

// Saved bank payout methods (docs/product-rules.md rule 19). All reads and
// writes go through the API rather than direct client Supabase calls, since
// the per-country field validation needs one place to live rather than
// being trusted from the client.
@Controller('bank-accounts')
@UseGuards(SupabaseAuthGuard)
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.bankAccountsService.list(req.user);
  }

  @Post()
  add(
    @Req() req: AuthenticatedRequest,
    @Body('country') country: string,
    @Body('bankDetails') bankDetails: Record<string, unknown>,
  ) {
    return this.bankAccountsService.add(req.user, country, bankDetails);
  }

  @Patch(':id/default')
  setDefault(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.bankAccountsService.setDefault(req.user, id);
  }

  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.bankAccountsService.remove(req.user, id);
  }
}
