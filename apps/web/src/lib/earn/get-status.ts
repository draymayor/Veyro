import type { SupabaseClient } from "@supabase/supabase-js";
import { getApiBaseUrl } from "@/lib/api-base-url";
import type { EarnStatus } from "./data";

export type { EarnStatus, EarnClaim, EarnBonusTier } from "./data";

const FALLBACK: EarnStatus = {
  claim: null,
  tiers: [],
  tradeVolumeUsd: null,
  poolTotalUsd: 50000,
  poolRemainingUsd: 50000,
};

/**
 * Server-component fetch for GET /earn, the same getSession -> bearer-header
 * sequence get-table.ts uses. Can't be a plain Supabase query the way most
 * other pages' own reads are: computing trade-volume progress needs live FX
 * conversion (trades aren't always in USD), which only the backend can do.
 * Returns a safe empty status on any failure so the page can still render
 * the claim options rather than throwing during render.
 */
export async function getEarnStatus(
  supabase: SupabaseClient,
): Promise<EarnStatus> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) return FALLBACK;

  try {
    const res = await fetch(`${getApiBaseUrl()}/earn`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });

    if (!res.ok) return FALLBACK;

    return (await res.json()) as EarnStatus;
  } catch {
    // API unreachable (e.g. down for maintenance) - same fail-open posture
    // as a non-ok response, must never take the whole page down with it.
    return FALLBACK;
  }
}
