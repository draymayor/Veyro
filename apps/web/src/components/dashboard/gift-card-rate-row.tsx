import Image from "next/image";
import {
  COUNTRIES,
  defaultBrandRate,
  type GiftCardBrand,
} from "@/lib/gift-cards/data";
import { formatNgn } from "@/lib/dashboard/placeholder-data";

interface GiftCardRateRowProps {
  brand: GiftCardBrand;
}

export function GiftCardRateRow({ brand }: GiftCardRateRowProps) {
  const best = defaultBrandRate(brand);

  return (
    // Home's Gift Cards tab is a live rate ticker only (docs/context.md) -
    // no navigation on tap here, unlike the real Sell Gift Card flow which
    // uses its own separate brand picker.
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-2xl px-4 py-4 sm:px-5">
      <span className="flex min-w-0 items-center gap-3">
        <span className="bg-secondary relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
          {brand.logo ? (
            <Image src={brand.logo} alt="" width={18} height={18} />
          ) : (
            <span
              className="flex size-full items-center justify-center text-xs font-semibold"
              style={{
                background: brand.monogram.bg,
                color: brand.monogram.fg,
              }}
            >
              {brand.monogram.letter}
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="text-ink block text-sm font-medium">
            {brand.name}
          </span>
          <span className="text-ink/40 block text-xs tracking-wide uppercase">
            {best?.cardType === "physical" ? "Physical" : "E-code"}
          </span>
        </span>
      </span>

      <span className="text-ink justify-self-end text-right text-sm font-medium tabular-nums">
        {formatNgn(best?.rate ?? 0)}
      </span>

      <span className="text-ink/40 min-w-16 justify-self-end text-right text-xs">
        {best &&
          (COUNTRIES[best.country]?.flag ||
            COUNTRIES[best.country]?.label ||
            best.country)}
      </span>
    </div>
  );
}
