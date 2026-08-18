import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import type { AuthenticatedRequest } from './supabase-auth.guard';

function assertValidCode(code: string) {
  if (!code || !/^\d{6}$/.test(code)) {
    throw new BadRequestException('Enter the 6-digit code.');
  }
}

function assertValidEmail(email: string) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BadRequestException('Enter a valid email address.');
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(SupabaseAuthGuard)
  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return this.authService.me(req.user);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post('otp/send')
  sendOtp(@Req() req: AuthenticatedRequest) {
    return this.authService.sendSignupOtp(req.user);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post('otp/resend')
  resendOtp(@Req() req: AuthenticatedRequest) {
    return this.authService.resendSignupOtp(req.user);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post('otp/verify')
  verifyOtp(@Req() req: AuthenticatedRequest, @Body('code') code: string) {
    assertValidCode(code);
    return this.authService.verifyOtp(req.user, code);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post('oauth/bootstrap')
  bootstrapOAuth(@Req() req: AuthenticatedRequest) {
    return this.authService.bootstrapOAuth(req.user);
  }

  // Password reset: none of these carry a session; the user is signed out
  // by definition (they forgot their password), so identity is established
  // by email + a verified OTP code rather than a bearer token.

  @Post('password-reset/request')
  requestPasswordReset(@Body('email') email: string) {
    assertValidEmail(email);
    return this.authService.requestPasswordReset(email);
  }

  @Post('password-reset/resend')
  resendPasswordReset(@Body('email') email: string) {
    assertValidEmail(email);
    return this.authService.resendPasswordResetOtp(email);
  }

  @Post('password-reset/verify')
  verifyPasswordReset(
    @Body('email') email: string,
    @Body('code') code: string,
  ) {
    assertValidEmail(email);
    assertValidCode(code);
    return this.authService.verifyPasswordResetOtp(email, code);
  }

  @Post('password-reset/confirm')
  confirmPasswordReset(
    @Body('email') email: string,
    @Body('code') code: string,
    @Body('password') password: string,
  ) {
    assertValidEmail(email);
    assertValidCode(code);
    if (!password || password.length < 8) {
      throw new BadRequestException(
        'Your password must be at least 8 characters.',
      );
    }
    return this.authService.resetPassword(email, code, password);
  }
}
