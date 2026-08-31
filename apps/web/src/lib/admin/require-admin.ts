import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getApiBaseUrl } from "@/lib/api-base-url";

/**
 * Server-side admin gate for every route under apps/web/src/app/admin.
 * Verifies admin access via the backend's GET /admin/session (guarded
 * there by SupabaseAuthGuard + AdminAuthGuard, which checks
 * users.is_admin), never a client-side-only check, per docs/context.md's
 * Admin Authentication Architecture.
 *
 * A signed-in non-admin landing here directly (there is no admin login
 * URL to discover, but nothing stops someone from typing /admin/dashboard
 * into the address bar) gets bounced to /home rather than shown any admin
 * content or error detail.
 */
export async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const res = await fetch(`${getApiBaseUrl()}/admin/session`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    redirect("/home");
  }
}
