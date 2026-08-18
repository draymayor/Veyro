"use client";

import { useEffect, useState } from "react";
import { OrbitRings } from "@/components/home/orbit-rings";
import { cn } from "@/lib/utils";

/**
 * Gift cards hero, using the same background treatment as the homepage
 * hero (orbit rings top-right, radial fade to the page background) so the
 * two pages read as one product. Shorter than the homepage hero since the
 * Rate Browser grid right below carries the page's visual weight.
 */
export function GiftCardsHero() {
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
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(250,247,242,0) 0%, rgba(250,247,242,0.9) 78%, #FAF7F2 100%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-4 pt-16 pb-14 text-center sm:px-6 sm:pt-20 sm:pb-16 lg:px-8 lg:pt-24">
        <div
          className={cn(
            "flex max-w-2xl flex-col items-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
            mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
          )}
        >
          <h1 className="font-heading text-ink text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Sell any gift card. Get paid instantly.
          </h1>

          <p className="text-ink/65 mt-5 max-w-lg text-base text-pretty sm:text-lg">
            Pick your brand, see the rate, and get paid the moment we
            confirm.
          </p>
        </div>
      </div>
    </section>
  );
}
