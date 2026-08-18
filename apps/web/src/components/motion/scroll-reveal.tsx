"use client";

import { type ElementType, type ReactNode, type CSSProperties } from "react";
import { useInView } from "@/lib/motion/use-in-view";
import { usePrefersReducedMotion } from "@/lib/motion/use-reduced-motion";
import { cn } from "@/lib/utils";

type Direction = "up" | "down" | "left" | "right" | "none";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  direction?: Direction;
  /** Stagger index. Each step adds `staggerStep` ms of delay on top of `delay`. */
  index?: number;
  staggerStep?: number;
  delay?: number;
  duration?: number;
  distance?: number;
  scale?: boolean;
  once?: boolean;
  threshold?: number;
}

const AXIS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
  none: { x: 0, y: 0 },
};

/**
 * Reusable scroll-triggered reveal wrapper. Used across every public page for
 * consistent fade/slide/scale-in entrances. Honors prefers-reduced-motion by
 * skipping the transform and only doing a quick opacity crossfade.
 */
export function ScrollReveal({
  children,
  className,
  as: Tag = "div",
  direction = "up",
  index = 0,
  staggerStep = 90,
  delay = 0,
  duration = 700,
  distance = 28,
  scale = false,
  once = true,
  threshold = 0.2,
}: ScrollRevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ once, threshold });
  const reducedMotion = usePrefersReducedMotion();

  const totalDelay = delay + index * staggerStep;
  const axis = AXIS[direction];

  const style: CSSProperties = reducedMotion
    ? {
        opacity: inView ? 1 : 0,
        transition: `opacity ${Math.min(duration, 300)}ms ease-out ${totalDelay}ms`,
      }
    : {
        opacity: inView ? 1 : 0,
        transform: inView
          ? "translate3d(0,0,0) scale(1)"
          : `translate3d(${axis.x * distance}px, ${axis.y * distance}px, 0) scale(${
              scale ? 0.94 : 1
            })`,
        transition: `opacity ${duration}ms cubic-bezier(0.16,1,0.3,1) ${totalDelay}ms, transform ${duration}ms cubic-bezier(0.16,1,0.3,1) ${totalDelay}ms`,
        willChange: "opacity, transform",
      };

  const Comp = Tag as ElementType;

  return (
    <Comp ref={ref} className={cn(className)} style={style}>
      {children}
    </Comp>
  );
}
