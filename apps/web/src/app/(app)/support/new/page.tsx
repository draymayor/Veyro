import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { SupportNewTicketForm } from "@/components/support/support-new-ticket-form";

export const metadata: Metadata = {
  title: "New Ticket",
};

export default async function NewSupportTicketPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <InnerPageHeader title="New Ticket" />
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-4 sm:px-6">
        {user ? <SupportNewTicketForm userId={user.id} /> : null}
      </main>
    </>
  );
}
