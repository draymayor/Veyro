"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { claimEarnBonus } from "@/lib/earn/claim";
import type { EarnBonusTier } from "@/lib/earn/data";

interface EarnOptionsCardProps {
  tiers: EarnBonusTier[];
  /** True once this browser already sees a claim row for this user - blocks a
   * second claim attempt client-side before it ever reaches the backend,
   * the DB's UNIQUE(user_id) constraint is still the real enforcement. */
  alreadyClaimed: boolean;
}

/**
 * The two Earn options ($50 / $100). Real money only ever moves once the
 * matching trade-volume requirement is met after claiming, never on
 * deposit alone - see docs/database-schema.md's earn_bonus_claims section
 * for why the earlier deposit-triggered design was scrapped.
 */
export function EarnOptionsCard({
  tiers,
  alreadyClaimed,
}: EarnOptionsCardProps) {
  const router = useRouter();
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClaim(bonusAmountUsd: number) {
    if (alreadyClaimed || pendingAmount !== null) return;
    setError(null);
    setPendingAmount(bonusAmountUsd);
    try {
      await claimEarnBonus(bonusAmountUsd);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
      setPendingAmount(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {alreadyClaimed ? (
        <p className="text-ink/50 text-center text-xs">
          You&apos;ve already claimed an Earn bonus. Only one per account.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tiers.map((tier) => (
          <div
            key={tier.bonusAmountUsd}
            className="border-border flex flex-col items-center gap-3 rounded-2xl border p-6 text-center"
          >
            <span className="font-heading text-ink text-3xl font-semibold">
              ${tier.bonusAmountUsd}
            </span>
            <p className="text-ink/50 text-xs">
              Requires ${tier.requiredTradeVolumeUsd} in real trade volume to
              unlock
            </p>
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={alreadyClaimed || pendingAmount !== null}
              onClick={() => handleClaim(tier.bonusAmountUsd)}
            >
              {pendingAmount === tier.bonusAmountUsd
                ? "Claiming..."
                : `Claim $${tier.bonusAmountUsd}`}
            </Button>
          </div>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-error text-center text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
