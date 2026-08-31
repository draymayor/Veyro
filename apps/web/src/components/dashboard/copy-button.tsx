"use client";

import { useState } from "react";
import { ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

/** Copies `value` to the clipboard and briefly confirms with a checkmark. */
export function CopyButton({
  value,
  label = "Copy",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : label}
      className={cn(
        "text-ink/50 hover:bg-secondary hover:text-ink flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
        className,
      )}
    >
      {copied ? (
        <CheckIcon className="text-success size-3.5" aria-hidden="true" />
      ) : (
        <ClipboardDocumentIcon className="size-3.5" aria-hidden="true" />
      )}
    </button>
  );
}
