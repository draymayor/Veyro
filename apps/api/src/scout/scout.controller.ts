import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, minutes } from '@nestjs/throttler';
import { ScoutService } from './scout.service';
import { ScoutApprovedGuard } from './scout-approved.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import type {
  ScoutApplyInput,
  ScoutLinkSubmissionInput,
} from './scout.service';

// Careers/Scout program (docs/database-schema.md). /scout/apply and
// /scout/application-status are reachable by any authenticated user (not
// yet a scout); every other route requires an approved application.
@Controller('scout')
@UseGuards(SupabaseAuthGuard)
export class ScoutController {
  constructor(private readonly scoutService: ScoutService) {}

  @Get('application-status')
  applicationStatus(@Req() req: AuthenticatedRequest) {
    return this.scoutService.getApplicationStatus(req.user.id);
  }

  // Throttled like other one-shot account actions (Earn's claim endpoint) -
  // the DB's UNIQUE(user_id) constraint is the real one-application
  // guarantee, this just stops a client from hammering the endpoint.
  @Throttle({ default: { limit: 5, ttl: minutes(10) } })
  @Post('apply')
  apply(@Req() req: AuthenticatedRequest, @Body() body: ScoutApplyInput) {
    return this.scoutService.apply(req.user.id, body);
  }

  @UseGuards(ScoutApprovedGuard)
  @Get('dashboard')
  dashboard(@Req() req: AuthenticatedRequest) {
    return this.scoutService.getDashboard(req.user.id);
  }

  @UseGuards(ScoutApprovedGuard)
  @Throttle({ default: { limit: 30, ttl: minutes(10) } })
  @Post('links')
  submitLink(
    @Req() req: AuthenticatedRequest,
    @Body() body: ScoutLinkSubmissionInput,
  ) {
    return this.scoutService.submitLink(req.user.id, body);
  }
}
