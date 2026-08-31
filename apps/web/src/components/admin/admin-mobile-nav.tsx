"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_ITEMS } from "./admin-nav-items";

function isActive(pathname: string, href: string): boolean {
  return href === "/admin/dashboard"
    ? pathname === href
    : pathname.startsWith(href);
}

/**
 * Mobile nav for admin pages: a hamburger trigger that reveals the same
 * route list as the desktop sidebar (AdminNav/ADMIN_NAV_ITEMS), per
 * docs/context.md's admin routing. Deliberately not the consumer app's
 * bottom-nav pattern (design-principles.md scopes that to the 3 mobile
 * bottom-nav destinations on the consumer side only). Admin has 8 routes,
 * far more than a bottom nav can hold, so a full-screen drawer is used
 * instead.
 */
export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Open admin navigation"
          className="text-ink flex size-9 shrink-0 items-center justify-center rounded-lg"
        >
          <Bars3Icon className="size-5.5" aria-hidden="true" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content className="bg-background data-[state=open]:animate-in data-[state=open]:slide-in-from-left-4 data-[state=open]:fade-in-0 fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col gap-6 px-4 py-6 shadow-xl">
          <div className="flex items-center justify-between px-3">
            <Dialog.Title className="font-heading text-ink text-base font-semibold">
              Veyro Admin
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close admin navigation"
              className="text-ink/60 hover:text-ink flex size-8 items-center justify-center rounded-lg"
            >
              <XMarkIcon className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <nav className="flex flex-col gap-1">
            {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-ink/60 hover:bg-secondary hover:text-ink",
                  )}
                >
                  <Icon className="size-4.5 shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
