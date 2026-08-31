import { UserGroupIcon } from "@heroicons/react/24/solid";
import { CopyButton } from "@/components/dashboard/copy-button";
import { WidgetShell } from "./widget-shell";

interface ReferralsWidgetProps {
  referralCount: number;
  link: string;
}

/**
 * Desktop Home sidebar preview. Previously showed only the bare referral
 * code as plain text, with no way to see or copy the actual shareable
 * link, unlike ReferralHeroCard (Referrals page) and ReferralTeaserCard
 * (Leaderboard), which both put the full link in its own bordered,
 * copyable field. This now uses that same field pattern so all three
 * surfaces read as one consistent referral feature.
 */
export function ReferralsWidget({ referralCount, link }: ReferralsWidgetProps) {
  return (
    <WidgetShell title="Referrals" href="/referrals">
      <div className="flex items-center gap-3">
        <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
          <UserGroupIcon className="size-4.5" aria-hidden="true" />
        </span>
        <p className="text-ink font-heading text-sm font-medium tabular-nums">
          {referralCount} referrals
        </p>
      </div>
      <div className="border-border bg-secondary/50 mt-3 flex items-center gap-2 rounded-xl border px-3 py-2">
        <span className="text-ink/70 min-w-0 flex-1 truncate text-xs font-medium">
          {link}
        </span>
        <CopyButton value={link} label="Copy referral link" />
      </div>
    </WidgetShell>
  );
}
