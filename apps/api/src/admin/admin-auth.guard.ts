import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';

/**
 * Verifies the authenticated user (attached to the request by
 * SupabaseAuthGuard, which must run first) holds admin access, per
 * docs/context.md's Admin Authentication Architecture: `users.is_admin`
 * is the actual source of truth (a plain boolean column on public.users,
 * not a JWT claim), checked server-side on every admin route, never a
 * client-side-only hide.
 *
 * This is the one guard for admin routes. A second guard used to exist
 * (auth/admin.guard.ts) checking app_metadata.role === 'admin', a JWT
 * claim that was never actually populated for anyone since nothing
 * writes it, so it failed for every real admin account regardless of
 * their is_admin value. That guard has been removed rather than left
 * around to be picked by mistake.
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const { data } = await this.supabaseService
      .getClient()
      .from('users')
      .select('is_admin')
      .eq('id', request.user.id)
      .maybeSingle();

    if (!data?.is_admin) {
      throw new ForbiddenException('Admin access required.');
    }

    return true;
  }
}
