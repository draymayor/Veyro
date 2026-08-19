"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DisplayCurrency } from "@/lib/display-currency/constants";

const DisplayCurrencyContext = createContext<DisplayCurrency>("USD");

interface DisplayCurrencyProviderProps {
  currency: DisplayCurrency;
  children: ReactNode;
}

/**
 * Provides the public-page display currency (detected server-side from
 * x-vercel-ip-country) to client components. This is display-only state
 * for price formatting on marketing pages and is unrelated to a signed-in
 * user's wallet currency.
 */
export function DisplayCurrencyProvider({
  currency,
  children,
}: DisplayCurrencyProviderProps) {
  return (
    <DisplayCurrencyContext.Provider value={currency}>
      {children}
    </DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency(): DisplayCurrency {
  return useContext(DisplayCurrencyContext);
}
