import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import phash from 'sharp-phash';
import phashDistance from 'sharp-phash/distance';
import { SupabaseService } from '../supabase/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { CryptoWalletService } from '../crypto-wallet/crypto-wallet.service';
import { CryptoPayoutService } from '../crypto-price/crypto-payout.service';

export type CardType = 'physical' | 'e-code';
export type TradeFileType = 'card_image' | 'receipt';

interface GiftCardQuoteInput {
  brandSlug: string;
  country: string;
  cardType: CardType;
  amount: number;
}

export interface GiftCardQuote {
  rateId: string;
  brandId: string;
  brandName: string;
  country: string;
  cardType: CardType;
  amount: number;
  rateValue: number;
  currency: string;
  quotedPayout: number;
}

interface CreateGiftCardTradeInput {
  brandSlug: string;
  country: string;
  cardType: CardType;
  amount: number;
  cardCode?: string;
  cardPin?: string;
}

export interface TradeRow {
  id: string;
  status: string;
  asset_type: string;
  quoted_payout: number;
  currency: string;
  created_at: string;
}

interface UploadableFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

interface GiftCardBrandRow {
  id: string;
  name: string;
  is_active: boolean;
}

interface GiftCardRateRow {
  id: string;
  rate: number;
  currency: string;
  min_denomination: number;
  max_denomination: number;
}

interface SellCryptoInput {
  symbol: string;
  network: string;
  amount: number;
}

export interface SellCryptoResult {
  tradeId: string;
  symbol: string;
  amountSold: number;
  payout: number;
  currency: string;
  newCryptoBalance: number;
  newFiatBalance: number;
}

// Hamming-distance threshold for sharp-phash's 64-bit DCT hash. Per pHash
// literature, 0-10 bits of difference (out of 64) covers the same image
// having only been recompressed, resized, or lightly cropped/edited; past
// that it starts covering genuinely different photos. 10 is chosen to
// catch a re-uploaded or lightly-edited duplicate (this feature's scope,
// per docs/admin-guide.md) without flagging two distinct card photos that
// simply look visually similar.
const PHASH_DUPLICATE_THRESHOLD = 10;

// Gift Card sell flow (docs/api-spec.md's "Sell Flow - Gift Card" section,
// docs/product-rules.md rules 1-2, 15-17). Rates are looked up against real
// gift_card_rates rows (seeded per brand/country/type/denomination, see
// migration 0016) rather than trusting a client-computed payout, and every
// submission runs the Fraud Review duplicate checks from
// docs/admin-guide.md before it ever reaches the admin queue.
@Injectable()
export class TradesService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly walletService: WalletService,
    private readonly cryptoWalletService: CryptoWalletService,
    private readonly cryptoPayoutService: CryptoPayoutService,
  ) {}

  // Sell Crypto (docs/product-rules.md rule 6a, REVISED AGAIN): a
  // deliberate, separate action from depositing. The crypto being sold is
  // already a verified, previously-deposited crypto_wallets balance
  // (legitimacy was established at deposit time), so this is an instant
  // internal conversion, not a submit-and-wait-for-admin flow - no admin
  // approval, no pending review item. A `trades` row is still created (for
  // continuity with the existing gift-card trade history/display), but
  // lands directly in its terminal 'paid' status since nothing is actually
  // pending. crypto_wallets is debited and the fiat `wallets` balance is
  // credited in the same action, both linked back to this trade via
  // related_trade_id/trade_id.
  async sellCrypto(
    user: User,
    input: SellCryptoInput,
  ): Promise<SellCryptoResult> {
    const symbol = input.symbol?.trim().toUpperCase();
    const network = input.network?.trim();
    const amount = this.validateAmount(input.amount);

    if (!symbol || !network) {
      throw new BadRequestException('Select an asset and network.');
    }

    const client = this.supabaseService.getClient();

    const { data: userRow } = await client
      .from('users')
      .select('currency')
      .eq('id', user.id)
      .maybeSingle();

    const currency = userRow?.currency as string | undefined;
    if (!currency) {
      throw new BadRequestException(
        'Your account has no wallet currency set yet.',
      );
    }

    const { data: asset } = await client
      .from('crypto_assets')
      .select('id')
      .eq('symbol', symbol)
      .eq('network', network)
      .maybeSingle();

    if (!asset) {
      throw new BadRequestException('That asset/network is not supported.');
    }

    // Early, friendly balance check - debitWallet re-checks this
    // authoritatively below, guarding against a race between this read and
    // the debit (e.g. two sell requests submitted back to back).
    const cryptoBalance = await this.cryptoWalletService.getBalance(
      client,
      user.id,
      symbol,
    );
    if (cryptoBalance < amount) {
      throw new BadRequestException(`Insufficient ${symbol} balance.`);
    }

    const quote = await this.cryptoPayoutService.getQuote({
      symbol,
      network,
      amount,
      currency,
    });

    const { data: trade, error: tradeError } = await client
      .from('trades')
      .insert({
        user_id: user.id,
        asset_type: 'crypto',
        status: 'paid',
        rate_value: quote.priceUsd,
        asset_amount: amount,
        quoted_payout: quote.payout,
        currency,
        crypto_asset_id: asset.id,
      })
      .select('id')
      .single();

    if (tradeError || !trade) {
      throw new BadRequestException('Could not complete this sale.');
    }

    let cryptoResult: Awaited<ReturnType<CryptoWalletService['debitWallet']>>;
    try {
      cryptoResult = await this.cryptoWalletService.debitWallet(
        client,
        user.id,
        symbol,
        amount,
        'sell_conversion_debit',
        { tradeId: trade.id as string },
      );
    } catch (debitError) {
      await client.from('trades').delete().eq('id', trade.id);
      throw debitError;
    }

    // The crypto side is already debited by this point - a failure here is
    // a genuine ledger inconsistency (crypto debited, fiat not credited).
    // Same posture as admin-withdrawals.service.ts's credit-back-failure
    // path: this codebase has no cross-table DB transaction, so log loudly
    // for manual reconciliation rather than attempting a further rollback
    // that could itself fail.
    const fiatResult = await this.walletService.creditStandaloneWallet(
      client,
      user.id,
      currency,
      quote.payout,
      undefined,
      trade.id as string,
    );

    return {
      tradeId: trade.id as string,
      symbol,
      amountSold: amount,
      payout: quote.payout,
      currency,
      newCryptoBalance: cryptoResult.balanceAfter,
      newFiatBalance: fiatResult.balanceAfter,
    };
  }

  private async findRate(
    brandSlug: string,
    country: string,
    cardType: CardType,
    amount: number,
  ): Promise<{ brand: GiftCardBrandRow; rate: GiftCardRateRow }> {
    const client = this.supabaseService.getClient();

    const { data: brandData } = await client
      .from('gift_card_brands')
      .select('id, name, is_active')
      .eq('slug', brandSlug)
      .maybeSingle();
    const brand = brandData;

    if (!brand || !brand.is_active) {
      throw new BadRequestException('That gift card brand is not available.');
    }

    const { data: rateData } = await client
      .from('gift_card_rates')
      .select('id, rate, currency, min_denomination, max_denomination')
      .eq('brand_id', brand.id)
      .eq('country', country)
      .eq('card_type', cardType)
      .eq('is_active', true)
      .lte('min_denomination', amount)
      .gte('max_denomination', amount)
      .maybeSingle();
    const rate = rateData;

    if (!rate) {
      throw new BadRequestException(
        'No active rate for that brand, country, type, and amount.',
      );
    }

    return { brand, rate };
  }

  private validateCardType(cardType: CardType) {
    if (cardType !== 'physical' && cardType !== 'e-code') {
      throw new BadRequestException('Invalid card type.');
    }
  }

  private validateAmount(amount: number): number {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException('Enter a valid amount.');
    }
    return parsed;
  }

  async quoteGiftCard(input: GiftCardQuoteInput): Promise<GiftCardQuote> {
    this.validateCardType(input.cardType);
    const amount = this.validateAmount(input.amount);

    const { brand, rate } = await this.findRate(
      input.brandSlug,
      input.country,
      input.cardType,
      amount,
    );

    return {
      rateId: rate.id,
      brandId: brand.id,
      brandName: brand.name,
      country: input.country,
      cardType: input.cardType,
      amount,
      rateValue: rate.rate,
      currency: rate.currency,
      quotedPayout: amount * rate.rate,
    };
  }

  async createGiftCardTrade(
    user: User,
    input: CreateGiftCardTradeInput,
  ): Promise<TradeRow> {
    this.validateCardType(input.cardType);
    const amount = this.validateAmount(input.amount);

    const { brand, rate } = await this.findRate(
      input.brandSlug,
      input.country,
      input.cardType,
      amount,
    );

    const client = this.supabaseService.getClient();

    const row: Record<string, unknown> = {
      user_id: user.id,
      asset_type: 'gift_card',
      status: 'submitted',
      rate_id: rate.id,
      rate_value: rate.rate,
      asset_amount: amount,
      quoted_payout: amount * rate.rate,
      currency: rate.currency,
      gift_card_brand_id: brand.id,
      card_country: input.country,
      card_type: input.cardType,
    };

    let normalizedCardCode: string | undefined;
    if (input.cardType === 'e-code') {
      normalizedCardCode = input.cardCode?.trim();
      if (!normalizedCardCode) {
        throw new BadRequestException('Enter your gift card code.');
      }
      row.card_code = normalizedCardCode;

      const pin = input.cardPin?.trim();
      if (pin) row.card_pin = pin;
    }

    const { data, error } = await client
      .from('trades')
      .insert(row)
      .select('id, status, asset_type, quoted_payout, currency, created_at')
      .single();

    if (error || !data) {
      throw new BadRequestException('Could not submit your trade.');
    }

    // E-code duplicate check runs immediately, the code is already in hand
    // at creation time (physical submissions run their equivalent check
    // later, on image upload, since that's when a hash first exists).
    if (normalizedCardCode) {
      await this.flagIfDuplicateCardCode(client, data.id, normalizedCardCode);
    }

    return data;
  }

  // Card Code duplicate check (docs/admin-guide.md's Fraud Review): flags
  // this trade, never rejects it, if the same code already exists on any
  // other trade regardless of status or owning user.
  private async flagIfDuplicateCardCode(
    client: ReturnType<SupabaseService['getClient']>,
    tradeId: string,
    cardCode: string,
  ): Promise<void> {
    const { data: matches } = await client
      .from('trades')
      .select('id, created_at')
      .eq('asset_type', 'gift_card')
      .neq('id', tradeId)
      .ilike('card_code', cardCode)
      .order('created_at', { ascending: true })
      .limit(1);

    const match = matches?.[0];
    if (!match) return;

    await client
      .from('trades')
      .update({
        fraud_flagged: true,
        fraud_flag_reason: `Matching card code already submitted on trade ${match.id}`,
        fraud_flag_ref_trade_id: match.id,
      })
      .eq('id', tradeId);
  }

  async uploadTradeFile(
    user: User,
    tradeId: string,
    fileType: TradeFileType,
    file: UploadableFile | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }
    if (fileType !== 'card_image' && fileType !== 'receipt') {
      throw new BadRequestException('Invalid file type.');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are supported.');
    }

    const client = this.supabaseService.getClient();

    const { data: trade } = await client
      .from('trades')
      .select('id, user_id, asset_type')
      .eq('id', tradeId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!trade || trade.asset_type !== 'gift_card') {
      throw new NotFoundException('Trade not found.');
    }

    const bucket = fileType === 'card_image' ? 'card-images' : 'receipts';
    const extension = file.originalname.split('.').pop() || 'jpg';
    const storagePath = `${user.id}/${tradeId}/${randomUUID()}.${extension}`;

    const { error: uploadError } = await client.storage
      .from(bucket)
      .upload(storagePath, file.buffer, { contentType: file.mimetype });

    if (uploadError) {
      throw new BadRequestException('Could not upload your file.');
    }

    // Card Image Perceptual Hash check (docs/admin-guide.md's Fraud
    // Review): computed for card_image uploads only, not receipts. A
    // corrupt/unreadable image still gets stored for manual review, it
    // just can't participate in duplicate detection.
    let imagePhash: string | null = null;
    if (fileType === 'card_image') {
      try {
        imagePhash = await phash(file.buffer);
      } catch {
        imagePhash = null;
      }
    }

    const { data: fileRow, error: insertError } = await client
      .from('trade_files')
      .insert({
        trade_id: tradeId,
        file_type: fileType,
        storage_path: storagePath,
        image_phash: imagePhash,
      })
      .select('id, file_type, storage_path, created_at')
      .single();

    if (insertError || !fileRow) {
      throw new BadRequestException('Could not record your uploaded file.');
    }

    if (imagePhash) {
      await this.flagIfDuplicateImage(client, tradeId, imagePhash);
    }

    return fileRow;
  }

  private async flagIfDuplicateImage(
    client: ReturnType<SupabaseService['getClient']>,
    tradeId: string,
    imagePhash: string,
  ): Promise<void> {
    // Scoped to card_image rows with a hash, on any other trade (across
    // any user), matching the same "any user, any status" scope as the
    // card-code check above.
    const { data: candidates } = await client
      .from('trade_files')
      .select('trade_id, image_phash')
      .eq('file_type', 'card_image')
      .not('image_phash', 'is', null)
      .neq('trade_id', tradeId);

    if (!candidates?.length) return;

    let closest: { tradeId: string; distance: number } | null = null;
    for (const candidate of candidates as Array<{
      trade_id: string;
      image_phash: string;
    }>) {
      const distance = phashDistance(imagePhash, candidate.image_phash);
      if (
        distance <= PHASH_DUPLICATE_THRESHOLD &&
        (!closest || distance < closest.distance)
      ) {
        closest = { tradeId: candidate.trade_id, distance };
      }
    }

    if (!closest) return;

    await client
      .from('trades')
      .update({
        fraud_flagged: true,
        fraud_flag_reason: `Card image closely matches a previous submission on trade ${closest.tradeId} (hash distance ${closest.distance}/64)`,
        fraud_flag_ref_trade_id: closest.tradeId,
      })
      .eq('id', tradeId);
  }
}
