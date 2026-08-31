"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  SupportCategory,
  SupportMessage,
  SupportThread,
} from "@/lib/support/types";
import { SUPPORT_CATEGORIES } from "@/lib/support/categories";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { SupportMessageBubble } from "@/components/support/support-message-bubble";
import { SupportTicketForm } from "@/components/support/support-ticket-form";
import { SupportComposer } from "@/components/support/support-composer";

interface SupportChatProps {
  userId: string;
}

interface SupportMessageRow {
  id: string;
  user_id: string;
  sender: "user" | "admin";
  body: string;
  read_at: string | null;
  created_at: string;
}

interface SupportThreadRow {
  user_id: string;
  category: SupportCategory;
  subject: string;
  status: "open" | "resolved";
  created_at: string;
  updated_at: string;
}

function toSupportMessage(row: SupportMessageRow): SupportMessage {
  return {
    id: row.id,
    userId: row.user_id,
    sender: row.sender,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

function toSupportThread(row: SupportThreadRow): SupportThread {
  return {
    userId: row.user_id,
    category: row.category,
    subject: row.subject,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const MAX_SUBJECT_LENGTH = 80;

function subjectFromMessage(message: string): string {
  return message.length > MAX_SUBJECT_LENGTH
    ? `${message.slice(0, MAX_SUBJECT_LENGTH)}...`
    : message;
}

const CATEGORY_LABEL: Record<SupportCategory, string> = Object.fromEntries(
  SUPPORT_CATEGORIES.map((option) => [option.value, option.label]),
) as Record<SupportCategory, string>;

/**
 * One ongoing "ticket" per user (docs/context.md, docs/database-schema.md's
 * support_threads + support_messages): opens with a short issue form, then
 * behaves as a live chat, no polling anywhere. `thread === undefined` means
 * still loading, `thread === null` means no ticket exists yet (show the
 * form), and a resolved thread reopens itself server-side (the
 * reopen_support_thread_on_user_message trigger) the moment the user sends
 * another message, so this component never has to manage that transition.
 */
export function SupportChat({ userId }: SupportChatProps) {
  const [thread, setThread] = useState<SupportThread | null | undefined>(
    undefined,
  );
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function loadAndMarkRead() {
      const [{ data: threadRow }, { data: messageRows, error: fetchError }] =
        await Promise.all([
          supabase
            .from("support_threads")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("support_messages")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: true }),
        ]);

      if (cancelled) return;

      if (fetchError) {
        setError("Could not load your conversation. Please try again.");
        setThread(null);
        return;
      }

      setThread(
        threadRow ? toSupportThread(threadRow as SupportThreadRow) : null,
      );

      const rows = (messageRows as SupportMessageRow[]) ?? [];
      setMessages(rows.map(toSupportMessage));

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

    void loadAndMarkRead();

    const channel = supabase
      .channel(`support-messages-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `user_id=eq.${userId}`,
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
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setThread(toSupportThread(payload.new as SupportThreadRow));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function openTicket(category: SupportCategory, message: string) {
    const supabase = createClient();

    const { data: threadRow, error: threadError } = await supabase
      .from("support_threads")
      .insert({
        user_id: userId,
        category,
        subject: subjectFromMessage(message),
      })
      .select()
      .single();

    if (threadError) throw threadError;

    const { data: messageRow, error: messageError } = await supabase
      .from("support_messages")
      .insert({ user_id: userId, sender: "user", body: message })
      .select()
      .single();

    if (messageError) throw messageError;

    setThread(toSupportThread(threadRow as SupportThreadRow));
    setMessages([toSupportMessage(messageRow as SupportMessageRow)]);
  }

  async function handleSend(body: string) {
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("support_messages")
      .insert({ user_id: userId, sender: "user", body })
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
      .eq("user_id", userId);

    if (updateError) {
      setError("Could not update this ticket. Please try again.");
      return;
    }

    setThread((prev) => (prev ? { ...prev, status: "resolved" } : prev));
  }

  if (thread === undefined) return null;

  if (thread === null) {
    return <SupportTicketForm onSubmit={openTicket} />;
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 pb-4">
        <div>
          <p className="text-ink text-sm font-medium">
            {CATEGORY_LABEL[thread.category]}
          </p>
          <p className="text-ink/45 mt-0.5 text-xs">{thread.subject}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge
            label={thread.status === "resolved" ? "Resolved" : "Open"}
            tone={thread.status === "resolved" ? "success" : "neutral"}
          />
          {thread.status === "open" ? (
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
        {messages.map((message) => (
          <SupportMessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-16 -mx-4 mt-2 sm:-mx-6 md:bottom-0">
        <SupportComposer onSend={handleSend} />
      </div>
    </div>
  );
}
