import {
  BadRequestException,
  Body,
  Controller,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';

const COUNTRY_CODE = /^[A-Z]{2}$/;
const CURRENCY_CODE = /^[A-Z]{3}$/;

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Used by the signup form (email/password) and /select-country
  // (post-Google-OAuth), the two places a user's country is ever set,
  // per docs/product-rules.md rule 13.
  @UseGuards(SupabaseAuthGuard)
  @Patch('me')
  updateMe(
    @Req() req: AuthenticatedRequest,
    @Body('country') country: string,
    @Body('currency') currency: string,
  ) {
    if (!country || !COUNTRY_CODE.test(country)) {
      throw new BadRequestException('Please select a valid country.');
    }
    if (!currency || !CURRENCY_CODE.test(currency)) {
      throw new BadRequestException('Please select a valid country.');
    }
    return this.usersService.setCountry(req.user, country, currency);
  }

  // Called by the Profile page after a direct-to-storage upload to the
  // `avatars` bucket completes (or after "Remove photo"). The file bytes
  // never pass through this API, only the resulting public URL (or null)
  // to persist on the user's row, same service-role write pattern as
  // updateMe above rather than relying on a client-side Supabase write.
  @UseGuards(SupabaseAuthGuard)
  @Patch('me/avatar')
  updateAvatar(
    @Req() req: AuthenticatedRequest,
    @Body('profileImageUrl') profileImageUrl: string | null,
  ) {
    if (profileImageUrl !== null && typeof profileImageUrl !== 'string') {
      throw new BadRequestException('Invalid photo URL.');
    }
    return this.usersService.setProfileImage(req.user, profileImageUrl);
  }
}
