"use client";

import { useMemo, useState } from "react";
import { Popover } from "radix-ui";
import { Check, ChevronDown, Search } from "lucide-react";
import { COUNTRIES, findCountry } from "@/lib/countries";
import { cn } from "@/lib/utils";

interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  placeholder?: string;
}

export function CountrySelect({
  value,
  onChange,
  id,
  placeholder = "Select your country",
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = value ? findCountry(value) : undefined;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  function handleSelect(code: string) {
    onChange(code);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <Popover.Trigger asChild>
        <button
          id={id}
          type="button"
          className="focus:border-primary focus:ring-primary flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 text-left text-sm text-neutral-900 focus:ring-1 focus:outline-none"
        >
          <span className={cn(!selected && "text-neutral-400")}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-neutral-400" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[var(--radix-popover-trigger-width)] rounded-lg border border-neutral-200 bg-white shadow-lg"
        >
          <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2.5">
            <Search className="size-4 shrink-0 text-neutral-400" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries..."
              className="w-full text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-neutral-400">
                No countries match your search.
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelect(c.code)}
                  className="hover:bg-secondary flex w-full items-center justify-between px-4 py-2 text-left text-sm text-neutral-900"
                >
                  {c.name}
                  {value === c.code && (
                    <Check className="text-primary size-4 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
