"use client";

import Link from "next/link";
import { Dialog } from "radix-ui";
import { LockClosedIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface LockedBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
}

/**
 * Shown instead of the inline error text when a withdrawal is blocked by a
 * bonus withdrawal lock (withdrawals.service.ts's "Part of your ... balance
 * is locked" error) - the user's next action is almost always to go deposit,
 * so this surfaces "Deposit Now" directly rather than leaving them to find
 * the deposit page themselves.
 */
export function LockedBalanceDialog({
  open,
  onOpenChange,
  message,
}: LockedBalanceDialogProps) {
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

          <span className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-full">
            <LockClosedIcon className="size-6" aria-hidden="true" />
          </span>

          <Dialog.Title className="font-heading text-ink mt-4 text-lg font-semibold">
            Balance locked
          </Dialog.Title>
          <Dialog.Description className="text-ink/60 mt-2 text-sm leading-relaxed">
            {message}
          </Dialog.Description>

          <Button asChild size="lg" className="mt-6 w-full">
            <Link href="/deposit/crypto" onClick={() => onOpenChange(false)}>
              Deposit Now
            </Link>
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
