import Link from "next/link";
import { MegaphoneIcon, ArrowRightCircleIcon } from "@heroicons/react/24/solid";

/**
 * Mobile discoverability entry point into /scout for a non-scout user
 * (Scout has no bottom-nav slot - see bottom-nav.tsx). Desktop doesn't need
 * this since Scout is always in SidebarNav; this only renders where that
 * sidebar is hidden (md:hidden), so there's no duplicate CTA on desktop.
 */
export function ScoutBanner() {
  return (
    <Link
      href="/scout"
      className="border-border bg-card hover:bg-secondary/50 group flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 transition-colors sm:px-5 md:hidden"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-full">
          <MegaphoneIcon className="text-primary size-4.5" aria-hidden="true" />
        </span>
        <span className="text-ink min-w-0 truncate text-sm font-medium sm:text-base">
          Earn extra income as a Scout
        </span>
      </span>

      <ArrowRightCircleIcon
        className="text-ink/40 group-hover:text-ink/70 size-5 shrink-0 transition-colors sm:size-6"
        aria-hidden="true"
      />
    </Link>
  );
}
