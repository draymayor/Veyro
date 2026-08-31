import { UserGroupIcon } from "@heroicons/react/24/solid";
import {
  REFERRALS_LEADERBOARD,
  CURRENT_USER_REFERRAL_RANK,
  CURRENT_USER_REFERRAL_COUNT,
  LEADERBOARD_PERIOD_LABEL,
} from "@/lib/leaderboard/data";
import type { AppUser } from "@/components/app/app-user";
import { LeaderboardRow } from "./leaderboard-row";

interface ReferralsPanelProps {
  /** The signed-in viewer, so their pinned row uses their real avatar/identity. */
  currentUser: AppUser;
}

function formatReferralCount(count: number): string {
  return `${count} referral${count === 1 ? "" : "s"}`;
}

/**
 * Ranked by number of successful referrals for the current week. Header
 * carries its own icon badge and tint (a tinted outline, deliberately
 * distinct from TradingPanel's solid-fill badge) plus a page-level
 * divider on desktop, so the two panels read as clearly separate
 * sections rather than two near-identical cards told apart only by a
 * subtle color difference.
 */
export function ReferralsPanel({ currentUser }: ReferralsPanelProps) {
  const isViewerVisible = REFERRALS_LEADERBOARD.some(
    (entry) => entry.user.id === currentUser.id,
  );

  return (
    <div className="bg-card border-border rounded-2xl border p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
          <UserGroupIcon className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-ink font-heading text-base font-semibold">
            Top Referrers
          </h2>
          <span className="text-ink/40 text-xs font-medium">
            {LEADERBOARD_PERIOD_LABEL}
          </span>
        </div>
      </div>
      <div className="flex flex-col">
        {REFERRALS_LEADERBOARD.map((entry) => (
          <LeaderboardRow
            key={entry.user.id}
            rank={entry.rank}
            user={{ ...entry.user, fullName: null, profileImageUrl: null }}
            statValue={formatReferralCount(entry.referralCount)}
          />
        ))}
      </div>
      {!isViewerVisible ? (
        <div className="border-border/60 mt-1 border-t border-dashed pt-1">
          <LeaderboardRow
            rank={CURRENT_USER_REFERRAL_RANK}
            user={currentUser}
            statValue={formatReferralCount(CURRENT_USER_REFERRAL_COUNT)}
            isCurrentUser
            pinned
          />
        </div>
      ) : null}
    </div>
  );
}
