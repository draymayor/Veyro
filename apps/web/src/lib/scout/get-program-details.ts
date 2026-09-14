import { getApiBaseUrl } from "@/lib/api-base-url";
import type { ScoutProgramDetails } from "./types";

/**
 * Unauthenticated fetch of GET /scout/program-details (ScoutPublicController)
 * - live platform_settings values, same source getDashboard reads for an
 * approved scout, so the public /careers page and the in-app pre-application
 * explainer never fall back to a hardcoded number that can drift from an
 * admin-tuned setting. Returns null on any failure so callers render without
 * inventing a number, the same posture as crypto-schema.ts's fetchPayout.
 */
export async function getScoutProgramDetails(): Promise<ScoutProgramDetails | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/scout/program-details`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as ScoutProgramDetails;
  } catch {
    return null;
  }
}
