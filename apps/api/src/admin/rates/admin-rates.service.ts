import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CryptoPriceService } from '../../crypto-price/crypto-price.service';

export interface AdminGiftCardRate {
  id: string;
  brand_id: string;
  brand_name: string;
  country: string;
  card_type: string;
  min_denomination: number;
  max_denomination: number;
  rate: number;
  currency: string;
  is_active: boolean;
}

export interface AdminGiftCardBrand {
  id: string;
  name: string;
  slug: string | null;
  is_active: boolean;
}

export interface AdminCryptoAsset {
  id: string;
  symbol: string;
  network: string;
  deposit_address: string;
  margin_percentage: number;
  is_active: boolean;
  live_price_usd: number | null;
}

export interface AdminPlatformSetting {
  key: string;
  value: string;
  updated_at: string;
}

const CARD_TYPES = ['physical', 'e-code'];

export type CryptoWithdrawalSigningMode = 'manual' | 'automatic';

// docs/database-schema.md's consolidation_wallets section: admin-toggleable
// between 'manual' (a crypto withdrawal sits pending an explicit admin
// approve-for-signing action) and 'automatic' (no human step once it
// reaches processing). No seed row by default - a missing row reads as
// 'manual', the documented default, same "missing row = documented
// default" pattern as crypto_withdrawal_requires_approval.
const CRYPTO_SIGNING_MODE_SETTING_KEY = 'crypto_withdrawal_signing_mode';

// Rate Management (docs/admin-guide.md): gift card rate table
// (Brand -> Country -> Type -> Denomination Range -> Rate), crypto margin
// per asset (the live CoinGecko price minus this margin determines
// payout), and the general-purpose platform_settings key/value store.
// Every write here only ever touches gift_card_rates/crypto_assets/
// platform_settings rows going forward, never the immutable rate_value
// snapshot already recorded on past trades (docs/product-rules.md rule 5:
// "rate changes apply to new trades only, never retroactively").
@Injectable()
export class AdminRatesService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly cryptoPriceService: CryptoPriceService,
  ) {}

  // --- Gift card rates ---

  async listGiftCardBrands(): Promise<AdminGiftCardBrand[]> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('gift_card_brands')
      .select('id, name, slug, is_active')
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async listGiftCardRates(): Promise<AdminGiftCardRate[]> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('gift_card_rates')
      .select(
        'id, brand_id, country, card_type, min_denomination, max_denomination, rate, currency, is_active, gift_card_brands(name)',
      )
      .order('country', { ascending: true });

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    return rows.map((row) => {
      const brand = row.gift_card_brands as { name: string } | null;
      return {
        id: row.id as string,
        brand_id: row.brand_id as string,
        brand_name: brand?.name ?? 'Unknown brand',
        country: row.country as string,
        card_type: row.card_type as string,
        min_denomination: Number(row.min_denomination),
        max_denomination: Number(row.max_denomination),
        rate: Number(row.rate),
        currency: row.currency as string,
        is_active: Boolean(row.is_active),
      };
    });
  }

  private validateGiftCardRateInput(input: {
    brandId?: string;
    country?: string;
    cardType?: string;
    minDenomination?: number;
    maxDenomination?: number;
    rate?: number;
    currency?: string;
  }): void {
    if (input.cardType !== undefined && !CARD_TYPES.includes(input.cardType)) {
      throw new BadRequestException('Invalid card type.');
    }
    if (
      input.minDenomination !== undefined &&
      input.maxDenomination !== undefined &&
      Number(input.minDenomination) > Number(input.maxDenomination)
    ) {
      throw new BadRequestException(
        'Minimum denomination cannot exceed maximum denomination.',
      );
    }
    if (input.rate !== undefined && Number(input.rate) <= 0) {
      throw new BadRequestException('Rate must be greater than zero.');
    }
  }

  // Creates a new gift_card_rates row. This only ever affects trades
  // submitted from now on: TradesService.findRate looks up a fresh row at
  // quote/submission time and the result is snapshotted onto the trade
  // immediately, so nothing here can retroactively change an existing
  // trade's locked rate_value.
  async createGiftCardRate(
    adminId: string,
    input: {
      brandId: string;
      country: string;
      cardType: string;
      minDenomination: number;
      maxDenomination: number;
      rate: number;
      currency: string;
      isActive: boolean;
    },
  ): Promise<AdminGiftCardRate> {
    this.validateGiftCardRateInput(input);

    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('gift_card_rates')
      .insert({
        brand_id: input.brandId,
        country: input.country,
        card_type: input.cardType,
        min_denomination: input.minDenomination,
        max_denomination: input.maxDenomination,
        rate: input.rate,
        currency: input.currency,
        is_active: input.isActive,
      })
      .select(
        'id, brand_id, country, card_type, min_denomination, max_denomination, rate, currency, is_active, gift_card_brands(name)',
      )
      .single();

    if (error || !data) {
      throw new BadRequestException('Could not create this rate.');
    }

    await this.logAction(
      client,
      adminId,
      data.id as string,
      'rate_changed',
      'Created gift card rate',
    );

    const row = data as unknown as Record<string, unknown>;
    const brand = row.gift_card_brands as { name: string } | null;
    return {
      id: row.id as string,
      brand_id: row.brand_id as string,
      brand_name: brand?.name ?? 'Unknown brand',
      country: row.country as string,
      card_type: row.card_type as string,
      min_denomination: Number(row.min_denomination),
      max_denomination: Number(row.max_denomination),
      rate: Number(row.rate),
      currency: row.currency as string,
      is_active: Boolean(row.is_active),
    };
  }

  // Partial update: whatever fields the admin changed (rate, denomination
  // range, currency, country, card type, is_active). Existing trades keep
  // their own locked rate_value regardless of what happens here (see
  // class-level comment).
  async updateGiftCardRate(
    adminId: string,
    rateId: string,
    input: Partial<{
      country: string;
      cardType: string;
      minDenomination: number;
      maxDenomination: number;
      rate: number;
      currency: string;
      isActive: boolean;
    }>,
  ): Promise<AdminGiftCardRate> {
    this.validateGiftCardRateInput({
      cardType: input.cardType,
      minDenomination: input.minDenomination,
      maxDenomination: input.maxDenomination,
      rate: input.rate,
    });

    const patch: Record<string, unknown> = {};
    if (input.country !== undefined) patch.country = input.country;
    if (input.cardType !== undefined) patch.card_type = input.cardType;
    if (input.minDenomination !== undefined)
      patch.min_denomination = input.minDenomination;
    if (input.maxDenomination !== undefined)
      patch.max_denomination = input.maxDenomination;
    if (input.rate !== undefined) patch.rate = input.rate;
    if (input.currency !== undefined) patch.currency = input.currency;
    if (input.isActive !== undefined) patch.is_active = input.isActive;

    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('gift_card_rates')
      .update(patch)
      .eq('id', rateId)
      .select(
        'id, brand_id, country, card_type, min_denomination, max_denomination, rate, currency, is_active, gift_card_brands(name)',
      )
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException('Rate not found.');

    await this.logAction(
      client,
      adminId,
      rateId,
      'rate_changed',
      JSON.stringify(patch),
    );

    const row = data as unknown as Record<string, unknown>;
    const brand = row.gift_card_brands as { name: string } | null;
    return {
      id: row.id as string,
      brand_id: row.brand_id as string,
      brand_name: brand?.name ?? 'Unknown brand',
      country: row.country as string,
      card_type: row.card_type as string,
      min_denomination: Number(row.min_denomination),
      max_denomination: Number(row.max_denomination),
      rate: Number(row.rate),
      currency: row.currency as string,
      is_active: Boolean(row.is_active),
    };
  }

  // --- Crypto margin ---

  async listCryptoAssets(): Promise<AdminCryptoAsset[]> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('crypto_assets')
      .select(
        'id, symbol, network, deposit_address, margin_percentage, is_active',
      )
      .order('symbol', { ascending: true });

    if (error) throw new Error(error.message);

    let liveRates: Record<string, { priceUsd: number }> = {};
    try {
      liveRates = await this.cryptoPriceService.getRates();
    } catch {
      // Admin can still see/edit margins with the live price column blank
      // if CoinGecko is unreachable, editing margin doesn't depend on it.
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: row.id as string,
      symbol: row.symbol as string,
      network: row.network as string,
      deposit_address: row.deposit_address as string,
      margin_percentage: Number(row.margin_percentage),
      is_active: Boolean(row.is_active),
      live_price_usd: liveRates[row.symbol as string]?.priceUsd ?? null,
    }));
  }

  private validateMarginPercentage(marginPercentage: number): number {
    const margin = Number(marginPercentage);
    if (!Number.isFinite(margin) || margin < 0 || margin >= 100) {
      throw new BadRequestException('Margin must be between 0 and 100.');
    }
    return margin;
  }

  // Rate Management's Crypto Margin section only supported editing margin
  // on existing crypto_assets rows, there was no way to add the first one
  // short of direct database access. deposit_address is a real per-asset
  // payout address (docs/database-schema.md), so it's required here and
  // never defaulted or fabricated, admin fills in the actual address.
  async createCryptoAsset(
    adminId: string,
    input: {
      symbol: string;
      network: string;
      depositAddress: string;
      marginPercentage: number;
      isActive: boolean;
    },
  ): Promise<AdminCryptoAsset> {
    const symbol = input.symbol?.trim().toUpperCase();
    const network = input.network?.trim();
    const depositAddress = input.depositAddress?.trim();

    if (!symbol) throw new BadRequestException('Symbol is required.');
    if (!network) throw new BadRequestException('Network is required.');
    if (!depositAddress) {
      throw new BadRequestException('A deposit address is required.');
    }

    const margin = this.validateMarginPercentage(input.marginPercentage);

    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('crypto_assets')
      .insert({
        symbol,
        network,
        deposit_address: depositAddress,
        margin_percentage: margin,
        is_active: input.isActive,
      })
      .select(
        'id, symbol, network, deposit_address, margin_percentage, is_active',
      )
      .single();

    if (error || !data) {
      if (error?.code === '23505') {
        throw new BadRequestException(
          'This asset and network combination already exists.',
        );
      }
      throw new BadRequestException('Could not create this crypto asset.');
    }

    await this.logAction(
      client,
      adminId,
      data.id as string,
      'rate_changed',
      `Created crypto asset ${symbol} (${network})`,
    );

    let livePriceUsd: number | null = null;
    try {
      const rates = await this.cryptoPriceService.getRates();
      livePriceUsd = rates[symbol]?.priceUsd ?? null;
    } catch {
      // Same fail-open as listCryptoAssets.
    }

    return {
      id: data.id as string,
      symbol: data.symbol as string,
      network: data.network as string,
      deposit_address: data.deposit_address as string,
      margin_percentage: Number(data.margin_percentage),
      is_active: Boolean(data.is_active),
      live_price_usd: livePriceUsd,
    };
  }

  async updateCryptoAssetMargin(
    adminId: string,
    assetId: string,
    marginPercentage: number,
  ): Promise<AdminCryptoAsset> {
    const margin = this.validateMarginPercentage(marginPercentage);

    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('crypto_assets')
      .update({ margin_percentage: margin })
      .eq('id', assetId)
      .select(
        'id, symbol, network, deposit_address, margin_percentage, is_active',
      )
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException('Crypto asset not found.');

    await this.logAction(
      client,
      adminId,
      assetId,
      'rate_changed',
      `Crypto margin set to ${margin}%`,
    );

    let livePriceUsd: number | null = null;
    try {
      const rates = await this.cryptoPriceService.getRates();
      livePriceUsd = rates[data.symbol as string]?.priceUsd ?? null;
    } catch {
      // Same fail-open as listCryptoAssets.
    }

    return {
      id: data.id as string,
      symbol: data.symbol as string,
      network: data.network as string,
      deposit_address: data.deposit_address as string,
      margin_percentage: Number(data.margin_percentage),
      is_active: Boolean(data.is_active),
      live_price_usd: livePriceUsd,
    };
  }

  // --- Platform settings ---

  // Reads whatever rows actually exist, never a hardcoded key list, so a
  // new platform_settings row (added by a future migration, or manually)
  // shows up here without a code change.
  async listPlatformSettings(): Promise<AdminPlatformSetting[]> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('platform_settings')
      .select('key, value, updated_at')
      .order('key', { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async upsertPlatformSetting(
    adminId: string,
    key: string,
    value: string,
  ): Promise<AdminPlatformSetting> {
    const trimmedKey = key?.trim();
    if (!trimmedKey) {
      throw new BadRequestException('A setting key is required.');
    }
    if (value === undefined || value === null) {
      throw new BadRequestException('A setting value is required.');
    }

    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('platform_settings')
      .upsert({
        key: trimmedKey,
        value: String(value),
        updated_at: new Date().toISOString(),
        updated_by: adminId,
      })
      .select('key, value, updated_at')
      .single();

    if (error || !data) {
      throw new BadRequestException('Could not save this setting.');
    }

    // admin_actions.target_id is a uuid column (trade_id/rate_id/etc.), and
    // platform_settings is keyed by a text key, not a uuid, so it can't be
    // passed as target_id, the key goes in notes instead.
    await this.logAction(
      client,
      adminId,
      null,
      'rate_changed',
      `platform_settings.${trimmedKey} = ${value}`,
    );

    return data;
  }

  // --- Crypto withdrawal signing mode ---

  async getCryptoWithdrawalSigningMode(): Promise<{
    signingMode: CryptoWithdrawalSigningMode;
  }> {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('platform_settings')
      .select('value')
      .eq('key', CRYPTO_SIGNING_MODE_SETTING_KEY)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return {
      signingMode: data?.value === 'automatic' ? 'automatic' : 'manual',
    };
  }

  async updateCryptoWithdrawalSigningMode(
    adminId: string,
    signingMode: CryptoWithdrawalSigningMode,
  ): Promise<{ signingMode: CryptoWithdrawalSigningMode }> {
    if (signingMode !== 'manual' && signingMode !== 'automatic') {
      throw new BadRequestException(
        'Signing mode must be "manual" or "automatic".',
      );
    }

    const client = this.supabaseService.getClient();
    const { error } = await client.from('platform_settings').upsert({
      key: CRYPTO_SIGNING_MODE_SETTING_KEY,
      value: signingMode,
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    });

    if (error) throw new Error(error.message);

    await this.logAction(
      client,
      adminId,
      null,
      'rate_changed',
      `platform_settings.${CRYPTO_SIGNING_MODE_SETTING_KEY} = ${signingMode}`,
    );

    return { signingMode };
  }

  private async logAction(
    client: ReturnType<SupabaseService['getClient']>,
    adminId: string,
    targetId: string | null,
    actionType: string,
    notes?: string,
  ): Promise<void> {
    await client.from('admin_actions').insert({
      admin_id: adminId,
      action_type: actionType,
      target_id: targetId,
      notes: notes ?? null,
    });
  }
}
