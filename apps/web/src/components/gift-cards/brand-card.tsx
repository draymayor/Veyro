import { GiftIcon } from "@heroicons/react/24/solid";
import { BrandMark } from "@/components/gift-cards/brand-mark";
import {
  COUNTRIES,
  type CardType,
  type GiftCardBrand,
} from "@/lib/gift-cards/data";

interface BrandCardProps {
  brand: GiftCardBrand;
  rate: number;
  country: string;
  countryCount: number;
  cardType: CardType;
}

// Rendered as a plain (non-navigating) card, and rate is "Coming Soon"
// rather than a real number, while Sell Gift Cards is locked platform-wide -
// the gift card API isn't integrated yet, so there's neither a real rate
// nor a working flow for this card to link into.
export function BrandCard({
  brand,
  country,
  countryCount,
  cardType,
}: BrandCardProps) {
  const countryMeta = COUNTRIES[country];

  return (
    <div
      data-flip-id={brand.id}
      className="border-border bg-card relative flex flex-col gap-4 rounded-[1.4rem] border p-5 opacity-70 shadow-[0_8px_24px_rgba(28,27,41,0.05)]"
    >
      <div className="flex items-start justify-between">
        <BrandMark brand={brand} />
        <span className="bg-secondary text-ink/60 rounded-full px-2 py-1 text-[10px] font-medium tracking-wide uppercase">
          {cardType === "e-code" ? "E-code" : "Physical"}
        </span>
      </div>

      <div>
        <h3 className="font-heading text-ink text-base font-medium">
          {brand.name}
        </h3>
        <p className="text-ink/45 mt-0.5 flex items-center gap-1 text-xs">
          {countryMeta.flag && (
            <span aria-hidden="true">{countryMeta.flag}</span>
          )}
          <span>
            {countryCount > 1
              ? `${countryMeta.label} + ${countryCount - 1} more`
              : countryMeta.label}
          </span>
        </p>
      </div>

      <div className="mt-auto flex items-end justify-between">
        <div>
          <p className="text-ink/40 text-[11px] tracking-wide uppercase">
            Rate
          </p>
          <p className="text-ink/60 text-lg font-semibold">Coming Soon</p>
        </div>
        <span className="text-ink/30 border-border flex size-8 items-center justify-center rounded-full border">
          <GiftIcon className="size-4" />
        </span>
      </div>
    </div>
  );
}
