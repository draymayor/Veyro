import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sell Gift Card",
};

// Locked: the gift card API isn't integrated yet. Redirects straight to
// /sell/gift-card (which renders GiftCardLocked) rather than rendering the
// real sell form, so a direct/bookmarked link to a specific brand+country
// can't reach it either.
export default function GiftCardSubcategoryPage() {
  redirect("/sell/gift-card");
}
