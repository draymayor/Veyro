"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

const FOCUS_TAG_OPTIONS = [
  { value: "", label: "No preference" },
  { value: "recruit_scouts", label: "Recruiting scouts" },
  { value: "recruit_users", label: "Recruiting users" },
];

/**
 * Link submission form (Part B): URL, optional platform (free text -
 * matches the loose "post/comment on Reddit, X, etc." framing rather than
 * forcing the same fixed 10-option list from the application form), and
 * an OPTIONAL, purely-informational focus_tag that never gates payment or
 * workflow (docs/database-schema.md's Careers / Scout program section).
 */
export function ScoutLinkForm({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("");
  const [focusTag, setFocusTag] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authFetch("/scout/links", {
        method: "POST",
        body: JSON.stringify({
          url: url.trim(),
          platform: platform.trim() || undefined,
          focusTag: focusTag || undefined,
        }),
      });
      setUrl("");
      setPlatform("");
      setFocusTag("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-4"
    >
      <input
        type="url"
        required
        disabled={disabled}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Link to your post or comment"
        className="border-border bg-background focus:border-primary focus:ring-primary/30 w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-3 disabled:opacity-50"
      />
      <div className="flex gap-2">
        <input
          type="text"
          disabled={disabled}
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          placeholder="Platform (optional)"
          className="border-border bg-background focus:border-primary focus:ring-primary/30 min-w-0 flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-3 disabled:opacity-50"
        />
        <select
          disabled={disabled}
          value={focusTag}
          onChange={(e) => setFocusTag(e.target.value)}
          className="border-border bg-background text-ink/80 shrink-0 rounded-xl border px-3 py-2.5 text-sm outline-none disabled:opacity-50"
        >
          {FOCUS_TAG_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="text-error text-sm">{error}</p> : null}

      <Button type="submit" disabled={disabled || submitting} className="w-full">
        {submitting ? "Submitting..." : "Submit Link"}
      </Button>
    </form>
  );
}
