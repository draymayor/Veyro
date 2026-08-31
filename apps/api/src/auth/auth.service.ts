import { Injectable, BadRequestException } from '@nestjs/common';
import { randomInt, randomBytes, createHash } from 'crypto';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';

const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const BACKUP_CODE_COUNT = 10;

// Distinguishes a signup-verification code from a password-reset code from a
// withdrawal-PIN-reset code so none can ever be used to satisfy another, per
// database-schema.md. 'withdrawal_confirmation' is the PIN-reset path only,
// never a per-withdrawal fallback (product-rules.md rule 18a).
type OtpPurpose =
  'signup_verification' | 'password_reset' | 'withdrawal_confirmation';

interface BackupCodeRow {
  id: string;
  user_id: string;
  code_hash: string;
  used_at: string | null;
  created_at: string;
}

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
      } else if (purpose === 'withdrawal_confirmation') {
        await this.notificationsService.sendWithdrawalPinResetEmail(
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
        name: (user.user_metadata?.full_name as string | undefined) ?? 'there',
      });
    } catch {
      // Verification itself succeeded (email_verified_at is already set
      // above) — a failed welcome email is a non-critical side effect
      // and must not fail the request or block the user from proceeding.
      // notificationsService.send() already logged the real cause.
    }

    return { verified: true };
  }

  // --- Duplicate-signup check (email/password form, pre-submit) ---
  //
  // Same email, different auth method: per docs/product-rules.md rule 13b,
  // the signup form must give a clear, specific error rather than letting
  // the form proceed only to fail later (or, worse, silently succeed into
  // an ambiguous state that depends on whether Supabase's account-linking
  // setting is on). Called by the frontend before supabase.auth.signUp(),
  // so a duplicate email never reaches signUp() at all.
  async checkEmailAvailability(
    email: string,
  ): Promise<{ available: true } | { available: false; message: string }> {
    const providers =
      await this.supabaseService.findUserProvidersByEmail(email);

    if (providers === null) {
      return { available: true };
    }

    const signedUpWithGoogle = providers.includes('google');
    const message = signedUpWithGoogle
      ? 'This email already has an account. Log in instead, or use Sign in with Google if that is how you originally signed up.'
      : 'This email already has an account. Log in instead.';

    return { available: false, message };
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

  async me(
    user: User,
  ): Promise<{ emailVerified: boolean; provider: string; isAdmin: boolean }> {
    const { data } = await this.supabaseService
      .getClient()
      .from('users')
      .select('email_verified_at, is_admin')
      .eq('id', user.id)
      .maybeSingle();

    const provider = user.app_metadata?.provider ?? 'email';

    return {
      emailVerified: !!data?.email_verified_at,
      provider,
      isAdmin: !!data?.is_admin,
    };
  }

  // Google accounts are pre-verified by Google and never go through the OTP
  // table at all, per the OTP flow's scope (email/password signups only).
  // Also reports whether the profile has a country set, since Google
  // signups skip the signup form's country field (see /select-country).
  //
  // This is only ever called right after a successful Google OAuth code
  // exchange (auth/callback/route.ts), so the session is guaranteed to be a
  // Google sign-in regardless of what user.app_metadata.provider says.
  // That field is NOT "how did you just sign in", it's whichever provider
  // was used at original account creation, so a user who first signed up
  // with email/password and later signed in with Google on the same email
  // (Supabase auto-links these into one auth.users row, adding "google" to
  // app_metadata.providers) still has provider === 'email'. Branching on it
  // here previously short-circuited to a hardcoded { country: null } for
  // that exact case, sending an already-onboarded user with a real country
  // back through /select-country every time they used the Google button,
  // even though their profile already had one. Always read the real value
  // instead of trusting that field.
  async bootstrapOAuth(
    user: User,
    referredByCode?: string,
  ): Promise<{
    emailVerified: boolean;
    country: string | null;
    isAdmin: boolean;
  }> {
    const client = this.supabaseService.getClient();
    const { data } = await client
      .from('users')
      .select('email_verified_at, country, referred_by, is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!data?.email_verified_at) {
      await client
        .from('users')
        .update({ email_verified_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    // Google's OAuth metadata can never carry our own referred_by_code
    // field the way email/password signUp()'s options.data can
    // (raw_user_meta_data is whatever Google returns), so the
    // handle_new_user() trigger's referral attribution never fires for
    // this provider (see supabase/migrations/20260824160228_referral_attribution.sql).
    // This runs server-side instead, right after the account is confirmed
    // to exist, using the ref code the client stashed in a cookie before
    // redirecting to Google (google-auth-button.tsx, auth/callback/route.ts).
    // Guarded on referred_by still being null so a returning Google user's
    // later login never re-attributes.
    if (referredByCode && !data?.referred_by) {
      const { data: referrer } = await client
        .from('users')
        .select('id')
        .eq('referral_code', referredByCode)
        .maybeSingle();

      if (referrer && referrer.id !== user.id) {
        await client
          .from('users')
          .update({ referred_by: referrer.id })
          .eq('id', user.id);

        await client
          .from('referrals')
          .insert({ referrer_id: referrer.id, referred_id: user.id });
      }
    }

    const country = (data?.country as string | null | undefined) ?? null;
    return { emailVerified: true, country, isAdmin: !!data?.is_admin };
  }

  // --- Withdrawal PIN reset (email_otps, purpose='withdrawal_confirmation') ---
  //
  // This purpose exists solely to let a user prove account ownership before
  // setting a *new* withdrawal PIN when they've forgotten the current one.
  // It is never a per-withdrawal confirmation step (see product-rules.md
  // rule 18a). WithdrawalPinService is the only caller, and only from its
  // forgot-PIN flow.

  async sendWithdrawalPinResetOtp(user: User): Promise<{ sent: true }> {
    return this.sendOtp(user, 'withdrawal_confirmation');
  }

  async resendWithdrawalPinResetOtp(user: User): Promise<{ sent: true }> {
    return this.resendOtp(user, 'withdrawal_confirmation');
  }

  async verifyWithdrawalPinResetOtp(
    user: User,
    code: string,
  ): Promise<{ verified: true }> {
    await this.verifyOtpCode(user.id, code, 'withdrawal_confirmation');
    return { verified: true };
  }

  // Consumes an already-verified withdrawal-PIN-reset code, mirroring
  // resetPassword's verify-then-confirm shape. Burns the code afterwards so
  // it can't be replayed to reset the PIN a second time. Throws (rather than
  // silently no-op-ing) if the code isn't valid, so WithdrawalPinService
  // never sets a new PIN off an unconfirmed code.
  async consumeWithdrawalPinResetOtp(user: User, code: string): Promise<void> {
    const otp = await this.matchingVerifiedOtp(
      user.id,
      'withdrawal_confirmation',
      code,
    );
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

    await this.supabaseService
      .getClient()
      .from('email_otps')
      .update({ expires_at: new Date(0).toISOString() })
      .eq('id', otp.id);
  }

  // --- TOTP account-recovery backup codes (backup_codes table) ---
  //
  // Scoped strictly to account recovery at login when the authenticator app
  // is unavailable, never usable as a withdrawal confirmation method (see
  // product-rules.md and database-schema.md's backup_codes note).

  private generateBackupCode(): string {
    // 10 hex chars (~40 bits) grouped for readability, e.g. "A1B2C-D3E4F".
    // Not digits-only on purpose, so it's visually distinct from a 6-digit
    // TOTP code and can't be confused with one at the MFA challenge screen.
    const raw = randomBytes(5).toString('hex').toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  }

  // Called once, right after a TOTP factor is verified during enrollment.
  // Clears out any still-unused codes from a prior enrollment first, so
  // re-enrolling (after a disable) always leaves the user with exactly one
  // valid set rather than accumulating stale ones.
  async generateBackupCodes(user: User): Promise<{ codes: string[] }> {
    const codes = Array.from({ length: BACKUP_CODE_COUNT }, () =>
      this.generateBackupCode(),
    );

    const client = this.supabaseService.getClient();

    await client
      .from('backup_codes')
      .delete()
      .eq('user_id', user.id)
      .is('used_at', null);

    const { error } = await client.from('backup_codes').insert(
      codes.map((code) => ({
        user_id: user.id,
        code_hash: this.hashCode(code),
      })),
    );

    if (error) {
      throw new BadRequestException('Could not generate backup codes.');
    }

    // Two-Factor Authentication Enabled email (docs/email-templates.md
    // #12): this method is called once, right after the client's own
    // supabase.auth.mfa.verify() succeeds, so it's the one backend hook
    // that actually fires exactly when enrollment completes. A failed
    // send is non-critical, the codes are already generated.
    try {
      await this.notificationsService.sendTwoFactorEnabledEmail({
        email: user.email!,
        name: (user.user_metadata?.full_name as string | undefined) ?? 'there',
      });
    } catch {
      // Already logged by NotificationsService.send().
    }

    return { codes };
  }

  // Redeems a backup code to recover account access when the authenticator
  // app is lost. Since backup codes aren't a Supabase Auth MFA factor
  // themselves, "recovery" means removing the user's TOTP factor(s) via the
  // admin API, dropping the account back to aal1 (no MFA challenge required),
  // letting them log in with just their password and re-enroll a fresh
  // authenticator from Settings afterward.
  async recoverWithBackupCode(
    user: User,
    code: string,
  ): Promise<{ recovered: true }> {
    const client = this.supabaseService.getClient();
    const codeHash = this.hashCode(code.trim().toUpperCase());

    const result = await client
      .from('backup_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('code_hash', codeHash)
      .is('used_at', null)
      .maybeSingle();

    const backupCode = result.data as BackupCodeRow | null;
    if (!backupCode) {
      throw new BadRequestException('Invalid or already-used backup code.');
    }

    await client
      .from('backup_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', backupCode.id);

    const { data: fullUser } = await client.auth.admin.getUserById(user.id);
    const factors = fullUser?.user?.factors ?? [];

    for (const factor of factors) {
      await client.auth.admin.mfa.deleteFactor({
        id: factor.id,
        userId: user.id,
      });
    }

    try {
      await this.notificationsService.sendTwoFactorRecoveryEmail({
        email: user.email!,
        name: (user.user_metadata?.full_name as string | undefined) ?? 'there',
      });
    } catch {
      // Recovery itself already succeeded; a failed alert email is a
      // non-critical side effect and must not fail the request.
      // notificationsService.send() already logged the real cause.
    }

    return { recovered: true };
  }
}
