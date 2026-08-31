import type { NotificationItem } from "@/lib/notifications/data";
import { WidgetShell } from "./widget-shell";
import { cn } from "@/lib/utils";

interface NotificationsWidgetProps {
  items: NotificationItem[];
}

export function NotificationsWidget({ items }: NotificationsWidgetProps) {
  return (
    <WidgetShell title="Recent Notifications" href="/notifications">
      {items.length === 0 ? (
        <p className="text-ink/45 text-xs">You&apos;re all caught up.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.slice(0, 3).map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-1.5 size-1.5 shrink-0 rounded-full",
                  item.readAt ? "bg-transparent" : "bg-primary",
                )}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-ink truncate text-xs font-medium">
                  {item.title}
                </p>
                <p className="text-ink/45 truncate text-xs">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  );
}
