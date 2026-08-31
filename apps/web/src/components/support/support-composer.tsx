"use client";

import { useState } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";

interface SupportComposerProps {
  onSend: (body: string) => Promise<void>;
}

/**
 * Text input plus send button pinned to the bottom of the thread. Keeps its
 * own draft/sending state so SupportChat only has to care about the
 * committed message once onSend resolves.
 */
export function SupportComposer({ onSend }: SupportComposerProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setDraft("");
    try {
      await onSend(body);
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSend();
      }}
      className="border-border bg-background flex items-end gap-2 border-t px-4 py-3 sm:px-6"
    >
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
          }
        }}
        placeholder="Type a message..."
        rows={1}
        className="text-ink placeholder:text-ink/40 max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm outline-none"
      />
      <button
        type="submit"
        disabled={!draft.trim() || sending}
        aria-label="Send message"
        className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-40"
      >
        <PaperAirplaneIcon className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}
