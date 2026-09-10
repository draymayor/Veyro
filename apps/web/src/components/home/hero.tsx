"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OrbitRings } from "@/components/home/orbit-rings";
import { AssetIcon } from "@/components/crypto/asset-icon";
import type { TokenIconKey } from "@/lib/crypto/data";
import { cn } from "@/lib/utils";

// Positioned in the upper portion of the hero only (behind the headline,
// roughly where the sticky Nav sits above them) - the radial-gradient
// overlay painted after them fades everything out well before the section
// bottom, so they never bleed into CryptoCarousel's "Hold your crypto"
// section right below.
const FLOATING_ASSETS: { iconKey: TokenIconKey; className: string }[] = [
  { iconKey: "BTC", className: "top-[6%] left-[10%] size-14" },
  { iconKey: "ETH", className: "top-[4%] right-[12%] size-12" },
  { iconKey: "USDT", className: "top-[26%] left-[4%] size-11" },
  { iconKey: "BNB", className: "top-[2%] left-[44%] size-12" },
  { iconKey: "LTC", className: "top-[28%] right-[6%] size-12" },
];

export function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section className="bg-background relative overflow-hidden">
      <OrbitRings
        className="text-ink/40 pointer-events-none absolute top-0 right-0 size-[36rem] translate-x-1/4 -translate-y-1/4 sm:size-[44rem]"
        stroke="currentColor"
        dot="#E8674A"
      />

      {/* Sits behind the header content and gets faded out by the radial
          overlay below before it reaches the section's bottom edge, so it
          never touches CryptoCarousel's section right after this one. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity delay-150 duration-1000",
          mounted ? "opacity-100" : "opacity-0",
        )}
        aria-hidden="true"
      >
        {FLOATING_ASSETS.map((asset) => (
          <span
            key={asset.iconKey}
            className={cn(
              "bg-secondary ring-background absolute flex items-center justify-center rounded-full p-2.5 ring-4",
              asset.className,
            )}
          >
            <AssetIcon iconKey={asset.iconKey} className="size-full" />
          </span>
        ))}
      </div>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(250,247,242,0) 0%, rgba(250,247,242,0.9) 78%, #FAF7F2 100%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-4 pt-16 pb-16 sm:px-6 sm:pt-20 sm:pb-20 lg:px-8 lg:pt-24 lg:pb-24">
        <div
          className={cn(
            "flex max-w-2xl flex-col items-center text-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
            mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
          )}
        >
          <h1 className="font-heading text-ink mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Hold your crypto. Sell on your terms.
          </h1>

          <p className="text-ink/65 mt-5 max-w-lg text-base text-pretty sm:text-lg">
            Deposit from any wallet into your own real Veyro balance. See your
            rate instantly, then sell or withdraw whenever you&apos;re ready.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full px-7 text-base"
            >
              <Link href="/signup">Get Started</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full px-7 text-base"
            >
              <Link href="/crypto">See Rates</Link>
            </Button>
          </div>

          <p className="text-ink/40 mt-5 text-xs">
            Gift card sales are coming soon.
          </p>
        </div>
      </div>
    </section>
  );
}
