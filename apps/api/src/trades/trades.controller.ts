import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle, minutes } from '@nestjs/throttler';
import { TradesService } from './trades.service';
import type { CardType, TradeFileType } from './trades.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// Sell Flow - Gift Card (docs/api-spec.md). Quote is public (shows the
// rate before any submission, per docs/product-rules.md rule 1); creating
// a trade and uploading its files both require an authenticated session.
@Controller('trades')
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  @Post('gift-card/quote')
  quoteGiftCard(
    @Body('brandSlug') brandSlug: string,
    @Body('country') country: string,
    @Body('cardType') cardType: CardType,
    @Body('amount') amount: number,
  ) {
    return this.tradesService.quoteGiftCard({
      brandSlug,
      country,
      cardType,
      amount,
    });
  }

  // Crypto trades have no equivalent submission endpoint to throttle here:
  // per docs/product-rules.md rule 6a, a crypto trade is created by the
  // deposit itself landing on the user's own permanent address, not by a
  // client-submitted request.
  @Throttle({ default: { limit: 10, ttl: minutes(10) } })
  @UseGuards(SupabaseAuthGuard)
  @Post('gift-card')
  createGiftCardTrade(
    @Req() req: AuthenticatedRequest,
    @Body('brandSlug') brandSlug: string,
    @Body('country') country: string,
    @Body('cardType') cardType: CardType,
    @Body('amount') amount: number,
    @Body('cardCode') cardCode?: string,
    @Body('cardPin') cardPin?: string,
  ) {
    return this.tradesService.createGiftCardTrade(req.user, {
      brandSlug,
      country,
      cardType,
      amount,
      cardCode,
      cardPin,
    });
  }

  // Sell Crypto (docs/product-rules.md rule 6a): an instant conversion of
  // an already-held crypto_wallets balance to fiat, not a submission that
  // waits for admin approval - throttled the same as gift-card submission
  // since it's a real financial action a client could otherwise hammer.
  @Throttle({ default: { limit: 10, ttl: minutes(10) } })
  @UseGuards(SupabaseAuthGuard)
  @Post('crypto/sell')
  sellCrypto(
    @Req() req: AuthenticatedRequest,
    @Body('symbol') symbol: string,
    @Body('network') network: string,
    @Body('amount') amount: number,
  ) {
    return this.tradesService.sellCrypto(req.user, { symbol, network, amount });
  }

  // Multipart upload for a card photo or receipt (docs/api-spec.md: "upload
  // card image / receipt, multipart, stored in Supabase Storage"). Runs the
  // Card Image Perceptual Hash duplicate check as part of the same request
  // (docs/admin-guide.md's Fraud Review section).
  @UseGuards(SupabaseAuthGuard)
  @Post(':tradeId/files')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  uploadTradeFile(
    @Req() req: AuthenticatedRequest,
    @Param('tradeId') tradeId: string,
    @Body('fileType') fileType: TradeFileType,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.tradesService.uploadTradeFile(
      req.user,
      tradeId,
      fileType,
      file,
    );
  }
}
