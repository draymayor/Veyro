import type { Metadata } from "next";
import { WelcomeSplash } from "@/components/auth/welcome-splash";

// Transient, one-time-per-session brand moment between a successful sign
// in/sign up and /home (see POST_AUTH_ENTRY_PATH); never worth indexing.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function WelcomePage() {
  return <WelcomeSplash />;
}
