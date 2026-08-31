import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationCategory, NotificationItem } from "./data";

/**
 * Real replacement for the NOTIFICATIONS placeholder constant. Reads
 * directly via RLS ("Client can SELECT own rows",
 * docs/database-schema.md's notifications table), the backend only ever
 * inserts these rows in response to real events, never the client.
 */
export async function getNotifications(
  supabase: SupabaseClient,
  userId: string,
): Promise<NotificationItem[]> {
  const { data } = await supabase
    .from("notifications")
    .select(
      "id, category, title, body, related_trade_id, related_withdrawal_id, read_at, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id as string,
    category: row.category as NotificationCategory,
    title: row.title as string,
    body: row.body as string,
    relatedTradeId: row.related_trade_id as string | null,
    relatedWithdrawalId: row.related_withdrawal_id as string | null,
    readAt: row.read_at as string | null,
    createdAt: row.created_at as string,
  }));
}
