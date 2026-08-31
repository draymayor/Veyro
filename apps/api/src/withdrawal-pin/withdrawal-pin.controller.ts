import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, minutes } from '@nestjs/throttler';
import { WithdrawalPinService } from './withdrawal-pin.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';

// OTP send endpoints for the PIN-reset flow, same reasoning as
// auth.controller.ts's OTP_SEND_THROTTLE: limits how often a new reset
// code can be requested, separate from the code's own attempt lockout.
const PIN_RESET_OTP_THROTTLE = { default: { limit: 5, ttl: minutes(10) } };

@Controller('withdrawal-pin')
@UseGuards(SupabaseAuthGuard)
export class WithdrawalPinController {
  constructor(private readonly withdrawalPinService: WithdrawalPinService) {}

  @Get('status')
  getStatus(@Req() req: AuthenticatedRequest) {
    return this.withdrawalPinService.getStatus(req.user);
  }

  @Post('set')
  setPin(
    @Req() req: AuthenticatedRequest,
    @Body('pin') pin: string,
    @Body('confirmPin') confirmPin: string,
  ) {
    return this.withdrawalPinService.setPin(req.user, pin, confirmPin);
  }

  @Post('change')
  changePin(
    @Req() req: AuthenticatedRequest,
    @Body('currentPin') currentPin: string,
    @Body('newPin') newPin: string,
    @Body('confirmNewPin') confirmNewPin: string,
  ) {
    return this.withdrawalPinService.changePin(
      req.user,
      currentPin,
      newPin,
      confirmNewPin,
    );
  }

  // The mandatory per-withdrawal gate (product-rules.md rule 18a). Already
  // locks after 5 failed attempts at the DB level (see
  // withdrawal-pin.service.ts); this IP-level throttle is defense in
  // depth on top of that, not a replacement for it.
  @Throttle({ default: { limit: 10, ttl: minutes(5) } })
  @Post('verify')
  verifyPin(@Req() req: AuthenticatedRequest, @Body('pin') pin: string) {
    return this.withdrawalPinService.verifyPin(req.user, pin);
  }

  @Throttle(PIN_RESET_OTP_THROTTLE)
  @Post('forgot/request')
  requestReset(@Req() req: AuthenticatedRequest) {
    return this.withdrawalPinService.requestReset(req.user);
  }

  @Throttle(PIN_RESET_OTP_THROTTLE)
  @Post('forgot/resend')
  resendReset(@Req() req: AuthenticatedRequest) {
    return this.withdrawalPinService.resendReset(req.user);
  }

  @Post('forgot/verify')
  verifyResetCode(
    @Req() req: AuthenticatedRequest,
    @Body('code') code: string,
  ) {
    return this.withdrawalPinService.verifyResetCode(req.user, code);
  }

  @Post('forgot/confirm')
  confirmReset(
    @Req() req: AuthenticatedRequest,
    @Body('code') code: string,
    @Body('newPin') newPin: string,
    @Body('confirmNewPin') confirmNewPin: string,
  ) {
    return this.withdrawalPinService.confirmReset(
      req.user,
      code,
      newPin,
      confirmNewPin,
    );
  }
}
