"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { DESKTOP_NAV_ITEMS } from "./nav-items";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="bg-background sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between border-r border-black/5 px-4 py-6 md:flex">
      <div className="flex flex-col gap-6">
        <span className="font-heading text-ink px-2 text-lg">Veyro</span>

        <nav className="flex flex-col gap-1">
          {DESKTOP_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-ink/70 hover:bg-black/5",
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3 px-2">
        <Link
          href="/notifications"
          aria-label="Notifications"
          className="text-ink/70 hover:text-ink"
        >
          <Bell size={20} strokeWidth={1.75} />
        </Link>
        <Link
          href="/settings"
          aria-label="Profile"
          className="text-ink/70 hover:text-ink"
        >
          <UserRound size={20} strokeWidth={1.75} />
        </Link>
      </div>
    </aside>
  );
}
