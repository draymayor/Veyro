"use client";

import { useState, type FormEvent } from "react";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";
import {
  SettingsField,
  SETTINGS_FIELD_CLASS,
} from "@/components/settings/settings-dialog";
import { Button } from "@/components/ui/button";
import { SUPPORT_CATEGORIES } from "@/lib/support/categories";
import { cn } from "@/lib/utils";
import type { SupportCategory } from "@/lib/support/types";

interface SupportTicketFormProps {
  onSubmit: (category: SupportCategory, message: string) => Promise<void>;
}

/**
 * First-visit state for the Support thread: a calm welcome (copy in
 * docs/ui-copy.md's Empty States section) plus a short "describe your
 * issue" form, rather than dropping the user straight into a blank chat
 * window. Submitting this is what opens the ticket (creates the
 * support_threads row) and sends the first message in one step.
 */
export function SupportTicketForm({ onSubmit }: SupportTicketFormProps) {
  const [category, setCategory] = useState<SupportCategory | "">("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!category || !message.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(category, message.trim());
    } catch {
      setError("Something went wrong on our end. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 px-2 py-10 text-center">
      <span className="bg-secondary text-primary flex size-14 items-center justify-center rounded-full">
        <ChatBubbleLeftRightIcon className="size-6" aria-hidden="true" />
      </span>
      <div className="max-w-xs">
        <p className="text-ink font-heading text-base font-medium">
          How can we help?
        </p>
        <p className="text-ink/50 mt-1.5 text-sm">
          Have a question? Send us a message and our team will get back to you.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-4 flex w-full max-w-sm flex-col gap-4 text-left"
      >
        <SettingsField label="What's this about?">
          <select
            required
            value={category}
            onChange={(e) => setCategory(e.target.value as SupportCategory)}
            className={SETTINGS_FIELD_CLASS}
          >
            <option value="" disabled>
              Select a topic
            </option>
            {SUPPORT_CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </SettingsField>

        <SettingsField label="Message">
          <textarea
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what's going on..."
            className={cn(SETTINGS_FIELD_CLASS, "resize-none")}
          />
        </SettingsField>

        {error ? <p className="text-error text-sm">{error}</p> : null}

        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="w-full"
        >
          {submitting ? "Sending..." : "Send Message"}
        </Button>
      </form>
    </div>
  );
}
