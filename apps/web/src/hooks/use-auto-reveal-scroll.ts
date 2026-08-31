import { useEffect, useRef } from "react";

/**
 * For a number/value that can render wider than its card (e.g. a large
 * payout figure), attach the returned ref to an `overflow-x-auto` element
 * wrapping the content. When the content overflows, it stays clipped to
 * the card (never spills past it) and slowly auto-scrolls left once to
 * reveal the rest, so the user doesn't have to guess there's more. Any
 * touch/wheel/pointer interaction cancels the auto-scroll immediately so a
 * manual drag always wins.
 */
export function useAutoRevealScroll<T extends HTMLElement>(
  deps: unknown[],
): React.RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.scrollLeft = 0;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;

    let rafId: number;
    let cancelled = false;
    // Slow and proportional to how much is hidden, clamped to a sane range.
    const duration = Math.min(4000, Math.max(900, maxScroll * 10));
    const start = performance.now();

    function step(now: number) {
      if (cancelled) return;
      const progress = Math.min(1, (now - start) / duration);
      el!.scrollLeft = progress * maxScroll;
      if (progress < 1) rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);

    function cancelAutoScroll() {
      cancelled = true;
      cancelAnimationFrame(rafId);
    }
    el.addEventListener("pointerdown", cancelAutoScroll, { once: true });
    el.addEventListener("wheel", cancelAutoScroll, { once: true });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      el.removeEventListener("pointerdown", cancelAutoScroll);
      el.removeEventListener("wheel", cancelAutoScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
