import type { Metadata } from "next";

// This page is not part of Veyro's current public site structure (see
// docs/context.md, which explicitly drops a standalone /about page from
// scope) and is kept out of search results until it is either built out
// or removed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AboutPage() {
  return (
    <main>
      <h1 className="font-heading">About</h1>
    </main>
  );
}
