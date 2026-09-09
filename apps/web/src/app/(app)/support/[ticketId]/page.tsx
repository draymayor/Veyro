import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { SupportTicketChat } from "@/components/support/support-ticket-chat";

interface PageProps {
  params: Promise<{ ticketId: string }>;
}

export const metadata: Metadata = {
  title: "Support",
};

// Full-page single-ticket conversation. RLS ("select own") means a ticket
// that isn't this user's simply doesn't come back, which is exactly the
// 404 behavior we want here. The header always reads "Veyro Support" -
// the ticket's own category/status is a subtitle inside the chat itself,
// not a second competing title.
export default async function SupportTicketPage({ params }: PageProps) {
  const { ticketId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const [{ data: ticket }, { data: profile }] = await Promise.all([
    supabase
      .from("support_threads")
      .select("id")
      .eq("id", ticketId)
      .maybeSingle(),
    supabase
      .from("users")
      .select("profile_image_url")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (!ticket) notFound();

  return (
    <>
      <InnerPageHeader title="Veyro Support" />
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-4 sm:px-6">
        <SupportTicketChat
          ticketId={ticketId}
          ticketOwner={{
            id: user.id,
            profileImageUrl: profile?.profile_image_url ?? null,
          }}
        />
      </main>
    </>
  );
}
