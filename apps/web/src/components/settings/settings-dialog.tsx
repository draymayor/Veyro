"use client";

import type { ReactNode } from "react";
import { Dialog } from "radix-ui";
import { XMarkIcon } from "@heroicons/react/24/solid";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}

/**
 * Shared centered-dialog shell for Settings' edit forms (payment method
 * details), matching the Important Network Notice pattern from the
 * crypto sell flow. Kept separate from ChangePasswordDialog's own shell
 * since that one has a distinct success-state layout.
 */
export function SettingsDialog({
  open,
  onOpenChange,
  title,
  children,
}: SettingsDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content className="bg-background data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="font-heading text-ink text-lg font-semibold">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="text-ink/40 hover:text-ink transition-colors"
            >
              <XMarkIcon className="size-5" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const SETTINGS_FIELD_CLASS =
  "border-border bg-card focus:border-primary focus:ring-primary/30 text-ink placeholder:text-ink/35 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-3";

export function SettingsField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-ink text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
