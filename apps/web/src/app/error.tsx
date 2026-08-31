"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Root-level error boundary, catches any unhandled render/render-time
// error in a route segment below this one. Standalone by design, same
// reasoning as not-found.tsx: an error boundary can't assume the group
// layout it's replacing rendered cleanly enough to build on.
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center">
      <Image
        src="/veyro_logos/veyro-mark.png"
        alt="Veyro"
        width={48}
        height={48}
        className="mb-8 h-10 w-10"
      />
      <span className="bg-destructive/10 text-destructive flex size-16 items-center justify-center rounded-full">
        <ExclamationTriangleIcon className="size-7" aria-hidden="true" />
      </span>
      <h1 className="font-heading text-ink mt-6 text-2xl font-semibold sm:text-3xl">
        Something went wrong
      </h1>
      <p className="text-ink/50 mt-2 max-w-sm text-sm">
        Something went wrong on our end. Please try again.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-primary text-primary-foreground rounded-full px-6 py-3 text-sm font-medium"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="text-ink/60 hover:text-ink rounded-full px-6 py-3 text-sm font-medium"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
