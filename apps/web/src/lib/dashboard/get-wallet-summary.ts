import type { SupabaseClient } from "@supabase/supabase-js";
import { getWalletBalance } from "./get-wallet-balance";

export const BALANCE_HISTORY_PERIODS = ["7d", "30d", "90d", "180d"] as const;
export type BalanceHistoryPeriod = (typeof BALANCE_HISTORY_PERIODS)[number];

export interface WalletSummary {
  balance: number;
  currency: string;
  todayPnl: { amount: number; percent: number };
  history: Record<BalanceHistoryPeriod, number[]>;
  /** ISO timestamp this summary was computed at, shown as the chart's "Updated" line. */
  asOf: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Matches the placeholder chart's original point counts per period (7
// daily points for 7d, ~14/18/24 for the longer windows), just resampled
// from the real ledger instead of hand-authored.
const PERIOD_DAYS: Record<BalanceHistoryPeriod, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "180d": 180,
};
const PERIOD_POINTS: Record<BalanceHistoryPeriod, number> = {
  "7d": 7,
  "30d": 14,
  "90d": 18,
  "180d": 24,
};

function emptyHistory(): Record<BalanceHistoryPeriod, number[]> {
  return {
    "7d": [],
    "30d": [],
    "90d": [],
    "180d": [],
  };
}

/**
 * Real replacement for WALLET_SNAPSHOT/BALANCE_HISTORY (lib/dashboard/
 * placeholder-data.ts). wallet_transactions.balance_after is a running
 * balance snapshot per row (docs/database-schema.md), so the actual
 * balance at any past instant is just "the last row at or before that
 * instant", both today's P&L and the period charts are built from that,
 * not a separate stored history table. Reads directly via RLS
 * ("wallet_transactions select own"), same pattern as get-wallet-balance.ts.
 */
export async function getWalletSummary(
  supabase: SupabaseClient,
  userId: string,
  currency: string,
): Promise<WalletSummary> {
  const { data: wallet } = await supabase
    .from("wallets")
    .select("id, balance")
    .eq("user_id", userId)
    .eq("currency", currency)
    .maybeSingle();

  if (!wallet) {
    return {
      balance: 0,
      currency,
      todayPnl: { amount: 0, percent: 0 },
      history: emptyHistory(),
      asOf: new Date().toISOString(),
    };
  }

  const { data: txRows } = await supabase
    .from("wallet_transactions")
    .select("balance_after, created_at")
    .eq("wallet_id", wallet.id)
    .order("created_at", { ascending: true });

  const balance = Number(wallet.balance);
  const points = (txRows ?? []).map((row) => ({
    t: new Date(row.created_at as string).getTime(),
    balance: Number(row.balance_after),
  }));

  // points is sorted ascending, so once one entry's timestamp exceeds ts,
  // every later entry does too, safe to stop there.
  function balanceAt(ts: number): number {
    let result = 0;
    for (const point of points) {
      if (point.t <= ts) result = point.balance;
      else break;
    }
    return result;
  }

  const startOfTodayMs = new Date(new Date().setUTCHours(0, 0, 0, 0)).getTime();
  const balanceStartOfDay = balanceAt(startOfTodayMs - 1);
  const todayAmount = balance - balanceStartOfDay;
  const todayPercent =
    balanceStartOfDay > 0 ? (todayAmount / balanceStartOfDay) * 100 : 0;

  const now = Date.now();
  const history = emptyHistory();
  for (const period of BALANCE_HISTORY_PERIODS) {
    const days = PERIOD_DAYS[period];
    const count = PERIOD_POINTS[period];
    const stepMs = (days * DAY_MS) / (count - 1);
    const series: number[] = [];
    for (let i = 0; i < count; i++) {
      const ts = now - days * DAY_MS + i * stepMs;
      series.push(balanceAt(ts));
    }
    history[period] = series;
  }

  return {
    balance,
    currency,
    todayPnl: { amount: todayAmount, percent: todayPercent },
    history,
    asOf: new Date(now).toISOString(),
  };
}

export { getWalletBalance };
