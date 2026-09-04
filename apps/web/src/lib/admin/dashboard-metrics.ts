export interface AdminCurrencyTotal {
  currency: string;
  total: number;
}

export interface AdminSymbolTotal {
  symbol: string;
  total: number;
}

export interface AdminDashboardMetrics {
  totalUsers: number;
  todaysTrades: number;
  pendingTrades: number;
  todaysVolumeByCurrency: AdminCurrencyTotal[];
  walletLiabilitiesByCurrency: AdminCurrencyTotal[];
  walletLiabilitiesCombinedUsd: number | null;
  totalCryptoTrades: number;
  cryptoWalletsBySymbol: AdminSymbolTotal[];
  withdrawalsPending: number;
  revenueAvailable: false;
  // Webhook-based deposit auto-crediting: the real Tatum subscription cap
  // is tiny (platform-wide, shared across every chain) and will bind
  // almost immediately, so this is a real operational fact worth
  // surfacing rather than a hidden backend constant.
  webhookCoverage: {
    slotsUsed: number;
    slotsTotal: number;
  };
  notifications: {
    pendingTrades: number;
    pendingWithdrawals: number;
    openSupportThreads: number;
    // A reorg reversed a webhook-credited deposit but the user had
    // already spent/withdrawn the credited amount - never auto-resolved,
    // needs a human to look at it.
    orphanedReorgsNeedingReview: number;
  };
}

/** e.g. 1234.5 BTC -> "1,234.5" - crypto balances need more precision than currency formatting allows, no currency symbol. */
export function formatSymbolTotal(total: number): string {
  return total.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

/**
 * Formats a currency-grouped total list as one string per currency (e.g.
 * ["$1,200", "NGN450,000"]), one line per currency rather than a single
 * joined string, so a multi-currency total never has to be crammed onto
 * one line inside a compact metric card.
 */
export function formatCurrencyTotals(totals: AdminCurrencyTotal[]): string[] {
  if (totals.length === 0) return ["0"];
  return totals.map(({ currency, total }) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(total);
    } catch {
      return `${currency} ${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    }
  });
}
