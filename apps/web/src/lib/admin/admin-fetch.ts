import { createClient } from "@/lib/supabase/server";
import { getApiBaseUrl } from "@/lib/api-base-url";

/**
 * Server-component fetch for authenticated admin backend calls, the same
 * getSession -> bearer-header sequence require-admin.ts already uses to
 * check GET /admin/session, generalized so other admin pages (dashboard
 * first, more to follow) can pull real data through the guarded NestJS
 * routes instead of querying Supabase directly, which would be scoped by
 * RLS to the admin's own rows, not the platform-wide data admin needs.
 * Returns null on any failure so pages can render a clear empty/error
 * state rather than throwing during render.
 */
export async function adminFetch<T>(path: string): Promise<T | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) return null;

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });

  if (!res.ok) return null;

  return (await res.json()) as T;
}
