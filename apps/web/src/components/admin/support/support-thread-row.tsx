import Link from "next/link";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { SUPPORT_CATEGORIES } from "@/lib/support/categories";
import type { AdminSupportThreadListItem } from "@/lib/admin/support/types";
import type { SupportCategory } from "@/lib/support/types";

const CATEGORY_LABEL: Record<SupportCategory, string> = Object.fromEntries(
  SUPPORT_CATEGORIES.map((option) => [option.value, option.label]),
) as Record<SupportCategory, string>;

function userLabel(displayName: string | null, userId: string): string {
  return displayName ?? `User ${userId.slice(0, 8)}`;
}

export function SupportThreadRow({
  thread,
}: {
  thread: AdminSupportThreadListItem;
}) {
  return (
    <Link
      href={`/admin/support/${thread.user_id}`}
      className="hover:bg-secondary/60 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors sm:gap-4 sm:px-3"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-ink truncate text-sm font-medium">
            {userLabel(thread.display_name, thread.user_id)}
          </span>
          <span className="text-ink/40 shrink-0 text-xs">
            {CATEGORY_LABEL[thread.category]}
          </span>
        </div>
        <p className="text-ink/50 truncate text-xs">
          {thread.last_message_body ?? thread.subject}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge
          label={thread.status === "resolved" ? "Resolved" : "Open"}
          tone={thread.status === "resolved" ? "success" : "neutral"}
        />
        <span className="text-ink/40 text-[11px]">
          {formatRelativeTime(thread.last_message_at ?? thread.updated_at)}
        </span>
      </div>
    </Link>
  );
}
