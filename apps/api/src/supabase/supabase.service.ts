import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  // No generated Database type yet (see docs/supabase-setup.md), so this is
  // deliberately untyped rather than resolving to `never` on every query.
  private readonly client: SupabaseClient<any, any, any>;

  constructor(private readonly configService: ConfigService) {
    this.client = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  getClient(): SupabaseClient<any, any, any> {
    return this.client;
  }

  // supabase-js's typed admin.listUsers() only forwards page/per_page, but
  // GoTrue's admin endpoint also accepts a `filter` query param that does an
  // email/phone match server-side. Used for password reset, which has to
  // resolve an email to a user id without an active session to key off of.
  async findUserByEmail(
    email: string,
  ): Promise<{ id: string; email: string } | null> {
    const url = `${this.configService.getOrThrow<string>('SUPABASE_URL')}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`;
    const serviceRoleKey = this.configService.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    const res = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!res.ok) return null;

    const body = (await res.json()) as {
      users?: Array<{ id: string; email?: string }>;
    };
    const match = body.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );

    return match?.email ? { id: match.id, email: match.email } : null;
  }
}
