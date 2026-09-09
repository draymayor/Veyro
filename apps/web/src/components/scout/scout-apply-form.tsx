"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/api-client";
import { SCOUT_PLATFORMS } from "@/lib/scout/platforms";
import { Button } from "@/components/ui/button";

interface PlatformFieldState {
  checked: boolean;
  handle: string;
}

/**
 * Careers Part E's exact field list: full name, at least one
 * platform+handle (checkboxes from the fixed list, plus a free-text
 * "Other"), why/posting style, and a commit-realistically question. Kept
 * genuinely minimal per the "lightweight review" design goal - no work
 * history, references, or ID upload.
 */
export function ScoutApplyForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [platforms, setPlatforms] = useState<
    Record<string, PlatformFieldState>
  >(() =>
    Object.fromEntries(
      SCOUT_PLATFORMS.map((p) => [p.key, { checked: false, handle: "" }]),
    ),
  );
  const [otherChecked, setOtherChecked] = useState(false);
  const [otherPlatform, setOtherPlatform] = useState("");
  const [otherHandle, setOtherHandle] = useState("");
  const [motivation, setMotivation] = useState("");
  const [canCommit, setCanCommit] = useState<"yes" | "no" | "explain" | null>(
    null,
  );
  const [commitmentNote, setCommitmentNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function togglePlatform(key: string) {
    setPlatforms((prev) => ({
      ...prev,
      [key]: { ...prev[key], checked: !prev[key].checked },
    }));
  }

  function setHandle(key: string, handle: string) {
    setPlatforms((prev) => ({ ...prev, [key]: { ...prev[key], handle } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const checkedPlatforms = Object.entries(platforms)
      .filter(([, v]) => v.checked)
      .map(([key, v]) => ({ platform: key, handle: v.handle.trim() }));

    if (!fullName.trim()) {
      setError("Enter your full name.");
      return;
    }
    if (
      checkedPlatforms.some((p) => !p.handle) ||
      (otherChecked && !otherHandle.trim())
    ) {
      setError("Enter a handle for every platform you checked.");
      return;
    }
    if (checkedPlatforms.length === 0 && !otherChecked) {
      setError("Select at least one platform and provide your handle.");
      return;
    }
    if (otherChecked && !otherPlatform.trim()) {
      setError("Name the other platform you're active on.");
      return;
    }
    if (!motivation.trim()) {
      setError("Tell us why you want to do this and your posting style.");
      return;
    }

    setSubmitting(true);
    try {
      await authFetch("/scout/apply", {
        method: "POST",
        body: JSON.stringify({
          fullName: fullName.trim(),
          platforms: checkedPlatforms,
          otherPlatform: otherChecked ? otherPlatform.trim() : undefined,
          otherHandle: otherChecked ? otherHandle.trim() : undefined,
          motivation: motivation.trim(),
          canCommit:
            canCommit === "yes" ? true : canCommit === "no" ? false : null,
          commitmentNote: commitmentNote.trim() || undefined,
        }),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="border-border flex flex-col items-center gap-3 rounded-2xl border border-dashed px-4 py-12 text-center">
        <p className="text-ink text-base font-semibold">Application received</p>
        <p className="text-ink/60 max-w-sm text-sm">
          We&apos;ll review it and let you know. You&apos;ll get a notification
          either way.
        </p>
        <Button size="lg" onClick={() => router.push("/home")}>
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Field label="Full name">
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your full name"
          className={INPUT_CLASS}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <p className="text-ink text-sm font-medium">
          Which platforms are you active on?
        </p>
        <p className="text-ink/50 text-xs">
          Check at least one and give us a real, non-empty profile so we can
          verify it&apos;s credible.
        </p>
        <div className="flex flex-col gap-2.5">
          {SCOUT_PLATFORMS.map((p) => (
            <label key={p.key} className="flex flex-col gap-1.5">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={platforms[p.key].checked}
                  onChange={() => togglePlatform(p.key)}
                  className="text-primary focus:ring-primary h-4 w-4 rounded border-neutral-300"
                />
                <span className="text-ink text-sm">{p.label}</span>
              </span>
              {platforms[p.key].checked ? (
                <input
                  type="text"
                  required
                  value={platforms[p.key].handle}
                  onChange={(e) => setHandle(p.key, e.target.value)}
                  placeholder={`Your ${p.label} handle or profile link`}
                  className={`${INPUT_CLASS} ml-6`}
                />
              ) : null}
            </label>
          ))}

          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={otherChecked}
                onChange={() => setOtherChecked((v) => !v)}
                className="text-primary focus:ring-primary h-4 w-4 rounded border-neutral-300"
              />
              <span className="text-ink text-sm">Other</span>
            </span>
            {otherChecked ? (
              <div className="ml-6 flex flex-col gap-2">
                <input
                  type="text"
                  required
                  value={otherPlatform}
                  onChange={(e) => setOtherPlatform(e.target.value)}
                  placeholder="Platform name"
                  className={INPUT_CLASS}
                />
                <input
                  type="text"
                  required
                  value={otherHandle}
                  onChange={(e) => setOtherHandle(e.target.value)}
                  placeholder="Your handle or profile link"
                  className={INPUT_CLASS}
                />
              </div>
            ) : null}
          </label>
        </div>
      </div>

      <Field label="Why do you want to do this? What's your posting style?">
        <textarea
          required
          rows={4}
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          placeholder="A few sentences is enough."
          className={INPUT_CLASS}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <p className="text-ink text-sm font-medium">
          Can you realistically commit to consistent, near-daily activity?
        </p>
        <div className="flex gap-2">
          {(["yes", "no"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCanCommit(option)}
              className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                canCommit === option
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-ink/70"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <textarea
          rows={2}
          value={commitmentNote}
          onChange={(e) => setCommitmentNote(e.target.value)}
          placeholder="Optional: explain briefly if you'd rather."
          className={INPUT_CLASS}
        />
      </div>

      {error ? <p className="text-error text-sm">{error}</p> : null}

      <Button type="submit" size="lg" disabled={submitting} className="w-full">
        {submitting ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
  );
}

const INPUT_CLASS =
  "border-border bg-card focus-within:border-primary focus-within:ring-primary/30 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-3";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-ink text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
