"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OrbitRings } from "@/components/home/orbit-rings";
import { claimEarnBonus } from "@/lib/earn/claim";
import type { EarnBonusTier } from "@/lib/earn/data";

interface EarnOptionsCardProps {
  tiers: EarnBonusTier[];
  /** True once this browser already sees a claim row for this user - blocks a
   * second claim attempt client-side before it ever reaches the backend,
   * the DB's UNIQUE(user_id) constraint is still the real enforcement. */
  alreadyClaimed: boolean;
  /** Admin-set total pool size in USD (earn.service.ts), shown as USDT - display-only relabel, amounts are still computed and stored in USD. */
  poolTotalUsd: number;
}

function formatUsdt(amount: number): string {
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

/**
 * Big terracotta pool card, matching ReferralHeroCard's treatment on the
 * Referrals page, with a single Claim button. The two bonus tiers ($50 /
 * $100) only appear once Claim is pressed, real money only ever moves once
 * the matching trade-volume requirement is met after claiming, never on
 * deposit alone - see docs/database-schema.md's earn_bonus_claims section
 * for why the earlier deposit-triggered design was scrapped.
 */
export function EarnOptionsCard({
  tiers,
  alreadyClaimed,
  poolTotalUsd,
}: EarnOptionsCardProps) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
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
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
      setPendingAmount(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-primary relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <OrbitRings
          className="text-background pointer-events-none absolute top-1/2 left-1/2 size-80 -translate-x-1/2 -translate-y-1/2 opacity-50 sm:size-96"
          stroke="currentColor"
          dot="currentColor"
        />
        <div className="relative flex flex-col items-center gap-4 text-center">
          <p className="text-primary-foreground/70 text-xs font-medium tracking-wide uppercase">
            Earn bonus pool
          </p>

          <span className="font-heading text-primary-foreground text-2xl leading-snug font-semibold sm:text-3xl">
            {formatUsdt(poolTotalUsd)} USDT pool
          </span>

          {alreadyClaimed ? (
            <p className="text-primary-foreground/85 text-sm">
              You&apos;ve already claimed an Earn bonus. Only one per account.
            </p>
          ) : !selecting ? (
            <Button
              type="button"
              onClick={() => setSelecting(true)}
              variant="secondary"
              size="lg"
              className="bg-background text-ink hover:bg-background/90 w-full"
            >
              Claim
            </Button>
          ) : null}
        </div>
      </div>

      {selecting && !alreadyClaimed ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tiers.map((tier) => (
            <button
              key={tier.bonusAmountUsd}
              type="button"
              disabled={pendingAmount !== null}
              onClick={() => handleClaim(tier.bonusAmountUsd)}
              className="border-border bg-card hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center gap-3 rounded-2xl border p-6 text-center transition-colors disabled:opacity-60"
            >
              <span className="font-heading text-ink text-3xl font-semibold">
                ${tier.bonusAmountUsd}
              </span>
              <p className="text-ink/50 text-xs">
                Requires ${tier.requiredTradeVolumeUsd} in real trade volume to
                unlock
              </p>
              <span className="text-primary text-sm font-semibold">
                {pendingAmount === tier.bonusAmountUsd
                  ? "Claiming..."
                  : `Claim $${tier.bonusAmountUsd}`}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-error text-center text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
