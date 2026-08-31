/**
 * Assets-page transaction history: a merged, chronological view of trades
 * (docs/database-schema.md `trades`) and withdrawals (`withdrawals`), the
 * two tables product-rules.md rule 22 requires a user be able to see in
 * full. The real query lives in get-transaction-history.ts; this file
 * keeps just the shared item types so the component that renders the list
 * doesn't need to know where the data came from.
 */

import type { TradeStatus, WithdrawalStatus } from "./trade-status";

export interface TradeHistoryItem {
  kind: "trade";
  id: string;
  assetType: "gift_card" | "crypto";
  label: string;
  amount: number;
  currency: string;
  status: TradeStatus;
  createdAt: string;
}

export interface WithdrawalHistoryItem {
  kind: "withdrawal";
  id: string;
  method: "bank_transfer" | "paypal" | "crypto";
  label: string;
  amount: number;
  currency: string;
  status: WithdrawalStatus;
  createdAt: string;
}

// A standalone wallet_transactions row not tied to a trade or withdrawal -
// currently only admin manual deposits/corrections (AdminDepositsService),
// but covers any future standalone credit/debit too. Always shown as
// already-completed: unlike a trade or withdrawal, wallet_transactions is
// only ever written after the balance change has already happened, there's
// no pending state to reflect.
export interface AdjustmentHistoryItem {
  kind: "adjustment";
  id: string;
  type: "credit" | "debit";
  label: string;
  amount: number;
  currency: string;
  createdAt: string;
}

// A crypto_wallet_transactions row (docs/database-schema.md,
// product-rules.md rules 6a/16): real held-crypto-balance activity -
// deposit, instant sell conversion, withdrawal, or an admin correction.
// currency here is always the crypto symbol (e.g. "BTC"), never a fiat
// currency, since crypto_wallets balances are tracked per symbol only.
export interface CryptoWalletHistoryItem {
  kind: "crypto";
  id: string;
  type:
    | "deposit"
    | "sell_conversion_debit"
    | "withdrawal"
    | "admin_credit"
    | "admin_debit";
  label: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export type TransactionHistoryItem =
  | TradeHistoryItem
  | WithdrawalHistoryItem
  | AdjustmentHistoryItem
  | CryptoWalletHistoryItem;
