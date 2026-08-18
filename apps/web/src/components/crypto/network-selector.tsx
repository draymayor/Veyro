"use client";

import { ToggleGroup } from "radix-ui";
import { NetworkBadgeIcon } from "@/components/crypto/asset-icon";
import type { CryptoNetwork } from "@/lib/crypto/data";
import { cn } from "@/lib/utils";

interface NetworkSelectorProps {
  networks: CryptoNetwork[];
  value: string;
  onChange: (id: string) => void;
}

/**
 * Network badge/selector for an asset card. A single network renders as a
 * plain static badge (nothing to choose). Two or more networks render as a
 * Radix ToggleGroup, so an asset like USDT gets real single-select roving-
 * tabindex keyboard behavior between TRC20 and ERC20, never implying the
 * networks are interchangeable rather than a deliberate, exclusive choice.
 */
export function NetworkSelector({
  networks,
  value,
  onChange,
}: NetworkSelectorProps) {
  if (networks.length === 1) {
    const network = networks[0];
    return (
      <span className="bg-secondary text-ink/60 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium tracking-wide uppercase">
        <NetworkBadgeIcon iconKey={network.iconKey} className="size-3" />
        {network.label}
      </span>
    );
  }

  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => next && onChange(next)}
      aria-label="Network"
      className="border-border bg-secondary/60 flex items-center gap-0.5 rounded-full border p-0.5"
    >
      {networks.map((network) => (
        <ToggleGroup.Item
          key={network.id}
          value={network.id}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium tracking-wide uppercase transition-[background-color,color,transform] duration-200 outline-none",
            "data-[state=on]:bg-ink data-[state=on]:text-background data-[state=off]:text-ink/50 data-[state=off]:hover:text-ink data-[state=off]:scale-[0.97]",
          )}
        >
          <NetworkBadgeIcon iconKey={network.iconKey} className="size-3" />
          {network.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
