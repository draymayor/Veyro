import type { ComponentType, SVGProps } from "react";
import {
  UserGroupIcon,
  BanknotesIcon,
  ClockIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/solid";

interface ReferralStatsProps {
  totalReferrals: number;
  totalEarnedUsd: number;
  /** Sum of referral_bonus_usd for every referral still pending (bonus_paid_at null). */
  potentialEarningUsd: number;
  /** Referrals within periodLabel's window (e.g. "This Week"). */
  periodReferralCount: number;
  periodLabel: string;
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Stats row: lifetime referral count, lifetime referral earnings (bonuses
 * actually paid, bonus_paid_at set), still-pending potential earnings
 * (bonus_paid_at null, eligible once each referred user makes their first
 * deposit), and this period's referral count, tied to the same weekly
 * window the Leaderboard ranks by (periodLabel). Both dollar figures show
 * in USD, matching platform_settings.referral_bonus_usd's own unit, rather
 * than introducing a second currency-conversion policy just for this page.
 */
export function ReferralStats({
  totalReferrals,
  totalEarnedUsd,
  potentialEarningUsd,
  periodReferralCount,
  periodLabel,
}: ReferralStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile
        icon={UserGroupIcon}
        label="Total Referrals"
        value={totalReferrals.toLocaleString("en-US")}
      />
      <StatTile
        icon={BanknotesIcon}
        label="Total Earned"
        value={formatUsd(totalEarnedUsd)}
      />
      <StatTile
        icon={ClockIcon}
        label="Potential Earning"
        value={formatUsd(potentialEarningUsd)}
      />
      <StatTile
        icon={CalendarDaysIcon}
        label={periodLabel}
        value={periodReferralCount.toLocaleString("en-US")}
      />
    </div>
  );
}

interface StatTileProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
}

function StatTile({ icon: Icon, label, value }: StatTileProps) {
  return (
    <div className="bg-card border-border flex flex-col items-start gap-2 rounded-2xl border p-3 sm:p-4">
      <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="text-ink font-heading block text-lg font-semibold tabular-nums sm:text-xl">
        {value}
      </span>
      <span className="text-ink/45 block text-xs">{label}</span>
    </div>
  );
}
