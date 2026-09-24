"use client";

import { StatusBadge } from "@/components/dashboard/status-badge";
import type { EarnClaim, EarnClaimStatus } from "@/lib/earn/data";

interface EarnClaimedCardProps {
  claim: EarnClaim;
  /** USD value of real crypto deposits since claimed_at, null once no longer relevant (unlocked/paid/expired). */
  depositVolumeUsd: number | null;
}

const STATUS_INFO: Record<
  EarnClaimStatus,
  { label: string; tone: "success" | "neutral" | "error" }
> = {
  claimed: { label: "Locked", tone: "neutral" },
  unlocked: { label: "Withdrawable", tone: "success" },
  paid: { label: "Withdrawable", tone: "success" },
  expired: { label: "Expired", tone: "error" },
};

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

// bonus_amount_usd is a literal USDT amount (column name kept as-is so the
// API's shared reminder query works across both bonus tables - see
// WelcomeBonusService) - this genuinely is USDT, not a relabeled USD figure.
function formatUsdt(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")} USDT`;
}

/**
 * Claimed state on the Earn page: status and progress toward
 * required_deposit_usd while still 'claimed'. The bonus is already
 * credited to the wallet at this point - 'claimed' just means it's locked
 * until the deposit requirement is met (WithdrawalsService enforces this
 * server-side; a deposit lifts it automatically, no expiry).
 */
export function EarnClaimedCard({
  claim,
  depositVolumeUsd,
}: EarnClaimedCardProps) {
  const { label, tone } = STATUS_INFO[claim.status];
  const requiredDeposit = Number(claim.required_deposit_usd);
  const progressPct =
    claim.status === "claimed" && depositVolumeUsd !== null
      ? Math.min(100, Math.round((depositVolumeUsd / requiredDeposit) * 100))
      : null;

  return (
    <div className="bg-primary relative overflow-hidden rounded-3xl p-6 sm:p-8">
      <div className="relative flex flex-col items-center gap-4 text-center">
        <p className="text-primary-foreground/70 text-xs font-medium tracking-wide uppercase">
          Earn bonus
        </p>

        <div className="flex items-center gap-2">
          <span className="font-heading text-primary-foreground text-3xl font-semibold sm:text-4xl">
            {formatUsdt(claim.bonus_amount_usd)}
          </span>
          <StatusBadge label={label} tone={tone} />
        </div>

        {claim.status === "claimed" ? (
          <>
            <p className="text-primary-foreground/85 text-sm">
              Already in your wallet. Deposit crypto worth{" "}
              {formatUsd(requiredDeposit)} or more to make it withdrawable.
            </p>
            <div className="border-primary-foreground/15 bg-primary-foreground/10 w-full rounded-xl border p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-primary-foreground/70">
                  Deposit progress
                </span>
                <span className="text-primary-foreground font-medium tabular-nums">
                  {formatUsd(depositVolumeUsd ?? 0)} /{" "}
                  {formatUsd(requiredDeposit)}
                </span>
              </div>
              <div className="bg-primary-foreground/20 mt-2 h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary-foreground h-full rounded-full transition-all"
                  style={{ width: `${progressPct ?? 0}%` }}
                />
              </div>
            </div>
          </>
        ) : claim.status === "unlocked" || claim.status === "paid" ? (
          <p className="text-primary-foreground/85 text-sm">
            Deposit requirement met - this bonus is withdrawable.
          </p>
        ) : (
          <p className="text-primary-foreground/85 text-sm">
            This claim expired before the deposit requirement was met.
          </p>
        )}
      </div>
    </div>
  );
}
