import { createClient } from "@supabase/supabase-js";

/**
 * The consolidator's own Supabase client - standalone, not shared with
 * apps/api or apps/sweeper, since this is a deliberately separate
 * deployable. Always the service-role key: this job has no end-user
 * session context, and RLS on withdrawals/withdrawal_signing_log/
 * consolidation_wallets is service-role-only for the write paths this job
 * needs anyway.
 */
export function createSupabaseClient(
  url: string,
  serviceRoleKey: string,
): ReturnType<typeof createClient> {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
