"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MOBILE_NAV_ITEMS, SCOUT_NAV_ITEM } from "./nav-items";

export function BottomNav({ isScout = false }: { isScout?: boolean }) {
  const pathname = usePathname();
  const items = isScout
    ? [...MOBILE_NAV_ITEMS, SCOUT_NAV_ITEM]
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
