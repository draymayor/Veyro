export type OnboardingStepKey =
  "verify_email" | "claim_bonus" | "first_deposit" | "set_pin";

export interface OnboardingStep {
  key: OnboardingStepKey;
  label: string;
  completed: boolean;
}

export interface OnboardingStatus {
  steps: OnboardingStep[];
}
