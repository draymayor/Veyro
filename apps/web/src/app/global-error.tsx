"use client";

import { useEffect } from "react";

interface GlobalErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Only fires if the root layout itself throws, in which case Next.js
// requires this to render its own <html>/<body> since RootLayout never
// gets a chance to. Inline styles rather than Tailwind classes or the
// brand fonts, since neither is guaranteed to be available if the layout
// that would normally set them up is exactly what failed.
export default function GlobalErrorPage({
  error,
  reset,
}: GlobalErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "1rem",
          textAlign: "center",
          backgroundColor: "#faf7f2",
          color: "#1c1b29",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
          Something went wrong
        </h1>
        <p
          style={{
            maxWidth: "24rem",
            fontSize: "0.875rem",
            color: "#6b6875",
            margin: 0,
          }}
        >
          Something went wrong on our end. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "1.5rem",
            borderRadius: "9999px",
            padding: "0.75rem 1.5rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#faf7f2",
            backgroundColor: "#e8674a",
            border: "none",
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
