import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from '../auth/auth.service';
import { NotificationsService } from '../notifications/notifications.service';

const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_MINUTES = 30;

interface UserPinRow {
  withdrawal_pin_hash: string | null;
  withdrawal_pin_set_at: string | null;
  withdrawal_pin_failed_attempts: number;
  withdrawal_pin_locked_until: string | null;
}

// Product-rules.md rule 18a: a self-set 4-digit PIN required before *every*
// withdrawal, for every user, regardless of TOTP enrollment. Deliberately
// independent of AuthService's TOTP/backup-code flow (see database-schema.md)
// other than reusing its email_otps plumbing for the forgot-PIN path.
@Injectable()
export class WithdrawalPinService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly authService: AuthService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Withdrawal PIN Set/Changed email (docs/email-templates.md #13), same
  // copy for both first-time setup and any later change (see setPin,
  // changePin, confirmReset). A failed send is non-critical, the PIN
  // itself is already updated by the time this is called.
  private async notifyPinChanged(user: User): Promise<void> {
    try {
      await this.notificationsService.sendWithdrawalPinChangedEmail({
        email: user.email!,
        name: (user.user_metadata?.full_name as string | undefined) ?? 'there',
      });
    } catch {
      // Already logged by NotificationsService.send().
    }
  }

  private hashPin(pin: string): string {
    return createHash('sha256').update(pin).digest('hex');
  }

  private assertValidPin(pin: string) {
    if (!pin || !/^\d{4}$/.test(pin)) {
      throw new BadRequestException('Your PIN must be 4 digits.');
    }
  }

  // Investigated as part of a reported bug where a failed forgot-PIN email
  // send left the app looking as though the PIN had never been set. This
  // read used to destructure only `data`, silently discarding `error`. A
  // genuine query failure (network blip, transient Supabase error) would
  // then fall through to the "no row" default below and get reported as
  // "no PIN set" rather than as an error, both misrepresenting real state
  // to the user and letting setPin's "already set, use changePin instead"
  // guard be bypassed during the failure window. Requesting a PIN reset
  // itself never touches these columns (only confirmReset does, after a
  // verified code), so that specific hypothesis wasn't the cause, but this
  // silent-failure pattern produces the same symptom and is a real bug in
  // its own right.
  private async getUserRow(user: User): Promise<UserPinRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('users')
      .select(
        'withdrawal_pin_hash, withdrawal_pin_set_at, withdrawal_pin_failed_attempts, withdrawal_pin_locked_until',
      )
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        'Could not load your withdrawal PIN status. Please try again.',
      );
    }

    return (
      data ?? {
        withdrawal_pin_hash: null,
        withdrawal_pin_set_at: null,
        withdrawal_pin_failed_attempts: 0,
        withdrawal_pin_locked_until: null,
      }
    );
  }

  private assertNotLocked(row: UserPinRow) {
    if (
      row.withdrawal_pin_locked_until &&
      new Date(row.withdrawal_pin_locked_until).getTime() > Date.now()
    ) {
      const minutesLeft = Math.ceil(
        (new Date(row.withdrawal_pin_locked_until).getTime() - Date.now()) /
          60_000,
      );
      throw new BadRequestException(
        `Too many incorrect attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}, or reset your PIN.`,
      );
    }
  }

  async getStatus(
    user: User,
  ): Promise<{ isSet: boolean; lockedUntil: string | null }> {
    const row = await this.getUserRow(user);
    const lockedUntil =
      row.withdrawal_pin_locked_until &&
      new Date(row.withdrawal_pin_locked_until).getTime() > Date.now()
        ? row.withdrawal_pin_locked_until
        : null;

    return { isSet: !!row.withdrawal_pin_hash, lockedUntil };
  }

  // First-time setup only. Changing an existing PIN goes through changePin,
  // which requires the current PIN.
  async setPin(
    user: User,
    pin: string,
    confirmPin: string,
  ): Promise<{ set: true }> {
    const row = await this.getUserRow(user);
    if (row.withdrawal_pin_hash) {
      throw new BadRequestException(
        'A withdrawal PIN is already set. Use "Change PIN" instead.',
      );
    }

    this.assertValidPin(pin);
    if (pin !== confirmPin) {
      throw new BadRequestException("PINs don't match.");
    }

    const { error } = await this.supabaseService
      .getClient()
      .from('users')
      .update({
        withdrawal_pin_hash: this.hashPin(pin),
        withdrawal_pin_set_at: new Date().toISOString(),
        withdrawal_pin_failed_attempts: 0,
        withdrawal_pin_locked_until: null,
      })
      .eq('id', user.id);

    if (error) {
      throw new BadRequestException('Could not set your withdrawal PIN.');
    }

    await this.notifyPinChanged(user);

    return { set: true };
  }

  async changePin(
    user: User,
    currentPin: string,
    newPin: string,
    confirmNewPin: string,
  ): Promise<{ changed: true }> {
    const row = await this.getUserRow(user);
    if (!row.withdrawal_pin_hash) {
      throw new BadRequestException(
        'No withdrawal PIN is set yet. Set one first.',
      );
    }

    this.assertNotLocked(row);
    this.assertValidPin(currentPin);
    this.assertValidPin(newPin);
    if (newPin !== confirmNewPin) {
      throw new BadRequestException("New PINs don't match.");
    }

    if (this.hashPin(currentPin) !== row.withdrawal_pin_hash) {
      await this.recordFailedAttempt(user, row);
      throw new BadRequestException('Incorrect current PIN.');
    }

    const { error } = await this.supabaseService
      .getClient()
      .from('users')
      .update({
        withdrawal_pin_hash: this.hashPin(newPin),
        withdrawal_pin_set_at: new Date().toISOString(),
        withdrawal_pin_failed_attempts: 0,
        withdrawal_pin_locked_until: null,
      })
      .eq('id', user.id);

    if (error) {
      throw new BadRequestException('Could not update your withdrawal PIN.');
    }

    await this.notifyPinChanged(user);

    return { changed: true };
  }

  // The mandatory per-withdrawal gate (product-rules.md rule 18a). Called
  // before any withdrawal executes.
  async verifyPin(user: User, pin: string): Promise<{ verified: true }> {
    const row = await this.getUserRow(user);
    if (!row.withdrawal_pin_hash) {
      throw new BadRequestException(
        'Set a withdrawal PIN in Settings before withdrawing.',
      );
    }

    this.assertNotLocked(row);
    this.assertValidPin(pin);

    if (this.hashPin(pin) !== row.withdrawal_pin_hash) {
      await this.recordFailedAttempt(user, row);
      const attemptsLeft = Math.max(
        0,
        PIN_MAX_ATTEMPTS - (row.withdrawal_pin_failed_attempts + 1),
      );
      throw new BadRequestException(
        attemptsLeft > 0
          ? `Incorrect PIN. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.`
          : `Incorrect PIN. Your account is now locked for ${PIN_LOCKOUT_MINUTES} minutes.`,
      );
    }

    await this.supabaseService
      .getClient()
      .from('users')
      .update({
        withdrawal_pin_failed_attempts: 0,
        withdrawal_pin_locked_until: null,
      })
      .eq('id', user.id);

    return { verified: true };
  }

  private async recordFailedAttempt(user: User, row: UserPinRow) {
    const attempts = row.withdrawal_pin_failed_attempts + 1;
    const locked = attempts >= PIN_MAX_ATTEMPTS;

    await this.supabaseService
      .getClient()
      .from('users')
      .update({
        withdrawal_pin_failed_attempts: attempts,
        withdrawal_pin_locked_until: locked
          ? new Date(Date.now() + PIN_LOCKOUT_MINUTES * 60 * 1000).toISOString()
          : row.withdrawal_pin_locked_until,
      })
      .eq('id', user.id);
  }

  // --- Forgot PIN (email_otps, purpose='withdrawal_confirmation') ---

  async requestReset(user: User): Promise<{ sent: true }> {
    return this.authService.sendWithdrawalPinResetOtp(user);
  }

  async resendReset(user: User): Promise<{ sent: true }> {
    return this.authService.resendWithdrawalPinResetOtp(user);
  }

  async verifyResetCode(user: User, code: string): Promise<{ verified: true }> {
    return this.authService.verifyWithdrawalPinResetOtp(user, code);
  }

  async confirmReset(
    user: User,
    code: string,
    newPin: string,
    confirmNewPin: string,
  ): Promise<{ reset: true }> {
    this.assertValidPin(newPin);
    if (newPin !== confirmNewPin) {
      throw new BadRequestException("PINs don't match.");
    }

    // Throws if the code isn't a verified, unexpired match, so a new PIN is
    // never set off an unconfirmed code. Burns the code afterward.
    await this.authService.consumeWithdrawalPinResetOtp(user, code);

    const { error } = await this.supabaseService
      .getClient()
      .from('users')
      .update({
        withdrawal_pin_hash: this.hashPin(newPin),
        withdrawal_pin_set_at: new Date().toISOString(),
        withdrawal_pin_failed_attempts: 0,
        withdrawal_pin_locked_until: null,
      })
      .eq('id', user.id);

    if (error) {
      throw new BadRequestException('Could not reset your withdrawal PIN.');
    }

    await this.notifyPinChanged(user);

    return { reset: true };
  }
}
