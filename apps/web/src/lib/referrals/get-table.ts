import type { SupabaseClient } from "@supabase/supabase-js";
import { getApiBaseUrl } from "@/lib/api-base-url";
import type { ReferralTableRow } from "./data";

export type { ReferralTableRow } from "./data";

/**
 * Server-component fetch for GET /referrals/table, the same
 * getSession -> bearer-header sequence adminFetch uses for admin pages.
 * This can't be a plain Supabase query the way get-summary.ts's own reads
 * are (see referrals.service.ts on the API side): the referred user's
 * country lives behind "users select own" RLS, unreadable from the
 * referrer's own request-scoped client. Returns [] on any failure so the
 * page can render its own empty/error state rather than throwing.
 */
export async function getReferralTable(
  supabase: SupabaseClient,
  status?: string,
): Promise<ReferralTableRow[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) return [];

  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await fetch(`${getApiBaseUrl()}/referrals/table${query}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });

  if (!res.ok) return [];

  return (await res.json()) as ReferralTableRow[];
}
