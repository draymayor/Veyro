import type { SupabaseClient } from "@supabase/supabase-js";
import { getApiBaseUrl } from "@/lib/api-base-url";
import type { OnboardingStatus } from "./data";

export type {
  OnboardingStatus,
  OnboardingStep,
  OnboardingStepKey,
} from "./data";

const FALLBACK: OnboardingStatus = { steps: [] };

/**
 * Server-component fetch for GET /onboarding, same getSession ->
 * bearer-header sequence as get-status.ts (earn). Returns an empty-steps
 * fallback on any failure so the widget just doesn't render rather than
 * taking the Home page down with it.
 */
export async function getOnboardingStatus(
  supabase: SupabaseClient,
): Promise<OnboardingStatus> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) return FALLBACK;

  try {
    const res = await fetch(`${getApiBaseUrl()}/onboarding`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });

    if (!res.ok) return FALLBACK;

    return (await res.json()) as OnboardingStatus;
  } catch {
    return FALLBACK;
  }
}
