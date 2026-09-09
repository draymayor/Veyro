"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupportCategory, SupportMessage } from "@/lib/support/types";
import { SUPPORT_CATEGORIES } from "@/lib/support/categories";
import { groupMessagesByDay } from "@/lib/support/group-messages";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { SupportMessageBubble } from "@/components/support/support-message-bubble";
import { SupportDateDivider } from "@/components/support/support-date-divider";
import { SupportComposer } from "@/components/support/support-composer";

interface SupportTicketChatProps {
  ticketId: string;
  ticketOwner: { id: string; profileImageUrl: string | null };
}

interface SupportMessageRow {
  id: string;
  thread_id: string;
  user_id: string;
  sender: "user" | "admin";
  body: string;
  read_at: string | null;
  created_at: string;
}

interface SupportThreadRow {
  id: string;
  status: "open" | "resolved";
}

function toSupportMessage(row: SupportMessageRow): SupportMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    userId: row.user_id,
    sender: row.sender,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

const CATEGORY_LABEL: Record<SupportCategory, string> = Object.fromEntries(
  SUPPORT_CATEGORIES.map((option) => [option.value, option.label]),
) as Record<SupportCategory, string>;

/**
 * One ticket's conversation (docs/database-schema.md's support_threads +
 * support_messages, keyed by thread id since a user may have many
 * tickets). Behaves as a live chat, no polling anywhere. A resolved ticket
 * reopens itself server-side (the reopen_support_thread_on_user_message
 * trigger) the moment the user sends another message, so this component
 * never has to manage that transition.
 */
export function SupportTicketChat({
  ticketId,
  ticketOwner,
}: SupportTicketChatProps) {
  const [status, setStatus] = useState<"open" | "resolved" | null>(null);
  const [category, setCategory] = useState<SupportCategory | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function loadAndMarkRead() {
      const [{ data: threadRow }, { data: messageRows, error: fetchError }] =
        await Promise.all([
          supabase
            .from("support_threads")
            .select("id, category, status")
            .eq("id", ticketId)
            .maybeSingle(),
          supabase
            .from("support_messages")
            .select("*")
            .eq("thread_id", ticketId)
            .order("created_at", { ascending: true }),
        ]);

      if (cancelled) return;

      if (fetchError || !threadRow) {
        setError("Could not load this conversation. Please try again.");
        setLoaded(true);
        return;
      }

      setStatus(threadRow.status as "open" | "resolved");
      setCategory(threadRow.category as SupportCategory);

      const rows = (messageRows as SupportMessageRow[]) ?? [];
      setMessages(rows.map(toSupportMessage));
      setLoaded(true);

      const unreadAdminIds = rows
        .filter((row) => row.sender === "admin" && row.read_at === null)
        .map((row) => row.id);

      if (unreadAdminIds.length > 0) {
        await supabase
          .from("support_messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", unreadAdminIds);
      }
    }

    // Same realtime-auth-timing fix as before: resolve the session and
    // call realtime.setAuth() before .subscribe() so the join always
    // carries the real, authenticated JWT (see the original support-chat
    // implementation this was lifted from for the full rationale).
    async function subscribeToLiveUpdates() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      if (cancelled) return;

      channel = supabase
        .channel(`support-ticket-${ticketId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
            filter: `thread_id=eq.${ticketId}`,
          },
          (payload) => {
            const row = payload.new as SupportMessageRow;
            setMessages((prev) =>
              prev.some((m) => m.id === row.id)
                ? prev
                : [...prev, toSupportMessage(row)],
            );

            // The user is actively viewing this thread while it's open, so a
            // live admin reply counts as read the moment it arrives.
            if (row.sender === "admin" && row.read_at === null) {
              void supabase
                .from("support_messages")
                .update({ read_at: new Date().toISOString() })
                .eq("id", row.id);
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "support_threads",
            filter: `id=eq.${ticketId}`,
          },
          (payload) => {
            const row = payload.new as SupportThreadRow;
            setStatus(row.status);
          },
        )
        .subscribe();
    }

    void loadAndMarkRead();
    void subscribeToLiveUpdates();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(body: string) {
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("support_messages")
      .insert({
        thread_id: ticketId,
        user_id: ticketOwner.id,
        sender: "user",
        body,
      })
      .select()
      .single();

    if (insertError) {
      setError("Your message couldn't be sent. Please try again.");
      return;
    }

    const row = data as SupportMessageRow;
    setMessages((prev) =>
      prev.some((m) => m.id === row.id)
        ? prev
        : [...prev, toSupportMessage(row)],
    );
  }

  async function handleResolve() {
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("support_threads")
      .update({ status: "resolved", updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    if (updateError) {
      setError("Could not update this ticket. Please try again.");
      return;
    }

    setStatus("resolved");
  }

  if (!loaded) return null;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 pb-3">
        <p className="text-ink/40 text-xs font-medium tracking-wide uppercase">
          {category ? CATEGORY_LABEL[category] : ""}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge
            label={status === "resolved" ? "Resolved" : "Ongoing"}
            tone={status === "resolved" ? "success" : "neutral"}
          />
          {status === "open" ? (
            <button
              type="button"
              onClick={handleResolve}
              className="text-primary text-xs font-medium hover:underline"
            >
              Mark Resolved
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 pb-4">
        {error ? (
          <p className="text-error text-center text-sm">{error}</p>
        ) : null}
        {groupMessagesByDay(messages).map((group) => (
          <div key={group.dateKey} className="flex flex-col gap-3">
            <SupportDateDivider iso={group.messages[0].createdAt} />
            {group.messages.map((message) => (
              <SupportMessageBubble
                key={message.id}
                message={message}
                ticketOwner={ticketOwner}
              />
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-16 -mx-4 mt-2 sm:-mx-6 md:bottom-0">
        <SupportComposer onSend={handleSend} />
      </div>
    </div>
  );
}
