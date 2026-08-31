import Link from "next/link";
import {
  ClipboardDocumentCheckIcon,
  ArrowUpCircleIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";
import type { AdminDashboardMetrics } from "@/lib/admin/dashboard-metrics";

interface NotificationsPanelProps {
  notifications: AdminDashboardMetrics["notifications"];
}

/**
 * Live-derived admin notifications (docs/admin-guide.md): direct counts
 * against trades/withdrawals/support_threads, per the same numbers already
 * computed for the top-level metrics, not a separate notifications table
 * (that would duplicate the existing per-user notifications concept).
 */
export function NotificationsPanel({ notifications }: NotificationsPanelProps) {
  const items = [
    {
      href: "/admin/trades",
      icon: ClipboardDocumentCheckIcon,
      label: "Pending trades",
      count: notifications.pendingTrades,
    },
    {
      href: "/admin/withdrawals",
      icon: ArrowUpCircleIcon,
      label: "Pending withdrawals",
      count: notifications.pendingWithdrawals,
    },
    {
      href: "/admin/support",
      icon: ChatBubbleLeftRightIcon,
      label: "Support threads awaiting reply",
      count: notifications.openSupportThreads,
    },
  ];

  return (
    <div className="bg-card border-border rounded-2xl border p-4 sm:p-5">
      <h2 className="font-heading text-ink text-base font-semibold">
        Needs attention
      </h2>
      <div className="mt-3 flex flex-col">
        {items.map(({ href, icon: Icon, label, count }) => (
          <Link
            key={href}
            href={href}
            className="hover:bg-secondary -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors"
          >
            <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="text-ink min-w-0 flex-1 text-sm font-medium">
              {label}
            </span>
            <span
              className={
                count > 0
                  ? "bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
                  : "text-ink/40 shrink-0 text-sm font-medium tabular-nums"
              }
            >
              {count}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
