import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupportTicketListItem } from "@/components/support/support-ticket-row";

/**
 * All of the current user's support tickets (RLS "select own"), newest
 * activity first, each with its last message as a preview.
 */
export async function getSupportTickets(
  supabase: SupabaseClient,
  userId: string,
): Promise<SupportTicketListItem[]> {
  const { data: threadRows } = await supabase
    .from("support_threads")
    .select("id, category, subject, status, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  const threads = threadRows ?? [];
  if (threads.length === 0) return [];

  const ticketIds = threads.map((row) => row.id as string);

  const { data: messageRows } = await supabase
    .from("support_messages")
    .select("thread_id, body, created_at")
    .in("thread_id", ticketIds)
    .order("created_at", { ascending: false });

  const lastMessageByTicketId = new Map<
    string,
    { body: string; created_at: string }
  >();
  for (const row of messageRows ?? []) {
    const ticketId = row.thread_id as string;
    if (!lastMessageByTicketId.has(ticketId)) {
      lastMessageByTicketId.set(ticketId, {
        body: row.body as string,
        created_at: row.created_at as string,
      });
    }
  }

  return threads.map((row) => {
    const lastMessage = lastMessageByTicketId.get(row.id as string);
    return {
      id: row.id as string,
      category: row.category as SupportTicketListItem["category"],
      subject: row.subject as string,
      status: row.status as "open" | "resolved",
      lastMessageBody: lastMessage?.body ?? null,
      lastMessageAt: lastMessage?.created_at ?? null,
      updatedAt: row.updated_at as string,
    };
  });
}
