import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications/get-notifications";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { NotificationList } from "@/components/notifications/notification-list";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const items = user ? await getNotifications(supabase, user.id) : [];

  return (
    <>
      <InnerPageHeader title="Notifications" />
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-16 sm:px-6">
        <NotificationList initialItems={items} />
      </main>
    </>
  );
}
