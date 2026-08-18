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
}
