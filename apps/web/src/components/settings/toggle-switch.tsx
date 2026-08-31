"use client";

import { Switch } from "radix-ui";
import { cn } from "@/lib/utils";

interface ToggleSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

/** The one on/off control every Settings toggle (2FA, notification categories) renders through. */
export function ToggleSwitch({
  checked,
  onCheckedChange,
  label,
  disabled,
}: ToggleSwitchProps) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "focus-visible:ring-ring/50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-secondary relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      <Switch.Thumb className="bg-background block size-4.5 translate-x-1 rounded-full shadow-sm transition-transform data-[state=checked]:translate-x-5" />
    </Switch.Root>
  );
}
