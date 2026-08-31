"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";

interface InnerPageHeaderProps {
  title: string;
  /**
   * Where the back arrow goes. Defaults to browser history (router.back()),
   * which covers every inner page since each one can be reached from more
   * than one place (a sidebar link, a Home widget, a card tap). Pass a
   * fixed href only when a page needs a guaranteed destination regardless
   * of how the user arrived (e.g. a deep link with no history to fall back on).
   */
  backHref?: string;
}

/**
 * Shared header for every inner/drill-in page (Sell Gift Card, Sell
 * Crypto, Referrals, Notifications, Settings, Support, Profile, and any
 * sub-pages within them), per docs/design-principles.md's Navigation
 * Chrome section. Replaces the main-tab TopBar (search + notification +
 * support icons) on these routes entirely, it never appears alongside it.
 * Renders on both mobile and desktop for the center content area; the
 * desktop sidebar is separate chrome and stays untouched by this.
 *
 * A three-column grid (not flex) keeps the title truly centered in the
 * row regardless of the back control's width, rather than just centered
 * in the remaining space next to it.
 */
export function InnerPageHeader({ title, backHref }: InnerPageHeaderProps) {
  return (
    <header className="bg-background sticky top-0 z-30 grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4 sm:px-6">
      <div className="justify-self-start">
        <BackControl backHref={backHref} />
      </div>
      <h1 className="font-heading text-ink truncate text-center text-base font-semibold sm:text-lg">
        {title}
      </h1>
      <div aria-hidden="true" />
    </header>
  );
}

function BackControl({ backHref }: { backHref?: string }) {
  const router = useRouter();

  if (backHref) {
    return (
      <Link href={backHref} aria-label="Back" className="text-ink block">
        <ArrowLeftIcon className="size-5" aria-hidden="true" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Back"
      className="text-ink block"
    >
      <ArrowLeftIcon className="size-5" aria-hidden="true" />
    </button>
  );
}
