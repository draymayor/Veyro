import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { SupportChat } from "@/components/support/support-chat";

export const metadata: Metadata = {
  title: "Support",
};

// Standalone page (not nested under Settings), one continuous live chat
// thread with Veyro's admin team, no ticket/subject system in V1
// (docs/context.md, docs/database-schema.md).
export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // AppLayout already redirects unauthenticated sessions before this page
  // renders, so user should always resolve here.
  return (
    <>
      <InnerPageHeader title="Support" />
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-4 sm:px-6">
        {user ? <SupportChat userId={user.id} /> : null}
      </main>
    </>
  );
}
