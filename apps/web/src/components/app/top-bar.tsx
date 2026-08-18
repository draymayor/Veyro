import Link from "next/link";
import { UserRound, Bell } from "lucide-react";

export function TopBar() {
  return (
    <header className="bg-background sticky top-0 z-30 flex items-center justify-between border-b border-black/5 px-4 py-3 md:hidden">
      <Link href="/settings" aria-label="Profile" className="text-ink/70">
        <UserRound size={22} strokeWidth={1.75} />
      </Link>
      <span className="font-heading text-ink text-base">Veyro</span>
      <Link href="/notifications" aria-label="Notifications" className="text-ink/70">
        <Bell size={22} strokeWidth={1.75} />
      </Link>
    </header>
  );
}
