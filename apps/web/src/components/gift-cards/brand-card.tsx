import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "@/components/gift-cards/brand-mark";
import { COUNTRIES, type CardType, type GiftCardBrand } from "@/lib/gift-cards/data";

interface BrandCardProps {
  brand: GiftCardBrand;
  rate: number;
  country: string;
  countryCount: number;
  cardType: CardType;
}

export function BrandCard({
  brand,
  rate,
  country,
  countryCount,
  cardType,
}: BrandCardProps) {
  const countryMeta = COUNTRIES[country];

  return (
    <Link
      href={`/sell?brand=${brand.id}`}
      data-flip-id={brand.id}
      className="group border-border bg-card hover:border-primary/40 relative flex flex-col gap-4 rounded-[1.4rem] border p-5 shadow-[0_8px_24px_rgba(28,27,41,0.05)] transition-[border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(28,27,41,0.1)]"
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
          {countryMeta.flag && <span aria-hidden="true">{countryMeta.flag}</span>}
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
            Up to
          </p>
          <p className="font-heading text-primary text-xl font-semibold tabular-nums">
            &#8358;{rate.toLocaleString()}{" "}
            <span className="text-ink/40 text-sm font-normal">/ $1</span>
          </p>
        </div>
        <span className="text-ink/30 group-hover:text-primary group-hover:border-primary/40 flex size-8 items-center justify-center rounded-full border border-border transition-colors duration-300">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}
