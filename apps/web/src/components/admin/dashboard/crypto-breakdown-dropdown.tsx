"use client";

import { useState } from "react";
import {
  formatSymbolTotal,
  type AdminSymbolTotal,
} from "@/lib/admin/dashboard-metrics";

interface CryptoBreakdownDropdownProps {
  totals: AdminSymbolTotal[];
}

/**
 * Per-asset accumulated balance across all users (docs/admin-guide.md's
 * Dashboard Overview) - "select symbol, sum(balance) from crypto_wallets
 * group by symbol", already computed server-side (admin-dashboard.service.ts)
 * and just rendered here. A dropdown rather than another MetricCard grid
 * entry since the asset list is unbounded (one row per symbol any user
 * holds), unlike the fixed metric tiles above it.
 */
export function CryptoBreakdownDropdown({
  totals,
}: CryptoBreakdownDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-card border-border rounded-xl border p-3 sm:p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <div>
          <p className="text-ink/60 text-[11px] font-medium sm:text-xs">
            Crypto held, by asset
          </p>
          <p className="text-ink/40 mt-1 text-[11px] leading-snug">
            Platform-wide balance across every user, per symbol
          </p>
        </div>
        <span
          className={`text-ink/60 shrink-0 pl-2 text-xs transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open ? (
        totals.length === 0 ? (
          <p className="text-ink/40 mt-3 text-xs">No crypto held yet.</p>
        ) : (
          <ul className="divide-border mt-3 flex flex-col divide-y">
            {totals.map(({ symbol, total }) => (
              <li
                key={symbol}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="text-ink font-medium">{symbol}</span>
                <span className="text-ink tabular-nums">
                  {formatSymbolTotal(total)}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
