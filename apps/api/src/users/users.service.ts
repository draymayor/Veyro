import { Injectable } from '@nestjs/common';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async setCountry(
    user: User,
    country: string,
    currency: string,
  ): Promise<{ country: string; currency: string }> {
    await this.supabaseService
      .getClient()
      .from('users')
      .update({ country, currency })
      .eq('id', user.id);

    return { country, currency };
  }
}
