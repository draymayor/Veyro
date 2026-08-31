"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";
import { SearchBar } from "./search-bar";
import { UserAvatar } from "./user-avatar";
import { useSearchQuery } from "@/hooks/use-search-query";
import { MOBILE_NAV_ITEMS } from "./nav-items";
import type { AppUser } from "./app-user";

interface TopBarProps {
  user: AppUser;
}

const MAIN_TAB_PATHS = new Set(MOBILE_NAV_ITEMS.map((item) => item.href));

/**
 * Main tab pages (Home, Leaderboard, Assets) only, per
 * docs/design-principles.md's Navigation Chrome section. Every other route
 * is an inner/drill-in page and renders its own InnerPageHeader instead,
 * so this bar never doubles up with that simpler header. The search bar
 * itself only shows on Home (docs/context.md: "replaces the wordmark on
 * this screen"); Leaderboard and Assets leave that space empty rather than
 * showing a logo/wordmark here, the desktop sidebar already carries the
 * brand mark on every page.
 */
export function TopBar({ user }: TopBarProps) {
  const pathname = usePathname();
  const [query, setQuery] = useSearchQuery();

  if (!MAIN_TAB_PATHS.has(pathname)) return null;

  return (
    <header className="bg-background sticky top-0 z-30 flex items-center gap-3 px-4 py-3 md:hidden">
      <Link href="/profile" aria-label="Profile" className="shrink-0">
        <UserAvatar user={user} size={32} />
      </Link>
      {pathname === "/home" ? (
        <SearchBar className="flex-1" value={query} onChange={setQuery} />
      ) : (
        <div className="flex-1" aria-hidden="true" />
      )}
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href="/notifications"
          aria-label="Notifications"
          className="text-ink/60"
        >
          <BellIcon className="size-6" aria-hidden="true" />
        </Link>
        <Link href="/support" aria-label="Support" className="text-ink/60">
          <ChatBubbleLeftRightIcon className="size-6" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
