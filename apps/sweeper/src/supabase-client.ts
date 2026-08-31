import { createClient } from "@supabase/supabase-js";

/**
 * The sweeper's own Supabase client - standalone, not shared with apps/api,
 * since this is a deliberately separate deployable. Always the service-role
 * key: the sweeper has no end-user session context, and RLS on
 * consolidation_wallets/sweep_log/platform_settings is service-role-only
 * for the write paths this job needs anyway.
 */
export function createSupabaseClient(
  url: string,
  serviceRoleKey: string,
): ReturnType<typeof createClient> {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
