"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authFetch } from "@/lib/api-client";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { SupportMessageBubble } from "@/components/support/support-message-bubble";
import { SupportComposer } from "@/components/support/support-composer";
import type {
  AdminSupportMessage,
  AdminSupportThreadDetail,
} from "@/lib/admin/support/types";
import type { SupportMessage } from "@/lib/support/types";

interface AdminSupportThreadProps {
  userId: string;
  initialThread: AdminSupportThreadDetail;
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
  status: "open" | "resolved";
  updated_at: string;
}

function toSupportMessage(
  row: AdminSupportMessage | SupportMessageRow,
): SupportMessage {
  return {
    id: row.id,
    userId: row.user_id,
    sender: row.sender,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

/**
 * Admin side of the one continuous support conversation per user
 * (docs/admin-guide.md, docs/database-schema.md). Reuses the exact same
 * chat bubble and composer components the consumer Support page uses, so
 * the thread reads identically on both sides. Sending a reply always goes
 * through the backend (service role), the client-side RLS insert policy
 * on support_messages only ever allows sender = 'user', so an admin
 * session has no way to write an admin-sender row directly even if it
 * tried.
 *
 * Realtime keeps this in sync in both directions: a new user message
 * appears without a refresh, and if the reopen_support_thread_on_user_message
 * trigger flips a resolved thread back to open while this page is open,
 * the status badge updates live from the same subscription, no polling.
 */
export function AdminSupportThread({
  userId,
  initialThread,
}: AdminSupportThreadProps) {
  const [status, setStatus] = useState(initialThread.status);
  const [messages, setMessages] = useState<SupportMessage[]>(
    initialThread.messages.map(toSupportMessage),
  );
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`admin-support-${userId}`)
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
          const row = payload.new as SupportThreadRow;
          setStatus(row.status);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(body: string) {
    try {
      const message = await authFetch<AdminSupportMessage>(
        `/admin/support/threads/${userId}/messages`,
        { method: "POST", body: JSON.stringify({ body }) },
      );
      setMessages((prev) =>
        prev.some((m) => m.id === message.id)
          ? prev
          : [...prev, toSupportMessage(message)],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Your reply couldn't be sent. Please try again.",
      );
    }
  }

  async function handleResolve() {
    setError(null);
    setResolving(true);
    try {
      await authFetch(`/admin/support/threads/${userId}/resolve`, {
        method: "POST",
      });
      setStatus("resolved");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not resolve this thread.",
      );
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 pb-4">
        <StatusBadge
          label={status === "resolved" ? "Resolved" : "Open"}
          tone={status === "resolved" ? "success" : "neutral"}
        />
        {status === "open" ? (
          <button
            type="button"
            onClick={handleResolve}
            disabled={resolving}
            className="text-primary text-xs font-medium hover:underline disabled:opacity-50"
          >
            {resolving ? "Resolving..." : "Mark Resolved"}
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 pb-4">
        {error ? (
          <p className="text-error text-center text-sm">{error}</p>
        ) : null}
        {messages.length === 0 ? (
          <p className="text-ink/50 text-center text-sm">No messages yet.</p>
        ) : (
          messages.map((message) => (
            <SupportMessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-border bg-card -mx-4 mt-2 rounded-b-2xl border-t sm:-mx-6">
        <SupportComposer onSend={handleSend} />
      </div>
    </div>
  );
}
