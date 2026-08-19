import { redirect } from "next/navigation";
import type { Metadata } from "next";

// Not part of the current public site structure (see docs/context.md);
// this route only exists to redirect stray links to /crypto.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SellCryptoPage() {
  redirect("/crypto");
}
