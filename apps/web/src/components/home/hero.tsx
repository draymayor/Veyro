"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GiftCardFan } from "@/components/home/gift-card-fan";
import { OrbitRings } from "@/components/home/orbit-rings";
import { cn } from "@/lib/utils";

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
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(250,247,242,0) 0%, rgba(250,247,242,0.9) 78%, #FAF7F2 100%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-4 pt-16 pb-8 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
        <div
          className={cn(
            "flex max-w-2xl flex-col items-center text-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
            mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
          )}
        >
          <h1 className="font-heading text-ink mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Turn gift cards and crypto into cash.
          </h1>

          <p className="text-ink/65 mt-5 max-w-lg text-base text-pretty sm:text-lg">
            See your rate instantly. Get paid the moment we confirm.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full px-7 text-base"
            >
              <Link href="/gift-cards">Sell a Gift Card</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full px-7 text-base"
            >
              <Link href="/crypto">Sell Crypto</Link>
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "mt-4 w-full transition-all delay-150 duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]",
            mounted ? "opacity-100" : "opacity-0",
          )}
        >
          <GiftCardFan />
        </div>
      </div>
    </section>
  );
}
