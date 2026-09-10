"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { EarnClaim, EarnClaimStatus } from "@/lib/earn/data";

interface EarnClaimedCardProps {
  claim: EarnClaim;
  /** USD trade volume generated since claimed_at, null once no longer relevant (unlocked/paid/expired). */
  tradeVolumeUsd: number | null;
}

const STATUS_INFO: Record<
  EarnClaimStatus,
  { label: string; tone: "success" | "neutral" | "error" }
> = {
  claimed: { label: "Claimed", tone: "neutral" },
  unlocked: { label: "Unlocked", tone: "success" },
  paid: { label: "Paid", tone: "success" },
  expired: { label: "Expired", tone: "error" },
};

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Display-only relabel, same as the Earn page's pool card - the bonus and
// required amounts are still computed and stored in USD (bonus_amount_usd,
// required_trade_volume_usd), this just shows the figure as USDT.
function formatUsdt(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")} USDT`;
}

function timeLeftLabel(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days > 0) return `${days}d ${remainingHours}h left`;
  if (hours > 0) return `${hours}h left`;
  return "Less than 1h left";
}

/**
 * Claimed state on the Earn page: status, expiry countdown, and progress
 * toward required_trade_volume_usd while still 'claimed'. The countdown
 * re-renders on an interval purely for display - the real expiry
 * enforcement is server-side (EarnService.checkAndUnlockBonus), this can
 * never itself unlock or expire anything.
 */
export function EarnClaimedCard({
  claim,
  tradeVolumeUsd,
}: EarnClaimedCardProps) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (claim.status !== "claimed") return;
    const id = setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [claim.status]);

  const { label, tone } = STATUS_INFO[claim.status];
  const requiredVolume = Number(claim.required_trade_volume_usd);
  const progressPct =
    claim.status === "claimed" && tradeVolumeUsd !== null
      ? Math.min(100, Math.round((tradeVolumeUsd / requiredVolume) * 100))
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
              Deposit crypto worth {formatUsd(requiredVolume)} to withdraw this
              bonus
            </p>
            <div className="border-primary-foreground/15 bg-primary-foreground/10 w-full rounded-xl border p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-primary-foreground/70">
                  Trade volume progress
                </span>
                <span className="text-primary-foreground font-medium tabular-nums">
                  {formatUsd(tradeVolumeUsd ?? 0)} / {formatUsd(requiredVolume)}
                </span>
              </div>
              <div className="bg-primary-foreground/20 mt-2 h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary-foreground h-full rounded-full transition-all"
                  style={{ width: `${progressPct ?? 0}%` }}
                />
              </div>
            </div>
            <p className="text-primary-foreground/70 text-xs">
              {timeLeftLabel(claim.expires_at)} · expires{" "}
              {new Date(claim.expires_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </p>
          </>
        ) : claim.status === "unlocked" ? (
          <p className="text-primary-foreground/85 text-sm">
            Unlocked! Your bonus is being credited to your wallet.
          </p>
        ) : claim.status === "paid" ? (
          <p className="text-primary-foreground/85 text-sm">
            Credited to your wallet.
          </p>
        ) : (
          <p className="text-primary-foreground/85 text-sm">
            This claim expired before the trade volume requirement was met.
          </p>
        )}
      </div>
    </div>
  );
}
