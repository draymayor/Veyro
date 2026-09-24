import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export type OnboardingStepKey =
  'verify_email' | 'claim_bonus' | 'first_deposit' | 'set_pin';

export interface OnboardingStep {
  key: OnboardingStepKey;
  label: string;
  completed: boolean;
}

export interface OnboardingStatus {
  steps: OnboardingStep[];
}

const QUALIFYING_DEPOSIT_TYPES = ['deposit', 'webhook_deposit'];

// New-user onboarding checklist for the Home dashboard widget. Every step
// is read off state some other feature already owns and writes -
// deliberately read-only aggregation, no new business logic:
//  - verify_email:  users.email_verified_at (AuthService.verifyOtp/bootstrapOAuth)
//  - claim_bonus:   an earn_bonus_claims row exists, i.e. the user actually
//                    claimed one of the Earn page's 50,000 USDT pool bonus
//                    tiers. The Welcome bonus does NOT satisfy this step -
//                    it's granted automatically on signup (see
//                    WelcomeBonusService.grantOnSignupComplete), so it's
//                    already "done" for every user before they ever see
//                    this widget and would make the step complete without
//                    the user ever visiting /earn, defeating the point of
//                    pointing them there.
//  - first_deposit: a real crypto_wallet_transactions deposit row exists,
//                    same qualifying types BonusWithdrawalLockService uses
//  - set_pin:       users.withdrawal_pin_set_at (WithdrawalPinService)
@Injectable()
export class OnboardingService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getStatus(userId: string): Promise<OnboardingStatus> {
    const client = this.supabaseService.getClient();

    const [{ data: user }, { data: earnClaim }, { data: deposit }] =
      await Promise.all([
        client
          .from('users')
          .select('email_verified_at, withdrawal_pin_set_at')
          .eq('id', userId)
          .maybeSingle(),
        client
          .from('earn_bonus_claims')
          .select('id')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle(),
        client
          .from('crypto_wallet_transactions')
          .select('id')
          .eq('user_id', userId)
          .in('type', QUALIFYING_DEPOSIT_TYPES)
          .limit(1)
          .maybeSingle(),
      ]);

    const steps: OnboardingStep[] = [
      {
        key: 'verify_email',
        label: 'Verify your email',
        completed: !!user?.email_verified_at,
      },
      {
        key: 'claim_bonus',
        label: 'Claim a bonus',
        completed: !!earnClaim,
      },
      {
        key: 'first_deposit',
        label: 'Make your first deposit',
        completed: !!deposit,
      },
      {
        key: 'set_pin',
        label: 'Set a withdrawal PIN',
        completed: !!user?.withdrawal_pin_set_at,
      },
    ];

    return { steps };
  }
}
