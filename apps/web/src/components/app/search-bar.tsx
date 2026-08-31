"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Replaces the Veyro wordmark on Home, since the sidebar (desktop) or
 * profile/support icons (mobile) already carry the brand on this screen.
 * Controlled input; the query lives in the URL (see useSearchQuery) so the
 * mobile top-bar instance and the desktop RatesSection instance share it.
 */
export function SearchBar({ className, value, onChange }: SearchBarProps) {
  return (
    <label
      className={cn(
        "border-border bg-card focus-within:ring-ring/40 flex h-10 items-center gap-2 rounded-full border px-4 transition-shadow focus-within:ring-3",
        className,
      )}
    >
      <MagnifyingGlassIcon
        className="text-ink/35 size-4 shrink-0"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search assets, brands, or trades"
        className="text-ink placeholder:text-ink/35 w-full bg-transparent text-sm outline-none"
      />
    </label>
  );
}
