import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getApiBaseUrl } from "@/lib/api-base-url";
import {
  ADMIN_ENTRY_PATH,
  POST_AUTH_ENTRY_PATH,
} from "@/lib/auth/post-auth-redirect";

const REF_CODE_COOKIE = "veyro_ref_code";

// Handles the redirect back from Supabase Auth after Google OAuth. Google
// accounts are pre-verified by Google, so this exchanges the code for a
// session and marks the account verified server-side, skipping the OTP
// flow entirely (that flow only applies to email/password signups).
//
// Google signups also skip the signup form's country field, so a
// first-time Google user has no country set yet. This is the single gate
// point that sends them to /select-country instead of /home; once a
// country is set, bootstrap reports it and this redirect never fires again.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  // Set client-side by GoogleAuthButton right before the redirect to
  // Google, since Google's OAuth metadata can never carry this field the
  // way email/password signUp()'s options.data can. One-shot: cleared
  // below on every response this handler returns, so a returning user's
  // later Google login never re-attributes.
  const referredByCode = cookieStore.get(REF_CODE_COOKIE)?.value ?? null;

  function redirectAndClearRefCookie(url: string) {
    const response = NextResponse.redirect(url);
    response.cookies.delete(REF_CODE_COOKIE);
    return response;
  }
  // Supabase/Google can redirect back here with an error instead of a code
  // (denied consent, provider misconfiguration, an email already tied to a
  // different sign-in method, etc.), logged here since this is otherwise a
  // silent dead end, the only visible symptom is landing on
  // /login?error=oauth with no indication why.
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  if (oauthError) {
    console.error(
      `OAuth callback received an error from the provider: ${oauthError}${
        oauthErrorDescription ? ` - ${oauthErrorDescription}` : ""
      }`,
    );
  }

  let exchangeErrorMessage: string | null = null;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      exchangeErrorMessage = error.message;
      console.error(
        `exchangeCodeForSession failed: ${error.name} - ${error.message}`,
      );
    }

    if (!error) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // TOTP is account-recovery only (docs/product-rules.md rule 18a) but
        // still gates entry regardless of provider: a Google account with a
        // verified TOTP factor still only earns aal1 from the OAuth login.
        const { data: aal } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (
          aal &&
          aal.nextLevel === "aal2" &&
          aal.nextLevel !== aal.currentLevel
        ) {
          return redirectAndClearRefCookie(`${origin}/mfa-challenge`);
        }

        try {
          const res = await fetch(`${getApiBaseUrl()}/auth/oauth/bootstrap`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ referredByCode }),
          });

          if (res.ok) {
            const data = await res.json();

            // Admin routing takes priority over every consumer onboarding
            // gate: an admin identity never goes through /select-country
            // (docs/context.md's Admin Authentication Architecture).
            if (data.isAdmin) {
              return redirectAndClearRefCookie(`${origin}${ADMIN_ENTRY_PATH}`);
            }

            if (!data.country) {
              return redirectAndClearRefCookie(`${origin}/select-country`);
            }
          } else {
            // Could not confirm a country is set. Fail safe to the
            // selection step rather than risk reaching the dashboard
            // without one.
            return redirectAndClearRefCookie(`${origin}/select-country`);
          }
        } catch {
          return redirectAndClearRefCookie(`${origin}/select-country`);
        }
      }

      return redirectAndClearRefCookie(`${origin}${POST_AUTH_ENTRY_PATH}`);
    }
  }

  const reason = oauthErrorDescription ?? exchangeErrorMessage;
  const query = reason
    ? `?error=oauth&reason=${encodeURIComponent(reason)}`
    : "?error=oauth";
  return redirectAndClearRefCookie(`${origin}/login${query}`);
}
