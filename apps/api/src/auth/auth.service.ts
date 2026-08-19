import { Injectable, BadRequestException } from '@nestjs/common';
import { randomInt, createHash } from 'crypto';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';

const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

// Distinguishes a signup-verification code from a password-reset code so one
// can never be used to satisfy the other, per database-schema.md.
type OtpPurpose = 'signup_verification' | 'password_reset';

interface EmailOtpRow {
  id: string;
  user_id: string;
  email: string;
  code_hash: string;
  purpose: OtpPurpose;
  attempts: number;
  expires_at: string;
  verified_at: string | null;
  created_at: string;
}

// Minimal identity needed to send/check an OTP: either a full Supabase
// `User` (signup, already authenticated) or the small shape returned by
// findUserByEmail (password reset, no session to pull a User from).
// user_metadata is optional since only the signup path has it; password
// reset has no session to pull a name from, so those emails greet
// generically.
type OtpRecipient = Pick<User, 'id' | 'email'> & {
  user_metadata?: { full_name?: string };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private generateCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private async latestOtp(
    userId: string,
    purpose: OtpPurpose,
  ): Promise<EmailOtpRow | null> {
    const result = await this.supabaseService
      .getClient()
      .from('email_otps')
      .select('*')
      .eq('user_id', userId)
      .eq('purpose', purpose)
      .is('verified_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return (result.data as EmailOtpRow | null) ?? null;
  }

  // The row matching whatever code the caller already had verified for this
  // purpose, still within its expiry window. Looked up by code hash (not
  // just "latest"), since a later, unrelated resend for the same user/purpose
  // must not be treated as authorizing a still-pending confirm step.
  private async matchingVerifiedOtp(
    userId: string,
    purpose: OtpPurpose,
    code: string,
  ): Promise<EmailOtpRow | null> {
    const result = await this.supabaseService
      .getClient()
      .from('email_otps')
      .select('*')
      .eq('user_id', userId)
      .eq('purpose', purpose)
      .eq('code_hash', this.hashCode(code))
      .not('verified_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return (result.data as EmailOtpRow | null) ?? null;
  }

  private async sendOtp(
    recipient: OtpRecipient,
    purpose: OtpPurpose,
  ): Promise<{ sent: true }> {
    const code = this.generateCode();
    const expiresAt = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
    ).toISOString();

    const { error } = await this.supabaseService
      .getClient()
      .from('email_otps')
      .insert({
        user_id: recipient.id,
        email: recipient.email,
        code_hash: this.hashCode(code),
        purpose,
        expires_at: expiresAt,
      });

    if (error) {
      throw new BadRequestException('Could not create a verification code.');
    }

    const name = recipient.user_metadata?.full_name;

    try {
      if (purpose === 'password_reset') {
        await this.notificationsService.sendPasswordResetEmail(
          recipient.email!,
          code,
          name,
        );
      } else {
        await this.notificationsService.sendOtpEmail(
          recipient.email!,
          code,
          name,
        );
      }
    } catch {
      // notificationsService.send() already logged the real cause.
      // Don't report { sent: true } when no email actually went out.
      throw new BadRequestException(
        'Could not send the verification email. Please try again.',
      );
    }

    return { sent: true };
  }

  private async resendOtp(
    recipient: OtpRecipient,
    purpose: OtpPurpose,
  ): Promise<{ sent: true }> {
    const latest = await this.latestOtp(recipient.id, purpose);
    if (latest) {
      const secondsSinceLastSend =
        (Date.now() - new Date(latest.created_at).getTime()) / 1000;
      if (secondsSinceLastSend < OTP_RESEND_COOLDOWN_SECONDS) {
        throw new BadRequestException(
          `Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSend)}s before requesting another code.`,
        );
      }
    }
    return this.sendOtp(recipient, purpose);
  }

  // Core verify: confirms the code, tracks attempts/lockout, marks the row
  // verified_at. Does not apply any purpose-specific side effect (e.g.
  // flipping users.email_verified_at); callers layer that on top.
  private async verifyOtpCode(
    userId: string,
    code: string,
    purpose: OtpPurpose,
  ): Promise<EmailOtpRow> {
    const latest = await this.latestOtp(userId, purpose);

    if (!latest) {
      throw new BadRequestException(
        'No active verification code. Please request a new one.',
      );
    }

    if (new Date(latest.expires_at).getTime() < Date.now()) {
      throw new BadRequestException(
        'This code has expired. Please request a new one.',
      );
    }

    if (latest.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Too many incorrect attempts. Please request a new code.',
      );
    }

    if (this.hashCode(code) !== latest.code_hash) {
      await this.supabaseService
        .getClient()
        .from('email_otps')
        .update({ attempts: latest.attempts + 1 })
        .eq('id', latest.id);
      throw new BadRequestException('Incorrect code. Please try again.');
    }

    await this.supabaseService
      .getClient()
      .from('email_otps')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', latest.id);

    return latest;
  }

  // --- Signup email verification ---

  async sendSignupOtp(user: User): Promise<{ sent: true }> {
    return this.sendOtp(user, 'signup_verification');
  }

  async resendSignupOtp(user: User): Promise<{ sent: true }> {
    return this.resendOtp(user, 'signup_verification');
  }

  async verifyOtp(user: User, code: string): Promise<{ verified: true }> {
    await this.verifyOtpCode(user.id, code, 'signup_verification');

    await this.supabaseService
      .getClient()
      .from('users')
      .update({ email_verified_at: new Date().toISOString() })
      .eq('id', user.id);

    try {
      await this.notificationsService.sendWelcomeEmail({
        email: user.email!,
        name: user.user_metadata?.full_name ?? 'there',
      });
    } catch {
      // Verification itself succeeded (email_verified_at is already set
      // above) — a failed welcome email is a non-critical side effect
      // and must not fail the request or block the user from proceeding.
      // notificationsService.send() already logged the real cause.
    }

    return { verified: true };
  }

  // --- Password reset ---
  //
  // None of these expose whether an email is registered: unknown emails are
  // handled with the same generic response as known ones, matching the
  // /forgot-password page copy.

  async requestPasswordReset(email: string): Promise<{ sent: true }> {
    const user = await this.supabaseService.findUserByEmail(email);
    if (user) {
      await this.sendOtp(user, 'password_reset');
    }
    return { sent: true };
  }

  async resendPasswordResetOtp(email: string): Promise<{ sent: true }> {
    const user = await this.supabaseService.findUserByEmail(email);
    if (!user) {
      return { sent: true };
    }
    return this.resendOtp(user, 'password_reset');
  }

  async verifyPasswordResetOtp(
    email: string,
    code: string,
  ): Promise<{ verified: true }> {
    const user = await this.supabaseService.findUserByEmail(email);
    if (!user) {
      throw new BadRequestException('Incorrect code. Please try again.');
    }

    await this.verifyOtpCode(user.id, code, 'password_reset');
    return { verified: true };
  }

  async resetPassword(
    email: string,
    code: string,
    password: string,
  ): Promise<{ reset: true }> {
    if (password.length < 8) {
      throw new BadRequestException(
        'Your password must be at least 8 characters.',
      );
    }

    const user = await this.supabaseService.findUserByEmail(email);
    if (!user) {
      throw new BadRequestException('Incorrect code. Please try again.');
    }

    const otp = await this.matchingVerifiedOtp(user.id, 'password_reset', code);
    if (!otp) {
      throw new BadRequestException(
        'Please verify your code again before continuing.',
      );
    }

    if (new Date(otp.expires_at).getTime() < Date.now()) {
      throw new BadRequestException(
        'This code has expired. Please request a new one.',
      );
    }

    const { error } = await this.supabaseService
      .getClient()
      .auth.admin.updateUserById(user.id, { password });

    if (error) {
      throw new BadRequestException(
        'Something went wrong on our end. Please try again.',
      );
    }

    // Burn the code so this verified password_reset OTP can't be replayed
    // to change the password a second time.
    await this.supabaseService
      .getClient()
      .from('email_otps')
      .update({ expires_at: new Date(0).toISOString() })
      .eq('id', otp.id);

    return { reset: true };
  }

  async me(user: User): Promise<{ emailVerified: boolean; provider: string }> {
    const { data } = await this.supabaseService
      .getClient()
      .from('users')
      .select('email_verified_at')
      .eq('id', user.id)
      .maybeSingle();

    const provider = user.app_metadata?.provider ?? 'email';

    return {
      emailVerified: !!data?.email_verified_at,
      provider,
    };
  }

  // Google accounts are pre-verified by Google and never go through the OTP
  // table at all, per the OTP flow's scope (email/password signups only).
  // Also reports whether the profile has a country set, since Google
  // signups skip the signup form's country field (see /select-country).
  async bootstrapOAuth(
    user: User,
  ): Promise<{ emailVerified: boolean; country: string | null }> {
    const provider = user.app_metadata?.provider;
    if (provider !== 'google') {
      const result = await this.me(user);
      return { emailVerified: result.emailVerified, country: null };
    }

    const { data } = await this.supabaseService
      .getClient()
      .from('users')
      .select('email_verified_at, country')
      .eq('id', user.id)
      .maybeSingle();

    if (!data?.email_verified_at) {
      await this.supabaseService
        .getClient()
        .from('users')
        .update({ email_verified_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    const country = (data?.country as string | null | undefined) ?? null;
    return { emailVerified: true, country };
  }
}
