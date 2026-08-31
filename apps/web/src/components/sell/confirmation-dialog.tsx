"use client";

import { useEffect } from "react";
import { Dialog } from "radix-ui";
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
}

/**
 * Shared post-submit confirmation for both Sell Gift Card and Sell Crypto,
 * per docs/design-principles.md's Component Consistency section: the two
 * flows are distinct routes but should still feel like one product. Closes
 * three ways, all funnelling through the same onOpenChange so the caller
 * can reset its flow back to its own empty state exactly once no matter
 * which path was used: the X button, a click outside (Radix's default
 * overlay/outside-click behavior), or a 5 second idle timeout.
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title = "Submitted for review",
  description,
}: ConfirmationDialogProps) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => onOpenChange(false), 5000);
    return () => clearTimeout(timer);
  }, [open, onOpenChange]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/30",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        />
        <Dialog.Content
          className={cn(
            "bg-background fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 text-center shadow-xl",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          )}
        >
          <Dialog.Close
            aria-label="Close"
            className="text-ink/40 hover:text-ink absolute top-4 right-4 transition-colors"
          >
            <XMarkIcon className="size-5" />
          </Dialog.Close>

          <span className="bg-success/10 text-success mx-auto flex size-12 items-center justify-center rounded-full">
            <CheckCircleIcon className="size-7" aria-hidden="true" />
          </span>

          <Dialog.Title className="font-heading text-ink mt-4 text-lg font-semibold">
            {title}
          </Dialog.Title>
          <Dialog.Description className="text-ink/60 mt-2 text-sm leading-relaxed">
            {description}
          </Dialog.Description>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
