export type AccountStatus = "active" | "restricted" | "banned";

export interface AdminUserListItem {
  id: string;
  display_name: string | null;
  email: string | null;
  country: string | null;
  currency: string | null;
  kyc_status: string;
  account_status: AccountStatus;
  withdrawals_suspended: boolean;
  created_at: string;
}

export interface AdminUserTrade {
  id: string;
  asset_type: "gift_card" | "crypto";
  status: string;
  gift_card_brand_name: string | null;
  crypto_asset_symbol: string | null;
  crypto_asset_network: string | null;
  asset_amount: number;
  quoted_payout: number;
  currency: string;
  created_at: string;
}

export interface AdminUserWithdrawal {
  id: string;
  amount: number;
  method: "bank_transfer" | "paypal" | "crypto";
  status: string;
  transaction_reference: string | null;
  created_at: string;
}

export interface AdminUserLedgerEntry {
  id: string;
  ledger: "fiat" | "crypto";
  wallet_currency: string;
  crypto_symbol: string | null;
  trade_id: string | null;
  withdrawal_id: string | null;
  type: "credit" | "debit";
  amount: number;
  balance_after: number;
  created_at: string;
}

export interface AdminUserDetail {
  id: string;
  display_name: string | null;
  email: string | null;
  country: string | null;
  currency: string | null;
  kyc_status: string;
  account_status: AccountStatus;
  withdrawals_suspended: boolean;
  referral_code: string | null;
  referrer: {
    id: string;
    display_name: string | null;
    email: string | null;
  } | null;
  created_at: string;
  total_trading_volume: number;
  trades: AdminUserTrade[];
  withdrawals: AdminUserWithdrawal[];
  wallet_ledger: AdminUserLedgerEntry[];
}
