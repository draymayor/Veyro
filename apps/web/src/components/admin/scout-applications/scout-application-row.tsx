import Link from "next/link";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { tradeUserLabel, formatDateTime } from "@/lib/admin/trades/display";
import type { AdminScoutApplicationListItem } from "@/lib/admin/scout-applications/types";

const STATUS_TONE: Record<
  AdminScoutApplicationListItem["status"],
  { label: string; tone: "success" | "neutral" | "error" }
> = {
  pending: { label: "Pending", tone: "neutral" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "error" },
};

export function ScoutApplicationRow({
  application,
}: {
  application: AdminScoutApplicationListItem;
}) {
  const { label, tone } = STATUS_TONE[application.status];
  const platformCount =
    application.platforms.length + (application.other_platform ? 1 : 0);

  return (
    <Link
      href={`/admin/scout-applications/${application.id}`}
      className="hover:bg-secondary/60 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors sm:gap-4 sm:px-3"
    >
      <div className="min-w-0 flex-1">
        <span className="text-ink truncate text-sm font-medium">
          {application.full_name ??
            tradeUserLabel(application.user_display_name, application.user_id)}
        </span>
        <p className="text-ink/50 truncate text-xs">
          {platformCount} platform{platformCount === 1 ? "" : "s"}
        </p>
        <p className="text-ink/35 text-xs">
          {formatDateTime(application.applied_at)}
        </p>
      </div>

      <StatusBadge label={label} tone={tone} />
    </Link>
  );
}
