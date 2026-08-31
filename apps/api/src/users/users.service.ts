import { Injectable } from '@nestjs/common';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // Country is set once, at signup or on first /select-country visit, and
  // must never be overwritten after that (docs/product-rules.md rule 13).
  // This holds even for a same-email different-auth-method signup attempt,
  // regardless of how Supabase's account-linking setting resolves that
  // case (rule 13b) - checked here, server-side, so the guarantee doesn't
  // depend on every caller remembering to check first.
  async setCountry(
    user: User,
    country: string,
    currency: string,
  ): Promise<{ country: string; currency: string }> {
    const client = this.supabaseService.getClient();

    const { data: existing } = await client
      .from('users')
      .select('country, currency')
      .eq('id', user.id)
      .maybeSingle();

    if (existing?.country) {
      return {
        country: existing.country as string,
        currency: (existing.currency as string) ?? currency,
      };
    }

    await client.from('users').update({ country, currency }).eq('id', user.id);

    return { country, currency };
  }

  async setProfileImage(
    user: User,
    profileImageUrl: string | null,
  ): Promise<{ profileImageUrl: string | null }> {
    await this.supabaseService
      .getClient()
      .from('users')
      .update({ profile_image_url: profileImageUrl })
      .eq('id', user.id);

    return { profileImageUrl };
  }
}
