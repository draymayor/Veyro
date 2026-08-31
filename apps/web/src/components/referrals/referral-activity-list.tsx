import { UserIcon, UserGroupIcon } from "@heroicons/react/24/solid";
import type {
  ReferralActivityItem,
  ReferralActivityStatus,
} from "@/lib/referrals/data";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { BadgeTone } from "@/lib/dashboard/trade-status";

interface ReferralActivityListProps {
  activity: ReferralActivityItem[];
}

function activityStatusInfo(status: ReferralActivityStatus): {
  label: string;
  tone: BadgeTone;
} {
  return status === "first_trade_completed"
    ? { label: "Bonus Earned", tone: "success" }
    : { label: "Signed Up", tone: "neutral" };
}

/**
 * History of referred users. Per docs/product-rules.md's privacy rule,
 * never shows a referred user's email or any other identifying info, only
 * non-identifying status (signed up vs. completed their first trade, the
 * bonus-triggering activity) and a relative join label. Flat rows, no
 * shadows or dividers, per design-principles.md's List/Row Styling rule,
 * the same visual language TransactionHistoryList and AssetsBreakdown use.
 */
export function ReferralActivityList({ activity }: ReferralActivityListProps) {
  return (
    <section>
      <h2 className="text-ink font-heading mb-2 text-base font-medium">
        Referral Activity
      </h2>
      {activity.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col">
          {activity.map((item) => {
            const { label, tone } = activityStatusInfo(item.status);
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-2xl px-1 py-4 sm:px-2"
              >
                <span className="bg-secondary text-ink/60 flex size-10 shrink-0 items-center justify-center rounded-full">
                  <UserIcon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-ink block text-sm font-medium">
                    Referred user
                  </span>
                  <span className="text-ink/45 block text-xs">
                    Joined {item.joinedRelative}
                  </span>
                </span>
                <StatusBadge label={label} tone={tone} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// Reuses ui-copy.md's existing "No referrals yet" empty-state copy
// verbatim rather than inventing new wording, calm and on-brand already.
function EmptyState() {
  return (
    <div className="border-border text-ink/50 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
      <UserGroupIcon className="text-ink/30 size-6" aria-hidden="true" />
      <p>Invite friends and earn when they trade.</p>
    </div>
  );
}
