import Link from "next/link";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { SUPPORT_CATEGORIES } from "@/lib/support/categories";
import type { SupportCategory } from "@/lib/support/types";

export interface SupportTicketListItem {
  id: string;
  category: SupportCategory;
  subject: string;
  status: "open" | "resolved";
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  updatedAt: string;
}

const CATEGORY_LABEL: Record<SupportCategory, string> = Object.fromEntries(
  SUPPORT_CATEGORIES.map((option) => [option.value, option.label]),
) as Record<SupportCategory, string>;

/** One row in the user's own ticket list, styled like the admin inbox's row. */
export function SupportTicketRow({
  ticket,
}: {
  ticket: SupportTicketListItem;
}) {
  return (
    <Link
      href={`/support/${ticket.id}`}
      className="hover:bg-secondary/60 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors sm:gap-4 sm:px-3"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-ink truncate text-sm font-medium">
            {CATEGORY_LABEL[ticket.category]}
          </span>
        </div>
        <p className="text-ink/50 truncate text-xs">
          {ticket.lastMessageBody ?? ticket.subject}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge
          label={ticket.status === "resolved" ? "Resolved" : "Ongoing"}
          tone={ticket.status === "resolved" ? "success" : "neutral"}
        />
        <span className="text-ink/40 text-[11px]">
          {formatRelativeTime(ticket.lastMessageAt ?? ticket.updatedAt)}
        </span>
      </div>
    </Link>
  );
}
