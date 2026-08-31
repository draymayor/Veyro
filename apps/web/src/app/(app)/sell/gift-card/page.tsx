import type { Metadata } from "next";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { GiftCardBrandList } from "@/components/sell/gift-card/brand-list";

export const metadata: Metadata = {
  title: "Sell Gift Cards",
};

export default function SellGiftCardPage() {
  return (
    <>
      <InnerPageHeader title="Sell Gift Cards" backHref="/home" />
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-16 sm:px-6">
        <GiftCardBrandList />
      </main>
    </>
  );
}
