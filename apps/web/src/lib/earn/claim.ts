import { authFetch } from "@/lib/api-client";
import type { EarnStatus } from "./data";

/** POST /earn/claim - claims one of the two Earn bonus options. */
export function claimEarnBonus(bonusAmountUsd: number): Promise<EarnStatus> {
  return authFetch<EarnStatus>("/earn/claim", {
    method: "POST",
    body: JSON.stringify({ bonusAmountUsd }),
  });
}
