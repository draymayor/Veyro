"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_NAV_ITEMS, SCOUT_MOBILE_NAV_ITEM } from "./nav-items";

interface BottomNavProps {
  /** Appends the Scout tab for an approved scout only - see nav-items.ts. */
  isScout?: boolean;
}

// Core 4 tabs (docs/context.md) plus a 5th Scout tab once approved - a
// pre-approval user gets discoverability from the /home dashboard card
// (ScoutBanner) instead, since a permanent 5th slot for a page most
// visitors can't do anything with yet isn't worth the crowding.
export function BottomNav({ isScout = false }: BottomNavProps) {
  const pathname = usePathname();
  const items = isScout
    ? [...MOBILE_NAV_ITEMS, SCOUT_MOBILE_NAV_ITEM]
    : MOBILE_NAV_ITEMS;

  return (
    <nav className="bg-background fixed inset-x-0 bottom-0 z-40 flex border-t border-black/5 md:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium",
              active ? "text-primary" : "text-ink/40",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
