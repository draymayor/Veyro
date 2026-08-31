"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { usePrefersReducedMotion } from "@/lib/motion/use-reduced-motion";
import { cn } from "@/lib/utils";

interface CardFace {
  brand: string;
  denom: string;
  logo: string;
  gradient: string;
  textClass?: string;
  badgeClass?: string;
}

const CARDS: CardFace[] = [
  {
    brand: "Steam",
    denom: "$25",
    logo: "/logos/steam.svg",
    gradient: "linear-gradient(135deg,#1b2838 0%,#2a475e 60%,#66c0f4 150%)",
  },
  {
    brand: "PlayStation",
    denom: "$20",
    logo: "/logos/playstation.svg",
    gradient: "linear-gradient(135deg,#00308F 0%,#003791 55%,#E8674A 150%)",
  },
  {
    brand: "Apple",
    denom: "$100",
    logo: "/logos/apple.svg",
    gradient: "linear-gradient(135deg,#3a3a3c 0%,#1c1c1e 55%,#0ECB81 150%)",
  },
  {
    brand: "Google Play",
    denom: "$50",
    logo: "/logos/googleplay.svg",
    gradient: "linear-gradient(135deg,#FAF7F2 0%,#F0EAE1 55%,#0ECB81 150%)",
    textClass: "text-ink",
    badgeClass: "bg-ink/5",
  },
  {
    brand: "Xbox",
    denom: "$25",
    logo: "/logos/xbox.svg",
    gradient: "linear-gradient(135deg,#0e7a0d 0%,#0a5c0a 55%,#1C1B29 150%)",
  },
  {
    brand: "Netflix",
    denom: "$30",
    logo: "/logos/netflix.svg",
    gradient: "linear-gradient(135deg,#141414 0%,#221313 55%,#C24E3D 150%)",
  },
  {
    brand: "Spotify",
    denom: "$25",
    logo: "/logos/spotify.svg",
    gradient: "linear-gradient(135deg,#0d2818 0%,#123524 55%,#0ECB81 150%)",
  },
];

const CENTER_SLOT = 3;
const AUTO_ADVANCE_MS = 2600;
const RESUME_AFTER_MS = 3400;
// Auto-advance only below this width. Desktop viewports show the whole fan
// at once, so cycling it automatically would just be distracting there.
const AUTO_ADVANCE_MAX_WIDTH = 1024;

const FAN_POSITIONS = [
  { rot: -21, scale: 0.78, x: -32, y: 7.5, zIndex: 1 },
  { rot: -14, scale: 0.85, x: -23, y: 4.2, zIndex: 2 },
  { rot: -7, scale: 0.93, x: -12, y: 1.4, zIndex: 3 },
  { rot: 0, scale: 1.0, x: 0, y: 0, zIndex: 10 },
  { rot: 7, scale: 0.93, x: 12, y: 1.4, zIndex: 3 },
  { rot: 14, scale: 0.85, x: 23, y: 4.2, zIndex: 2 },
  { rot: 21, scale: 0.78, x: 32, y: 7.5, zIndex: 1 },
];

function getResponsiveMultiplier(width: number) {
  if (width < 480) return 0.34;
  if (width < 640) return 0.44;
  if (width < 768) return 0.58;
  if (width < 1024) return 0.8;
  return 1.0;
}

/**
 * Fanned gift card display for the hero. Adapted from the 21st.dev
 * "Card Fan Carousel" interaction pattern (elastic entrance, hover spread),
 * restyled with Veyro's palette and real brand logos on branded card art.
 * Auto-advances through the fan so mobile viewports, which can only ever
 * show one raised card at a time, still see every brand.
 */
export function GiftCardFan({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasEntered = useRef(false);
  const reducedMotion = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);

  const activeSlotRef = useRef<number | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const runEntrance = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cardEls = Array.from(
      container.querySelectorAll<HTMLElement>(".fan-card"),
    );
    if (!cardEls.length || hasEntered.current) return;
    hasEntered.current = true;

    const multiplier = getResponsiveMultiplier(window.innerWidth);

    if (reducedMotion) {
      cardEls.forEach((card, i) => {
        const { x, y, rot, scale, zIndex } = FAN_POSITIONS[i];
        gsap.set(card, {
          x: `${x * multiplier}rem`,
          y: `${y * multiplier}rem`,
          rotation: rot,
          scale,
          opacity: 1,
          zIndex,
        });
      });
      return;
    }

    cardEls.forEach((card, i) => {
      const { x, y, rot, scale, zIndex } = FAN_POSITIONS[i];
      gsap.set(card, { x: 0, y: "10rem", rotation: 0, scale: 0.5, opacity: 0 });
      gsap.to(card, {
        x: `${x * multiplier}rem`,
        y: `${y * multiplier}rem`,
        rotation: rot,
        scale,
        opacity: 1,
        zIndex,
        duration: 1.15,
        ease: "elastic.out(1.05,0.78)",
        delay: 0.15 + i * 0.06,
      });
    });
  }, [reducedMotion]);

  useEffect(() => {
    if (!mounted) return;
    runEntrance();
  }, [mounted, runEntrance]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || reducedMotion) return;
    const cardEls = Array.from(
      container.querySelectorAll<HTMLElement>(".fan-card"),
    );

    function layout(slot: number | null) {
      activeSlotRef.current = slot;
      const multiplier = getResponsiveMultiplier(window.innerWidth);
      cardEls.forEach((card, i) => {
        const base = FAN_POSITIONS[i];
        let targetX = base.x * multiplier;
        let targetY = base.y * multiplier;
        let targetRot = base.rot;
        let targetScale = base.scale;

        if (slot !== null) {
          const distance = Math.abs(i - slot);
          if (i === slot) {
            targetY -= 2.4 * multiplier;
            targetScale *= 1.08;
          } else {
            const normalized = (i - CENTER_SLOT) / CENTER_SLOT;
            const push =
              8 *
              (1 - Math.abs(normalized)) *
              (1 + 0.2 * Math.max(0, 3 - distance));
            if (i < slot) {
              targetX -= push * multiplier;
              targetRot -= 3 / (distance + 1);
            } else {
              targetX += push * multiplier;
              targetRot += 3 / (distance + 1);
            }
          }
        }

        gsap.to(card, {
          x: `${targetX}rem`,
          y: `${targetY}rem`,
          rotation: targetRot,
          scale: targetScale,
          duration: 0.5,
          delay: Math.abs(i - (slot ?? CENTER_SLOT)) * 0.02,
          ease: "elastic.out(1,0.75)",
          overwrite: "auto",
        });
      });
    }

    function stopAuto() {
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    }

    function isAutoAdvanceViewport() {
      return window.innerWidth < AUTO_ADVANCE_MAX_WIDTH;
    }

    function startAuto() {
      stopAuto();
      if (!isAutoAdvanceViewport()) return;
      autoTimerRef.current = setInterval(() => {
        if (!hasEntered.current) return;
        const next = ((activeSlotRef.current ?? -1) + 1) % CARDS.length;
        layout(next);
      }, AUTO_ADVANCE_MS);
    }

    function pauseThenResume() {
      stopAuto();
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = setTimeout(startAuto, RESUME_AFTER_MS);
    }

    // Desktop stays hover-only: no pause/resume juggling, no auto timer.
    const enterHandlers = cardEls.map((card, slot) => {
      const handler = () => {
        if (!hasEntered.current) return;
        if (isAutoAdvanceViewport()) pauseThenResume();
        layout(slot);
      };
      card.addEventListener("mouseenter", handler);
      card.addEventListener("touchstart", handler, { passive: true });
      return { card, handler };
    });

    const onLeave = () => hasEntered.current && layout(null);
    container.addEventListener("mouseleave", onLeave);

    const onResize = () => {
      if (!isAutoAdvanceViewport()) {
        stopAuto();
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      } else if (!autoTimerRef.current) {
        startAuto();
      }
    };
    window.addEventListener("resize", onResize);

    const entranceDelay = window.setTimeout(startAuto, 1600);

    return () => {
      enterHandlers.forEach(({ card, handler }) => {
        card.removeEventListener("mouseenter", handler);
        card.removeEventListener("touchstart", handler);
      });
      container.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(entranceDelay);
      stopAuto();
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex h-[22rem] w-full items-center justify-center sm:h-[26rem]",
        className,
      )}
    >
      {CARDS.map((card) => (
        <div
          key={card.brand}
          className="fan-card absolute h-56 w-36 rounded-2xl shadow-[0_20px_45px_rgba(28,27,41,0.22)] ring-1 ring-black/5 sm:h-64 sm:w-40"
          style={{ opacity: 0 }}
        >
          <div
            className="flex h-full w-full flex-col justify-between rounded-2xl p-4"
            style={{ backgroundImage: card.gradient }}
          >
            <span
              className={cn(
                "relative flex size-9 items-center justify-center rounded-full p-2 backdrop-blur-sm",
                card.badgeClass ?? "bg-background/15",
              )}
            >
              <Image
                src={card.logo}
                alt=""
                aria-hidden="true"
                fill
                className="object-contain p-1.5"
              />
            </span>
            <div
              className={cn(
                "flex flex-col gap-0.5",
                card.textClass ?? "text-background",
              )}
            >
              <span className="font-heading text-sm font-medium tracking-tight">
                {card.brand}
              </span>
              <span className="text-[10px] tracking-[0.2em] uppercase opacity-70">
                Gift Card
              </span>
              <span className="font-heading text-xl tabular-nums">
                {card.denom}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
