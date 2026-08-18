"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { OrbitRings } from "@/components/home/orbit-rings";
import { usePrefersReducedMotion } from "@/lib/motion/use-reduced-motion";

/**
 * Contact hero. Shares the orbit-rings motif with the other public heroes
 * but centers a single large ring behind the headline (a "reaching out"
 * signal rather than a corner accent), and animates on a quick
 * back.out overshoot instead of the power3.out fades used on Home,
 * Gift Cards, and Crypto, so this hero reads as its own composition.
 */
export function ContactHero() {
  const reducedMotion = usePrefersReducedMotion();
  const eyebrowRef = useRef<HTMLSpanElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) {
      gsap.set(
        [eyebrowRef.current, headlineRef.current, subRef.current, ringRef.current],
        { opacity: 1, y: 0, scale: 1 },
      );
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.fromTo(
        ringRef.current,
        { opacity: 0, scale: 0.85 },
        { opacity: 1, scale: 1, duration: 0.9, ease: "power2.out" },
      )
        .fromTo(
          eyebrowRef.current,
          { opacity: 0, y: -8 },
          { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" },
          "-=0.6",
        )
        .fromTo(
          headlineRef.current,
          { opacity: 0, y: 18, scale: 0.94 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.6)" },
          "-=0.2",
        )
        .fromTo(
          subRef.current,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" },
          "-=0.3",
        );
    });

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section className="bg-background relative overflow-hidden">
      <div
        ref={ringRef}
        className="pointer-events-none absolute top-1/2 left-1/2 size-[38rem] -translate-x-1/2 -translate-y-1/2 sm:size-[46rem]"
      >
        <OrbitRings
          className="text-ink/30 size-full"
          stroke="currentColor"
          dot="#E8674A"
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 40%, rgba(250,247,242,0) 0%, rgba(250,247,242,0.92) 72%, #FAF7F2 100%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-4 pt-20 pb-14 text-center sm:px-6 sm:pt-24 sm:pb-16 lg:pt-28">
        <span
          ref={eyebrowRef}
          className="text-primary text-xs font-medium tracking-[0.2em] uppercase"
        >
          Contact Us
        </span>

        <h1
          ref={headlineRef}
          className="font-heading text-ink mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
        >
          Talk to us
        </h1>

        <p
          ref={subRef}
          className="text-ink/65 mt-5 max-w-md text-base text-pretty sm:text-lg"
        >
          Questions about a trade, your wallet, or anything else. We usually
          reply within one business day.
        </p>
      </div>
    </section>
  );
}
