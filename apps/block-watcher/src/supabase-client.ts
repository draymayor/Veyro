import { createClient } from "@supabase/supabase-js";

/**
 * block-watcher's own Supabase client - standalone, not shared with
 * apps/api or apps/sweeper, same reasoning as sweeper's own
 * supabase-client.ts. Read-only in practice: block-watcher only ever
 * SELECTs user_crypto_addresses to build its in-memory address map; it
 * never writes crypto_deposit_events directly (see api-client.ts - that
 * goes through apps/api's DepositDetectionService instead, so there's one
 * source of truth for the crediting/notification logic). Still needs the
 * service-role key rather than the anon key, since RLS on
 * user_crypto_addresses is scoped to auth.uid() = user_id and block-watcher
 * has no per-user session - it needs every user's rows in one query.
 */
export function createSupabaseClient(
  url: string,
  serviceRoleKey: string,
): ReturnType<typeof createClient> {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
