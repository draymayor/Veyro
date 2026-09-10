export type EarnClaimStatus = "claimed" | "unlocked" | "paid" | "expired";

export interface EarnBonusTier {
  bonusAmountUsd: number;
  requiredTradeVolumeUsd: number;
}

export interface EarnClaim {
  id: string;
  bonus_amount_usd: number;
  required_trade_volume_usd: number;
  status: EarnClaimStatus;
  claimed_at: string;
  expires_at: string;
  unlocked_at: string | null;
  paid_at: string | null;
}

export interface EarnStatus {
  claim: EarnClaim | null;
  tiers: EarnBonusTier[];
  tradeVolumeUsd: number | null;
  /** Admin-set total pool size in USD, displayed to users as a USDT amount. */
  poolTotalUsd: number;
  /** poolTotalUsd minus bonuses already paid out, in USD, displayed as USDT. */
  poolRemainingUsd: number;
}
