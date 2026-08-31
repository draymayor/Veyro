import type { ReactNode } from "react";

interface RateListProps {
  columns: [string, string, string];
  children: ReactNode;
}

/**
 * Header labels above a column of rate rows, per the standard exchange
 * list pattern (asset name on the left, figures on the right). Flat, no
 * card border and no dividing line between the header and the rows, per
 * docs/design-principles.md's List/Row Styling rule, rows separate
 * themselves with vertical padding instead.
 */
export function RateList({ columns, children }: RateListProps) {
  return (
    <div className="flex flex-col">
      <div className="text-ink/40 grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 text-xs font-medium sm:px-5">
        <span>{columns[0]}</span>
        <span className="text-right">{columns[1]}</span>
        <span className="min-w-16 text-right">{columns[2]}</span>
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}
