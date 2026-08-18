import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest, SupabaseAuthGuard } from './supabase-auth.guard';

/**
 * Runs SupabaseAuthGuard first, then requires an `admin` role on the
 * verified user's app_metadata (custom JWT claim) — see supabase-setup.md.
 */
@Injectable()
export class AdminGuard extends SupabaseAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) {
      return false;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.user.app_metadata?.role as string | undefined;

    if (role !== 'admin') {
      throw new ForbiddenException('Admin role required');
    }

    return true;
  }
}
