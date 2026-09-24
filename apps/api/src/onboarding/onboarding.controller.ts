import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';

// New-user onboarding checklist widget (Home dashboard).
@Controller('onboarding')
@UseGuards(SupabaseAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get()
  getStatus(@Req() req: AuthenticatedRequest) {
    return this.onboardingService.getStatus(req.user.id);
  }
}
