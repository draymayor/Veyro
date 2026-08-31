import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { BrandMark } from "@/components/gift-cards/brand-mark";
import { GiftCardSellForm } from "@/components/sell/gift-card/sell-form";
import {
  COUNTRIES,
  GIFT_CARD_BRANDS,
  ratesForBrandCountry,
} from "@/lib/gift-cards/data";

interface PageProps {
  params: Promise<{ brand: string; country: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { brand: brandId } = await params;
  const brand = GIFT_CARD_BRANDS.find((b) => b.id === brandId);
  return { title: brand ? `Sell ${brand.name}` : "Sell Gift Card" };
}

export default async function GiftCardSubcategoryPage({ params }: PageProps) {
  const { brand: brandId, country } = await params;

  const brand = GIFT_CARD_BRANDS.find((b) => b.id === brandId);
  if (!brand) notFound();

  const rates = ratesForBrandCountry(brandId, country);
  if (rates.length === 0) notFound();

  const physicalRate = rates.find((r) => r.cardType === "physical") ?? null;
  const ecodeRate = rates.find((r) => r.cardType === "e-code") ?? null;
  const countryMeta = COUNTRIES[country];

  return (
    <>
      <InnerPageHeader title={brand.name} backHref="/sell/gift-card" />
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-16 sm:px-6">
        <div className="mb-8 flex items-center gap-4">
          <BrandMark brand={brand} className="size-12 shrink-0" />
          <div>
            <h2 className="font-heading text-ink text-xl font-semibold tracking-tight sm:text-2xl">
              {brand.name}
            </h2>
            <p className="text-ink/50 mt-0.5 flex items-center gap-1.5 text-sm">
              {countryMeta?.flag && (
                <span aria-hidden="true">{countryMeta.flag}</span>
              )}
              {countryMeta?.label ?? country}
            </p>
          </div>
        </div>

        <GiftCardSellForm
          physicalRate={physicalRate}
          ecodeRate={ecodeRate}
          defaultType={brand.defaultType}
        />
      </main>
    </>
  );
}
