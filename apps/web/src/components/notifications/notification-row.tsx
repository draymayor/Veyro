import {
  ArrowsRightLeftIcon,
  WalletIcon,
  UserGroupIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/solid";
import type { NotificationItem } from "@/lib/notifications/data";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { cn } from "@/lib/utils";

const CATEGORY_ICON = {
  trades: ArrowsRightLeftIcon,
  wallet: WalletIcon,
  referrals: UserGroupIcon,
  account: ShieldCheckIcon,
} as const;

interface NotificationRowProps {
  item: NotificationItem;
  onSelect: (item: NotificationItem) => void;
}

/**
 * Flat notification row, no shadow or dividing line, per
 * design-principles.md's List/Row Styling rule. Unread rows get a subtle
 * tint plus a leading dot; both clear the moment the row is tapped.
 */
export function NotificationRow({ item, onSelect }: NotificationRowProps) {
  const Icon = CATEGORY_ICON[item.category];
  const unread = item.readAt === null;

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={cn(
        "flex w-full items-start gap-4 rounded-2xl px-3 py-4 text-left transition-colors sm:px-4",
        unread ? "bg-primary/5" : "hover:bg-secondary/50",
      )}
    >
      <span className="bg-secondary text-ink/60 flex size-10 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className="text-ink flex-1 text-sm font-medium">
            {item.title}
          </span>
          {unread ? (
            <span
              className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full"
              aria-label="Unread"
            />
          ) : null}
        </span>
        <span className="text-ink/60 mt-0.5 block text-sm">{item.body}</span>
        <span className="text-ink/40 mt-1.5 block text-xs">
          {formatRelativeTime(item.createdAt)}
        </span>
      </span>
    </button>
  );
}
