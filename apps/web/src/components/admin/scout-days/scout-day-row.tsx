import Link from "next/link";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { tradeUserLabel, formatDateTime } from "@/lib/admin/trades/display";
import type {
  AdminScoutDayListItem,
  AdminScoutDayStatus,
} from "@/lib/admin/scout-days/types";

const STATUS_TONE: Record<
  AdminScoutDayStatus,
  { label: string; tone: "success" | "neutral" | "error" }
> = {
  in_progress: { label: "In Progress", tone: "neutral" },
  pending_review: { label: "Pending Review", tone: "neutral" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "error" },
};

export function ScoutDayRow({ day }: { day: AdminScoutDayListItem }) {
  const { label, tone } = STATUS_TONE[day.status];

  return (
    <Link
      href={`/admin/scout-days/${day.id}`}
      className="hover:bg-secondary/60 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors sm:gap-4 sm:px-3"
    >
      <div className="min-w-0 flex-1">
        <span className="text-ink truncate text-sm font-medium">
          {tradeUserLabel(day.user_display_name, day.user_id)}
        </span>
        <p className="text-ink/50 truncate text-xs">
          {day.link_count} link{day.link_count === 1 ? "" : "s"}
        </p>
        <p className="text-ink/35 text-xs">
          Opened {formatDateTime(day.opened_at)}
        </p>
      </div>

      <StatusBadge label={label} tone={tone} />
    </Link>
  );
}
