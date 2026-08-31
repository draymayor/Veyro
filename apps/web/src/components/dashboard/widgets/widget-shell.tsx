import Link from "next/link";
import type { ReactNode } from "react";

interface WidgetShellProps {
  title: string;
  href: string;
  linkLabel?: string;
  children: ReactNode;
}

/**
 * Shared frame for the right column's preview widgets, so Referrals,
 * Notifications, and Recent Activity read as one lightweight family
 * instead of three differently-built mini pages.
 */
export function WidgetShell({
  title,
  href,
  linkLabel = "View all",
  children,
}: WidgetShellProps) {
  return (
    <div className="bg-card border-border rounded-2xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-ink text-sm font-medium">{title}</h3>
        <Link
          href={href}
          className="text-primary text-xs font-medium hover:underline"
        >
          {linkLabel}
        </Link>
      </div>
      {children}
    </div>
  );
}
