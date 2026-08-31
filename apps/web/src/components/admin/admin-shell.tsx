import type { ReactNode } from "react";
import Link from "next/link";
import { AdminNav } from "./admin-nav";
import { AdminMobileNav } from "./admin-mobile-nav";

/**
 * Internal admin tool shell, deliberately distinct from AppShell (the
 * public-facing brand experience): a plain bordered sidebar using the same
 * design tokens as the rest of the app for consistency, but no marketing
 * polish, no terracotta brand sidebar, functional only. Mobile uses a
 * hamburger menu (AdminMobileNav) revealing the same route list as the
 * desktop sidebar, not the consumer app's bottom-nav pattern, per
 * design-principles.md's Navigation Chrome section (bottom nav is scoped
 * to the 3 consumer main-tab pages only).
 */
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen">
      <aside className="border-border bg-card sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-8 border-r px-4 py-6 md:flex">
        <Link
          href="/admin/dashboard"
          className="font-heading text-ink px-3 text-base font-semibold"
        >
          Veyro Admin
        </Link>
        <AdminNav />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-border bg-card flex items-center gap-2 border-b px-4 py-3 md:hidden">
          <AdminMobileNav />
          <Link
            href="/admin/dashboard"
            className="font-heading text-ink block text-base font-semibold"
          >
            Veyro Admin
          </Link>
        </header>

        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
