import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminRatesService } from './admin-rates.service';
import { AdminAuthGuard } from '../admin-auth.guard';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../../auth/supabase-auth.guard';

// Rate Management (docs/admin-guide.md): gift card rates, crypto margin,
// and platform_settings, all under one admin-guarded controller. Same
// guard pair as every other admin route.
@Controller('admin/rates')
@UseGuards(SupabaseAuthGuard, AdminAuthGuard)
export class AdminRatesController {
  constructor(private readonly adminRatesService: AdminRatesService) {}

  @Get('gift-card-brands')
  listGiftCardBrands() {
    return this.adminRatesService.listGiftCardBrands();
  }

  @Get('gift-cards')
  listGiftCardRates() {
    return this.adminRatesService.listGiftCardRates();
  }

  @Post('gift-cards')
  createGiftCardRate(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      brandId: string;
      country: string;
      cardType: string;
      minDenomination: number;
      maxDenomination: number;
      rate: number;
      currency: string;
      isActive?: boolean;
    },
  ) {
    return this.adminRatesService.createGiftCardRate(req.user.id, {
      brandId: body.brandId,
      country: body.country,
      cardType: body.cardType,
      minDenomination: Number(body.minDenomination),
      maxDenomination: Number(body.maxDenomination),
      rate: Number(body.rate),
      currency: body.currency,
      isActive: body.isActive ?? true,
    });
  }

  @Patch('gift-cards/:rateId')
  updateGiftCardRate(
    @Req() req: AuthenticatedRequest,
    @Param('rateId') rateId: string,
    @Body()
    body: Partial<{
      country: string;
      cardType: string;
      minDenomination: number;
      maxDenomination: number;
      rate: number;
      currency: string;
      isActive: boolean;
    }>,
  ) {
    return this.adminRatesService.updateGiftCardRate(req.user.id, rateId, {
      ...body,
      minDenomination:
        body.minDenomination !== undefined
          ? Number(body.minDenomination)
          : undefined,
      maxDenomination:
        body.maxDenomination !== undefined
          ? Number(body.maxDenomination)
          : undefined,
      rate: body.rate !== undefined ? Number(body.rate) : undefined,
    });
  }

  @Get('crypto')
  listCryptoAssets() {
    return this.adminRatesService.listCryptoAssets();
  }

  @Post('crypto')
  createCryptoAsset(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      symbol: string;
      network: string;
      depositAddress: string;
      marginPercentage?: number;
      isActive?: boolean;
    },
  ) {
    return this.adminRatesService.createCryptoAsset(req.user.id, {
      symbol: body.symbol,
      network: body.network,
      depositAddress: body.depositAddress,
      marginPercentage: Number(body.marginPercentage ?? 3.0),
      isActive: body.isActive ?? true,
    });
  }

  @Patch('crypto/:assetId')
  updateCryptoAssetMargin(
    @Req() req: AuthenticatedRequest,
    @Param('assetId') assetId: string,
    @Body('marginPercentage') marginPercentage: number,
  ) {
    return this.adminRatesService.updateCryptoAssetMargin(
      req.user.id,
      assetId,
      Number(marginPercentage),
    );
  }

  @Get('settings')
  listPlatformSettings() {
    return this.adminRatesService.listPlatformSettings();
  }

  @Post('settings')
  upsertPlatformSetting(
    @Req() req: AuthenticatedRequest,
    @Body('key') key: string,
    @Body('value') value: string,
  ) {
    return this.adminRatesService.upsertPlatformSetting(
      req.user.id,
      key,
      value,
    );
  }

  @Get('crypto-signing-mode')
  getCryptoWithdrawalSigningMode() {
    return this.adminRatesService.getCryptoWithdrawalSigningMode();
  }

  @Post('crypto-signing-mode')
  updateCryptoWithdrawalSigningMode(
    @Req() req: AuthenticatedRequest,
    @Body('signingMode') signingMode: 'manual' | 'automatic',
  ) {
    return this.adminRatesService.updateCryptoWithdrawalSigningMode(
      req.user.id,
      signingMode,
    );
  }
}
