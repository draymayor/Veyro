import type { ReactNode } from "react";
import { SidebarNav } from "./sidebar-nav";
import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="flex-1 pb-16 md:pb-0">{children}</div>
        <BottomNav />
      </div>
    </div>
  );
}
