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
  // email/phone match server-side. Shared by findUserByEmail (password
  // reset) and findUserProvidersByEmail (duplicate-signup messaging), both
  // of which need to resolve an email to a user record server-side, without
  // an active session to key off of.
  private async fetchUserRecordByEmail(email: string): Promise<{
    id: string;
    email: string;
    app_metadata?: { providers?: string[]; provider?: string };
  } | null> {
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
      users?: Array<{
        id: string;
        email?: string;
        app_metadata?: { providers?: string[]; provider?: string };
      }>;
    };
    const match = body.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );

    return match?.email
      ? { id: match.id, email: match.email, app_metadata: match.app_metadata }
      : null;
  }

  async findUserByEmail(
    email: string,
  ): Promise<{ id: string; email: string } | null> {
    const match = await this.fetchUserRecordByEmail(email);
    return match ? { id: match.id, email: match.email } : null;
  }

  // Every provider ever linked to this email (e.g. ['email'], ['google'],
  // or both once Supabase has linked them under its account-linking
  // setting). Used only to give the signup form a specific, correct error
  // when someone attempts email/password signup for an email that already
  // has an account under a different method (docs/product-rules.md rule
  // 13b) - never exposed as a general "does this email exist" lookup.
  async findUserProvidersByEmail(email: string): Promise<string[] | null> {
    const match = await this.fetchUserRecordByEmail(email);
    if (!match) return null;
    return (
      match.app_metadata?.providers ??
      (match.app_metadata?.provider ? [match.app_metadata.provider] : [])
    );
  }

  // Resolves auth.users emails by id, GoTrue's admin single-user endpoint
  // (public.users has no email column of its own). Used by the admin Trade
  // Review detail view to show the real login identity of the trade's
  // owner, one call per unique id (deduped), not something to call per row
  // in a list.
  async getUserEmailsByIds(ids: string[]): Promise<Map<string, string>> {
    const uniqueIds = Array.from(new Set(ids));
    const baseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    const entries = await Promise.all(
      uniqueIds.map(async (id) => {
        const res = await fetch(`${baseUrl}/auth/v1/admin/users/${id}`, {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        });
        if (!res.ok) return [id, null] as const;
        const body = (await res.json()) as { email?: string };
        return [id, body.email ?? null] as const;
      }),
    );

    return new Map(
      entries.filter((entry): entry is [string, string] => !!entry[1]),
    );
  }
}
