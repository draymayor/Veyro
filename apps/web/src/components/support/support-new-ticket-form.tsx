"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SupportTicketForm } from "@/components/support/support-ticket-form";
import type { SupportCategory } from "@/lib/support/types";

const MAX_SUBJECT_LENGTH = 80;

function subjectFromMessage(message: string): string {
  return message.length > MAX_SUBJECT_LENGTH
    ? `${message.slice(0, MAX_SUBJECT_LENGTH)}...`
    : message;
}

interface SupportNewTicketFormProps {
  userId: string;
}

/**
 * Opens a new ticket: inserts the support_threads row (its id comes back
 * from the DB default) then the first support_messages row against that
 * thread, then lands the user on the new ticket's conversation.
 */
export function SupportNewTicketForm({ userId }: SupportNewTicketFormProps) {
  const router = useRouter();

  async function handleSubmit(category: SupportCategory, message: string) {
    const supabase = createClient();

    const { data: threadRow, error: threadError } = await supabase
      .from("support_threads")
      .insert({
        user_id: userId,
        category,
        subject: subjectFromMessage(message),
      })
      .select("id")
      .single();

    if (threadError || !threadRow)
      throw threadError ?? new Error("Failed to open ticket");

    const { error: messageError } = await supabase
      .from("support_messages")
      .insert({
        thread_id: threadRow.id as string,
        user_id: userId,
        sender: "user",
        body: message,
      });

    if (messageError) throw messageError;

    // replace, not push: the completed form shouldn't linger in back
    // history - back from the new ticket should return to the list, not
    // this now-submitted form.
    router.replace(`/support/${threadRow.id as string}`);
  }

  return <SupportTicketForm onSubmit={handleSubmit} />;
}
