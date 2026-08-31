import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Throttle, minutes } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import type { AuthenticatedRequest } from './supabase-auth.guard';

// OTP send/resend endpoints: limits how often a NEW code can be requested,
// separate from and in addition to the per-code attempt lockout already
// enforced inside AuthService (OTP_MAX_ATTEMPTS) and the per-user 60s
// resend cooldown (OTP_RESEND_COOLDOWN_SECONDS). This is an IP-level cap
// so the same abuse can't just be spread across many different accounts/
// emails, which would blow through Resend's send quota and spam inboxes.
const OTP_SEND_THROTTLE = { default: { limit: 5, ttl: minutes(10) } };

function assertValidCode(code: string) {
  if (!code || !/^\d{6}$/.test(code)) {
    throw new BadRequestException('Enter the 6-digit code.');
  }
}

function assertValidBackupCode(code: string) {
  if (!code || !/^[0-9A-F]{5}-[0-9A-F]{5}$/i.test(code.trim())) {
    throw new BadRequestException('Enter a valid backup code.');
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

  @Throttle(OTP_SEND_THROTTLE)
  @UseGuards(SupabaseAuthGuard)
  @Post('otp/send')
  sendOtp(@Req() req: AuthenticatedRequest) {
    return this.authService.sendSignupOtp(req.user);
  }

  @Throttle(OTP_SEND_THROTTLE)
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
  bootstrapOAuth(
    @Req() req: AuthenticatedRequest,
    @Body('referredByCode') referredByCode?: string,
  ) {
    return this.authService.bootstrapOAuth(req.user, referredByCode);
  }

  // --- TOTP backup codes ---
  //
  // Enrollment/challenge/verify/unenroll for the TOTP factor itself go
  // straight through supabase-js's auth.mfa.* client API (no backend
  // involvement needed there); these two endpoints only cover the
  // account-recovery backup codes layered on top, since generating and
  // redeeming them requires the service role.

  // Called once, right after the client's own supabase.auth.mfa.verify()
  // call succeeds during enrollment.
  @UseGuards(SupabaseAuthGuard)
  @Post('backup-codes/generate')
  generateBackupCodes(@Req() req: AuthenticatedRequest) {
    return this.authService.generateBackupCodes(req.user);
  }

  // Called from the login-time MFA challenge screen when the user can't
  // reach their authenticator app. The guard only requires a valid (aal1)
  // bearer token, since the whole point is recovering when aal2 isn't
  // achievable. The AAL check itself lives client-side, deciding whether to
  // show this screen at all.
  @UseGuards(SupabaseAuthGuard)
  @Post('backup-codes/recover')
  recoverWithBackupCode(
    @Req() req: AuthenticatedRequest,
    @Body('code') code: string,
  ) {
    assertValidBackupCode(code);
    return this.authService.recoverWithBackupCode(req.user, code);
  }

  // Called by the signup form before supabase.auth.signUp(), so a
  // same-email different-auth-method attempt gets a clear, specific error
  // instead of proceeding into signUp()'s ambiguous existing-user response
  // (see docs/product-rules.md rule 13b and auth.service.ts).
  @Throttle({ default: { limit: 10, ttl: minutes(10) } })
  @Post('signup/check-email')
  checkEmailAvailability(@Body('email') email: string) {
    assertValidEmail(email);
    return this.authService.checkEmailAvailability(email);
  }

  // Password reset: none of these carry a session; the user is signed out
  // by definition (they forgot their password), so identity is established
  // by email + a verified OTP code rather than a bearer token.

  @Throttle(OTP_SEND_THROTTLE)
  @Post('password-reset/request')
  requestPasswordReset(@Body('email') email: string) {
    assertValidEmail(email);
    return this.authService.requestPasswordReset(email);
  }

  @Throttle(OTP_SEND_THROTTLE)
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
