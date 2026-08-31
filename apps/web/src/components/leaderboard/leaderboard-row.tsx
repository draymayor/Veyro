import type { ReactNode } from "react";
import { UserAvatar } from "@/components/app/user-avatar";
import type { AppUser } from "@/components/app/app-user";
import { maskIdentifier } from "@/lib/mask-identifier";
import { cn } from "@/lib/utils";

interface LeaderboardRowProps {
  rank: number;
  /**
   * Always a full AppUser, the same shape Profile, the sidebar, and the
   * top bar render through, so <UserAvatar> generates the exact same
   * avatar for a given id everywhere it appears (one source of truth,
   * not a second identity that can drift). Callers without real photo
   * data for a row (every placeholder entry below the viewer's own)
   * pass profileImageUrl/fullName as null, which is exactly what
   * UserAvatar expects for "no uploaded photo yet".
   */
  user: AppUser;
  statValue: ReactNode;
  isCurrentUser?: boolean;
  /**
   * True for the viewer's own row when it's pinned below the visible
   * list because their rank falls outside it (e.g. "You: #47"), rather
   * than appearing naturally in place among the top entries.
   */
  pinned?: boolean;
}

/**
 * Flat row, no shadow or dividing line, per design-principles.md's
 * List/Row Styling rule. Top 3 ranks get a graduated terracotta badge
 * instead of a plain number, staying within the brand's one-accent-color
 * rule (vibrant green is reserved for success/approved states and price
 * gains only, never used decoratively for ranking).
 */
export function LeaderboardRow({
  rank,
  user,
  statValue,
  isCurrentUser = false,
  pinned = false,
}: LeaderboardRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl px-2 py-3 sm:px-3",
        isCurrentUser && "bg-primary/5",
      )}
    >
      {pinned ? (
        <span className="flex w-6 shrink-0 items-center justify-center">
          <span className="bg-primary size-2 rounded-full" aria-hidden="true" />
        </span>
      ) : (
        <RankBadge rank={rank} />
      )}
      <UserAvatar user={user} size={32} />
      <span className="min-w-0 flex-1">
        <span className="text-ink block truncate text-sm font-medium">
          {pinned
            ? `You: #${rank}`
            : isCurrentUser
              ? "You"
              : maskIdentifier(user.email)}
        </span>
      </span>
      <span className="text-ink shrink-0 text-sm font-medium tabular-nums">
        {statValue}
      </span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank > 3) {
    return (
      <span className="text-ink/40 w-6 shrink-0 text-center text-sm font-medium tabular-nums">
        {rank}
      </span>
    );
  }

  const tone =
    rank === 1
      ? "bg-primary text-primary-foreground"
      : rank === 2
        ? "bg-primary/20 text-primary"
        : "bg-primary/10 text-primary";

  return (
    <span
      className={cn(
        "font-heading flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        tone,
      )}
    >
      {rank}
    </span>
  );
}
