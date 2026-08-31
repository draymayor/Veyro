"use client";

import { useId, useMemo } from "react";

interface PriceSparklineProps {
  history: number[];
  positive: boolean;
  className?: string;
}

const WIDTH = 300;
const HEIGHT = 80;
const PADDING_Y = 6;

// Up uses the same vibrant green as the app's success color, one
// consistent green across the whole app (docs/design-principles.md). Down
// stays a market-convention red, distinct from the brand's brick red.
const UP_COLOR = "#0ECB81";
const DOWN_COLOR = "#EF4444";

function buildLinePath(points: [number, number][]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const [x, y] = points[0];
    return `M ${x} ${y} L ${x} ${y}`;
  }
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const midX = (x0 + x1) / 2;
    d += ` C ${midX} ${y0}, ${midX} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

export function PriceSparkline({
  history,
  positive,
  className,
}: PriceSparklineProps) {
  const gradientId = useId();
  const color = positive ? UP_COLOR : DOWN_COLOR;

  const { linePath, areaPath } = useMemo(() => {
    if (history.length < 2) return { linePath: "", areaPath: "" };

    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min || 1;

    const points: [number, number][] = history.map((value, i) => {
      const x = (i / (history.length - 1)) * WIDTH;
      const y =
        HEIGHT - PADDING_Y - ((value - min) / range) * (HEIGHT - PADDING_Y * 2);
      return [x, y];
    });

    const line = buildLinePath(points);
    const area = `${line} L ${WIDTH} ${HEIGHT} L 0 ${HEIGHT} Z`;
    return { linePath: line, areaPath: area };
  }, [history]);

  if (!linePath) return null;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
    </svg>
  );
}
