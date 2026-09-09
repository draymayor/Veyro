import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";
import { createClient } from "@/lib/supabase/server";
import { getSupportTickets } from "@/lib/support/get-tickets";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { SupportTicketRow } from "@/components/support/support-ticket-row";

export const metadata: Metadata = {
  title: "Support",
};

// Full-page ticket list: every ticket the user has ever opened, newest
// activity first. Tapping one resumes that conversation; the header
// action starts a new one. Ticket creation itself lives on its own page
// (/support/new) rather than inline here.
export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tickets = user ? await getSupportTickets(supabase, user.id) : [];

  return (
    <>
      <InnerPageHeader
        title="Support"
        action={
          <Link
            href="/support/new"
            aria-label="New ticket"
            className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full"
          >
            <PlusIcon className="size-4" aria-hidden="true" />
          </Link>
        }
      />
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-4 sm:px-6">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-2 py-10 text-center">
            <span className="bg-secondary text-primary flex size-14 items-center justify-center rounded-full">
              <ChatBubbleLeftRightIcon className="size-6" aria-hidden="true" />
            </span>
            <div className="max-w-xs">
              <p className="text-ink font-heading text-base font-medium">
                How can we help?
              </p>
              <p className="text-ink/50 mt-1.5 text-sm">
                Have a question? Send us a message and our team will get back to
                you.
              </p>
            </div>
            <Link
              href="/support/new"
              className="bg-primary text-primary-foreground mt-2 flex h-11 items-center justify-center rounded-full px-6 text-sm font-medium"
            >
              Start a Conversation
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {tickets.map((ticket) => (
              <SupportTicketRow key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
