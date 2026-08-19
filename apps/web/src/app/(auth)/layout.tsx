import type { ReactNode } from "react";
import type { Metadata } from "next";

// Every page in this group is a client component, and metadata can only
// be exported from a server component, hence this thin wrapper. None of
// these pages (login, signup, password reset, OTP verification, country
// selection) should ever appear in search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
