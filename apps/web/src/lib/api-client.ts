import { createClient } from "@/lib/supabase/client";
import { getApiBaseUrl } from "@/lib/api-base-url";

/**
 * Shared bearer-token fetch for authenticated backend calls. Centralizes the
 * getSession -> attach header -> parse-error-body sequence that was
 * previously duplicated inline at each call site (see verify-email/page.tsx,
 * login/page.tsx), since 2FA and withdrawal-PIN add several more of these.
 * Throws with the backend's message (or a generic fallback) on a non-OK
 * response, so callers can just try/catch and show err.message.
 */
export async function authFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Your session expired. Please log in again.");
  }

  // A FormData body (multipart file upload) must let the browser set its
  // own Content-Type with the multipart boundary, a hardcoded
  // "application/json" here would break every file upload call site.
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
    });
  } catch {
    // fetch() itself throws (not a non-OK response) when the request never
    // completes - offline, DNS/connection failure, a CORS preflight
    // rejection, or the server dropping mid-request (e.g. a dev-server
    // restart). The native error is a bare "Failed to fetch"/"Load failed"
    // with no useful detail, so every caller was surfacing that raw string
    // instead of something a user can act on.
    throw new Error(
      "Couldn't reach the server. Check your connection and try again.",
    );
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      body?.message ?? "Something went wrong on our end. Please try again.",
    );
  }

  return body as T;
}
