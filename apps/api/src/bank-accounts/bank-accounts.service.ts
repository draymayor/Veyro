import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { fieldSetForCountry, validateBankDetails } from './bank-fields';

interface BankAccountRow {
  id: string;
  user_id: string;
  country: string;
  bank_details: Record<string, string | undefined>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  country: string;
  bankDetails: Record<string, string | undefined>;
  isDefault: boolean;
  createdAt: string;
}

function toBankAccount(row: BankAccountRow): BankAccount {
  return {
    id: row.id,
    country: row.country,
    bankDetails: row.bank_details,
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

const COUNTRY_CODE = /^[A-Za-z]{2}$/;

@Injectable()
export class BankAccountsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async list(user: User): Promise<BankAccount[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('user_bank_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      throw new BadRequestException('Could not load your saved bank accounts.');
    }

    return ((data as BankAccountRow[]) ?? []).map(toBankAccount);
  }

  async add(
    user: User,
    country: string,
    bankDetails: Record<string, unknown>,
  ): Promise<BankAccount> {
    if (!country || !COUNTRY_CODE.test(country)) {
      throw new BadRequestException('Select a valid country.');
    }

    const fieldSet = fieldSetForCountry(country);
    const validated = validateBankDetails(fieldSet, bankDetails ?? {});

    const client = this.supabaseService.getClient();

    // The first account a user saves becomes their default automatically;
    // later ones are added as non-default until explicitly promoted.
    const { count } = await client
      .from('user_bank_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const insertResult = await client
      .from('user_bank_accounts')
      .insert({
        user_id: user.id,
        country: country.toUpperCase(),
        bank_details: validated,
        is_default: !count,
      })
      .select()
      .single();

    if (insertResult.error) {
      throw new BadRequestException('Could not save this bank account.');
    }

    return toBankAccount(insertResult.data as BankAccountRow);
  }

  async setDefault(user: User, id: string): Promise<{ defaulted: true }> {
    const client = this.supabaseService.getClient();

    const { data: existing } = await client
      .from('user_bank_accounts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existing) {
      throw new BadRequestException('Bank account not found.');
    }

    await client
      .from('user_bank_accounts')
      .update({ is_default: false })
      .eq('user_id', user.id);

    const { error } = await client
      .from('user_bank_accounts')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new BadRequestException('Could not set this account as default.');
    }

    return { defaulted: true };
  }

  async remove(user: User, id: string): Promise<{ removed: true }> {
    const client = this.supabaseService.getClient();

    const { data: existing } = await client
      .from('user_bank_accounts')
      .select('id, is_default')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existing) {
      throw new BadRequestException('Bank account not found.');
    }

    const { error } = await client
      .from('user_bank_accounts')
      .delete()
      .eq('id', id);

    if (error) {
      throw new BadRequestException('Could not remove this bank account.');
    }

    // Keep exactly one default whenever an account remains, so removing
    // the current default doesn't quietly leave the user with none.
    if (existing.is_default) {
      const { data: next } = await client
        .from('user_bank_accounts')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (next) {
        await client
          .from('user_bank_accounts')
          .update({ is_default: true })
          .eq('id', next.id);
      }
    }

    return { removed: true };
  }
}
