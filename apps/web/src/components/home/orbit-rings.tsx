import { cn } from "@/lib/utils";

interface OrbitRingsProps {
  className?: string;
  stroke?: string;
  dot?: string;
}

/**
 * Decorative concentric-ring line art with a few accent dots, used behind
 * hero copy and inside the terracotta CTA banners for visual texture
 * without relying on photography.
 */
export function OrbitRings({
  className,
  stroke = "currentColor",
  dot = "currentColor",
}: OrbitRingsProps) {
  return (
    <svg
      viewBox="0 0 480 480"
      fill="none"
      aria-hidden="true"
      className={cn("pointer-events-none", className)}
    >
      <circle cx="240" cy="240" r="238" stroke={stroke} strokeOpacity="0.16" />
      <circle cx="240" cy="240" r="178" stroke={stroke} strokeOpacity="0.16" />
      <circle cx="240" cy="240" r="118" stroke={stroke} strokeOpacity="0.16" />
      <circle cx="240" cy="240" r="58" stroke={stroke} strokeOpacity="0.16" />
      <circle cx="240" cy="22" r="5" fill={dot} />
      <circle cx="422" cy="150" r="4" fill={dot} fillOpacity="0.7" />
      <circle cx="88" cy="340" r="4" fill={dot} fillOpacity="0.7" />
      <circle cx="330" cy="410" r="5" fill={dot} />
    </svg>
  );
}
