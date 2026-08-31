import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

// Root-level 404, catches any unmatched route across the public,
// marketing, and app groups alike. Deliberately standalone (no
// group-specific chrome like AppShell or the marketing nav/footer) since
// a route that doesn't exist can't reliably assume which group's layout
// would have applied.
export default function NotFound() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center">
      <Image
        src="/veyro_logos/veyro-mark.png"
        alt="Veyro"
        width={48}
        height={48}
        className="mb-8 h-10 w-10"
      />
      <span className="bg-secondary text-ink/40 flex size-16 items-center justify-center rounded-full">
        <MagnifyingGlassIcon className="size-7" aria-hidden="true" />
      </span>
      <h1 className="font-heading text-ink mt-6 text-4xl font-semibold sm:text-5xl">
        404
      </h1>
      <p className="text-ink mt-2 text-lg font-medium">Page not found</p>
      <p className="text-ink/50 mt-2 max-w-sm text-sm">
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="bg-primary text-primary-foreground mt-8 rounded-full px-6 py-3 text-sm font-medium"
      >
        Back to Home
      </Link>
    </div>
  );
}
