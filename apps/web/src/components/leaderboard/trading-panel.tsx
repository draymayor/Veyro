import { ArrowsRightLeftIcon } from "@heroicons/react/24/solid";
import {
  TRADING_LEADERBOARD,
  CURRENT_USER_TRADING_RANK,
  CURRENT_USER_TRADING_VOLUME,
  LEADERBOARD_PERIOD_LABEL,
  LEADERBOARD_CURRENCY,
} from "@/lib/leaderboard/data";
import type { AppUser } from "@/components/app/app-user";
import { LeaderboardRow } from "./leaderboard-row";

interface TradingPanelProps {
  /** The signed-in viewer, so their pinned row uses their real avatar/identity. */
  currentUser: AppUser;
}

function formatVolume(amount: number): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: LEADERBOARD_CURRENCY,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${LEADERBOARD_CURRENCY} ${amount.toLocaleString("en-US")}`;
  }
}

/**
 * Ranked by total trade volume for the current week, gift card and
 * crypto trades combined into one number per user (docs/context.md),
 * never shown as two separate rankings. Header carries its own icon
 * badge and tint (distinct from ReferralsPanel's) plus a page-level
 * divider on desktop, so the two panels read as clearly separate
 * sections rather than two near-identical cards told apart only by a
 * subtle color difference.
 */
export function TradingPanel({ currentUser }: TradingPanelProps) {
  const isViewerVisible = TRADING_LEADERBOARD.some(
    (entry) => entry.user.id === currentUser.id,
  );

  return (
    <div className="bg-card border-border rounded-2xl border p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
          <ArrowsRightLeftIcon className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-ink font-heading text-base font-semibold">
            Top Traders
          </h2>
          <span className="text-ink/40 text-xs font-medium">
            {LEADERBOARD_PERIOD_LABEL}
          </span>
        </div>
      </div>
      <div className="flex flex-col">
        {TRADING_LEADERBOARD.map((entry) => (
          <LeaderboardRow
            key={entry.user.id}
            rank={entry.rank}
            user={{ ...entry.user, fullName: null, profileImageUrl: null }}
            statValue={formatVolume(entry.volume)}
          />
        ))}
      </div>
      {!isViewerVisible ? (
        <div className="border-border/60 mt-1 border-t border-dashed pt-1">
          <LeaderboardRow
            rank={CURRENT_USER_TRADING_RANK}
            user={currentUser}
            statValue={formatVolume(CURRENT_USER_TRADING_VOLUME)}
            isCurrentUser
            pinned
          />
        </div>
      ) : null}
    </div>
  );
}
