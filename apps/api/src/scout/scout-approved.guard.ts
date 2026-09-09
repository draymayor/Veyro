import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ScoutService } from './scout.service';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';

/**
 * Gates the Scout dashboard/submission routes to approved scouts only
 * (docs/database-schema.md's Careers / Scout program section). Mirrors
 * AdminAuthGuard's shape: runs after SupabaseAuthGuard, checked server-side
 * on every request under this guard, never a client-side-only hide.
 */
@Injectable()
export class ScoutApprovedGuard implements CanActivate {
  constructor(private readonly scoutService: ScoutService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    await this.scoutService.assertApprovedScout(request.user.id);
    return true;
  }
}
