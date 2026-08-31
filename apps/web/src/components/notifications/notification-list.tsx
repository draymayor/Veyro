"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs } from "radix-ui";
import { createClient } from "@/lib/supabase/client";
import {
  NOTIFICATION_CATEGORIES,
  type NotificationItem,
} from "@/lib/notifications/data";
import { NotificationRow } from "./notification-row";

const TAB_TRIGGER =
  "text-ink/50 data-[state=active]:bg-card data-[state=active]:text-ink data-[state=active]:shadow-sm rounded-full px-4 py-1.5 text-sm font-medium transition-colors";

// Empty-state copy per docs/ui-copy.md's Empty States section.
const EMPTY_COPY: Record<
  (typeof NOTIFICATION_CATEGORIES)[number]["value"],
  string
> = {
  all: "You're all caught up. We'll let you know when something changes.",
  trades:
    "No trade notifications yet. We'll let you know when a submission's status changes.",
  wallet:
    "No wallet notifications yet. We'll let you know when a withdrawal's status changes.",
  referrals:
    "No referral notifications yet. Invite friends and earn when they trade.",
  account:
    "No account notifications yet. We'll let you know about anything security-related here.",
};

interface NotificationListProps {
  initialItems: NotificationItem[];
}

/**
 * Client-held copy of the real notifications fetched server-side
 * (get-notifications.ts) so tapping a row can flip its read state and
 * clear the unread dot immediately. The tap also fires a real
 * `notifications.read_at` update (docs/database-schema.md: "Client can ...
 * UPDATE own rows (to mark read)"), scoped to this user's own row by RLS.
 */
export function NotificationList({ initialItems }: NotificationListProps) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>(initialItems);

  const grouped = useMemo(() => {
    const byCategory: Record<string, NotificationItem[]> = { all: items };
    for (const item of items) {
      (byCategory[item.category] ??= []).push(item);
    }
    return byCategory;
  }, [items]);

  function handleSelect(item: NotificationItem) {
    setItems((prev) =>
      prev.map((n) =>
        n.id === item.id && n.readAt === null
          ? { ...n, readAt: new Date().toISOString() }
          : n,
      ),
    );

    if (item.readAt === null) {
      const supabase = createClient();
      void supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", item.id);
    }

    if (item.relatedTradeId || item.relatedWithdrawalId) {
      router.push("/assets");
    }
  }

  return (
    <Tabs.Root defaultValue="all">
      <Tabs.List className="bg-secondary/70 mb-4 inline-flex gap-1 rounded-full p-1">
        {NOTIFICATION_CATEGORIES.map((category) => (
          <Tabs.Trigger
            key={category.value}
            value={category.value}
            className={TAB_TRIGGER}
          >
            {category.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {NOTIFICATION_CATEGORIES.map((category) => {
        const categoryItems = grouped[category.value] ?? [];
        return (
          <Tabs.Content key={category.value} value={category.value}>
            {categoryItems.length > 0 ? (
              <div className="flex flex-col">
                {categoryItems.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            ) : (
              <p className="text-ink/50 px-3 py-10 text-center text-sm sm:px-4">
                {EMPTY_COPY[category.value]}
              </p>
            )}
          </Tabs.Content>
        );
      })}
    </Tabs.Root>
  );
}
