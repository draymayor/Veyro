"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { NetworkBadgeIcon } from "@/components/crypto/asset-icon";
import type { CryptoNetwork } from "@/lib/crypto/data";
import { cn } from "@/lib/utils";

interface NetworkFieldProps {
  networks: CryptoNetwork[];
  value: string;
  onChange: (id: string) => void;
}

/**
 * Plain dropdown-style network field (Binance/MEXC reference pattern), a
 * bordered field showing the selected network that opens a picker sheet
 * when tapped, replacing the earlier pill/ToggleGroup treatment. Always
 * rendered and always tappable, even for a single-network asset, both
 * because docs/product-rules.md rule 20 requires the network to be
 * explicitly selected, never inferred, and so the field behaves identically
 * once an asset gains a second real network (CRYPTO_ASSETS today has just
 * one network for most assets, but that's expected to grow), with no future
 * redesign needed, just a longer list inside the same sheet.
 */
export function NetworkField({ networks, value, onChange }: NetworkFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = networks.find((n) => n.id === value) ?? networks[0];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-border bg-card hover:bg-secondary/50 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
      >
        <NetworkBadgeIcon
          iconKey={selected.iconKey}
          className="size-4.5 shrink-0"
        />
        <span className="text-ink min-w-0 flex-1 truncate text-sm">
          {selected.fullName}
        </span>
        <ChevronDownIcon
          className="text-ink/40 size-4 shrink-0"
          aria-hidden="true"
        />
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/30" />
          <Dialog.Content
            className={cn(
              "bg-background fixed inset-x-0 bottom-0 z-50 rounded-t-3xl p-5 pb-8",
              "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
            )}
          >
            <div className="bg-ink/15 mx-auto mb-4 h-1.5 w-10 rounded-full" />
            <div className="mb-3 flex items-center justify-between">
              <Dialog.Title className="font-heading text-ink text-lg">
                Choose Network
              </Dialog.Title>
              <Dialog.Close
                aria-label="Close"
                className="text-ink/40 hover:text-ink transition-colors"
              >
                <XMarkIcon className="size-5" />
              </Dialog.Close>
            </div>
            <div className="flex flex-col gap-2">
              {networks.map((network) => (
                <button
                  key={network.id}
                  type="button"
                  onClick={() => {
                    onChange(network.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "border-border hover:bg-secondary/50 flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                    network.id === value && "bg-secondary/60",
                  )}
                >
                  <NetworkBadgeIcon
                    iconKey={network.iconKey}
                    className="size-5 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="text-ink block text-sm font-medium">
                      {network.label}
                    </span>
                    <span className="text-ink/45 block text-xs">
                      {network.fullName}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
