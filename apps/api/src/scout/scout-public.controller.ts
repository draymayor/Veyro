import { Controller, Get } from '@nestjs/common';
import { ScoutService } from './scout.service';

// Unauthenticated counterpart to ScoutController (which requires a
// session for every route). Program facts only, no user-specific data, so
// this deliberately carries no SupabaseAuthGuard - the public /careers
// page and the in-app pre-application explainer both need this before a
// user has logged in or applied.
@Controller('scout')
export class ScoutPublicController {
  constructor(private readonly scoutService: ScoutService) {}

  @Get('program-details')
  programDetails() {
    return this.scoutService.getProgramDetails();
  }
}
