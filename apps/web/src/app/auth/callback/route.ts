import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/oauth/bootstrap`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${session.access_token}` },
            },
          );

          if (res.ok) {
            const data = await res.json();
            if (!data.country) {
              return NextResponse.redirect(`${origin}/select-country`);
            }
          } else {
            // Could not confirm a country is set. Fail safe to the
            // selection step rather than risk reaching the dashboard
            // without one.
            return NextResponse.redirect(`${origin}/select-country`);
          }
        } catch {
          return NextResponse.redirect(`${origin}/select-country`);
        }
      }

      return NextResponse.redirect(`${origin}/home`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
