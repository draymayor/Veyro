import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, minutes } from '@nestjs/throttler';
import { EarnService } from './earn.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';

// Earn page (docs/database-schema.md's earn_bonus_claims section).
@Controller('earn')
@UseGuards(SupabaseAuthGuard)
export class EarnController {
  constructor(private readonly earnService: EarnService) {}

  @Get()
  getStatus(@Req() req: AuthenticatedRequest) {
    return this.earnService.getStatus(req.user.id);
  }

  // Throttled like other real financial actions (trade submission, crypto
  // sell) - the DB's UNIQUE(user_id) constraint is the actual one-claim
  // guarantee, this just stops a client from hammering the endpoint.
  @Throttle({ default: { limit: 5, ttl: minutes(10) } })
  @Post('claim')
  claim(
    @Req() req: AuthenticatedRequest,
    @Body('bonusAmountUsd') bonusAmountUsd: number,
  ) {
    return this.earnService.claim(req.user.id, Number(bonusAmountUsd));
  }
}
