"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DESKTOP_NAV_ITEMS } from "./nav-items";
import { UserAvatar } from "./user-avatar";
import type { AppUser } from "./app-user";

interface SidebarNavProps {
  user: AppUser;
}

/**
 * Desktop-only app chrome. Uses the same dark ink background as the public
 * site's footer bar, so the sidebar and footer read as one consistent dark
 * surface across the product.
 */
export function SidebarNav({ user }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside className="bg-ink sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between px-4 py-6 md:flex">
      <div className="flex flex-col gap-8">
        <Link href="/home" className="flex items-center gap-2 px-2">
          <Image
            src="/veyro_logos/veyro-mark.png"
            alt=""
            width={28}
            height={28}
            className="rounded-md"
          />
          <span className="font-heading text-background text-lg">Veyro</span>
        </Link>

        <nav className="flex flex-col gap-1">
          {DESKTOP_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={label}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-background text-primary"
                    : "text-background/70 hover:bg-background/10 hover:text-background",
                )}
              >
                <Icon
                  className={cn(
                    "size-5",
                    active ? "text-primary" : "text-background/50",
                  )}
                  aria-hidden="true"
                />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <Link
        href="/profile"
        className="bg-background/10 hover:bg-background/15 flex items-center gap-3 rounded-xl px-3 py-3 transition-colors"
      >
        <UserAvatar user={user} size={36} />
        <div className="min-w-0">
          <p className="text-background truncate text-sm font-medium">
            {user.fullName ?? "Your account"}
          </p>
          <p className="text-background/60 truncate text-xs">{user.email}</p>
        </div>
      </Link>
    </aside>
  );
}
