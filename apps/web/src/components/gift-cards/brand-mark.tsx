import Image from "next/image";
import { cn } from "@/lib/utils";
import type { GiftCardBrand } from "@/lib/gift-cards/data";

interface BrandMarkProps {
  brand: GiftCardBrand;
  className?: string;
}

/**
 * Circular brand badge: an icon-only mark framed in a plain circle, no
 * wordmarks. Falls back to a colored monogram circle for brands without a
 * sourced icon-only asset yet (Sephora).
 */
export function BrandMark({ brand, className }: BrandMarkProps) {
  if (brand.logo) {
    return (
      <span
        className={cn(
          "relative flex size-11 items-center justify-center rounded-full bg-black/[0.04] p-2.5",
          className,
        )}
      >
        <Image
          src={brand.logo}
          alt=""
          aria-hidden="true"
          fill
          className="object-contain p-2.5"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "font-heading relative flex size-11 items-center justify-center rounded-full text-lg font-semibold",
        className,
      )}
      style={{ backgroundColor: brand.monogram.bg, color: brand.monogram.fg }}
      aria-hidden="true"
    >
      {brand.monogram.letter}
    </span>
  );
}
