import type { ReactNode } from "react";
import { SidebarNav } from "./sidebar-nav";
import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";
import type { AppUser } from "./app-user";

interface AppShellProps {
  children: ReactNode;
  user: AppUser;
  /** Scout nav item only shows for an approved scout_applications row. */
  isScout?: boolean;
}

export function AppShell({ children, user, isScout = false }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <SidebarNav user={user} isScout={isScout} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} />
        <div className="flex-1 pb-16 md:pb-0">{children}</div>
        <BottomNav isScout={isScout} />
      </div>
    </div>
  );
}
