import { cookies, headers } from "next/headers";
import { DisplayCurrencyProvider } from "@/lib/display-currency/context";
import {
  DISPLAY_CURRENCY_COOKIE,
  resolveDisplayCurrency,
} from "@/lib/display-currency/constants";

/**
 * Wraps the public marketing routes with the detected display currency
 * (see proxy.ts, which sets DISPLAY_CURRENCY_COOKIE from
 * x-vercel-ip-country). Falls back to the request header directly if the
 * cookie is unavailable for some reason, so the fallback to USD still
 * holds locally or off Vercel's edge.
 */
export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(DISPLAY_CURRENCY_COOKIE)?.value;
  const currency =
    cookieValue === "NGN" || cookieValue === "USD"
      ? cookieValue
      : resolveDisplayCurrency((await headers()).get("x-vercel-ip-country"));

  return (
    <DisplayCurrencyProvider currency={currency}>
      {children}
    </DisplayCurrencyProvider>
  );
}
