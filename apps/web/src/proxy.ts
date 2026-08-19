import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  DISPLAY_CURRENCY_COOKIE,
  resolveDisplayCurrency,
} from "@/lib/display-currency/constants";

const PROTECTED_PATHS = [
  "/home",
  "/leaderboard",
  "/assets",
  "/settings",
  "/notifications",
  "/sell",
];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedPath = PROTECTED_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  // Display-only currency preference for public pages, derived fresh from
  // Vercel's edge geolocation on every request. This never touches wallet
  // currency (set explicitly at signup) or trade rate logic.
  const displayCurrency = resolveDisplayCurrency(
    request.headers.get("x-vercel-ip-country"),
  );

  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect_to", request.nextUrl.pathname);
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.cookies.set(DISPLAY_CURRENCY_COOKIE, displayCurrency, {
      path: "/",
      sameSite: "lax",
    });
    return redirectResponse;
  }

  supabaseResponse.cookies.set(DISPLAY_CURRENCY_COOKIE, displayCurrency, {
    path: "/",
    sameSite: "lax",
  });

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
