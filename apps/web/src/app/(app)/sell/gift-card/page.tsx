import type { Metadata } from "next";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { GiftCardLocked } from "@/components/sell/gift-card/locked-notice";

export const metadata: Metadata = {
  title: "Sell Gift Cards",
};

// Locked: the gift card API isn't integrated yet, so this renders the
// locked notice instead of the real brand picker until that's wired up.
export default function SellGiftCardPage() {
  return (
    <>
      <InnerPageHeader title="Sell Gift Cards" backHref="/home" />
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-16 sm:px-6">
        <GiftCardLocked />
      </main>
    </>
  );
}
