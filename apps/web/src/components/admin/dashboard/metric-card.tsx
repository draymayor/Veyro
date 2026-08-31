interface MetricCardProps {
  label: string;
  value: string | string[];
  caption?: string;
}

/**
 * A single top-level metric tile (docs/admin-guide.md's Dashboard
 * Overview). Sized to sit 2-per-row on mobile and 4-per-row on desktop
 * (see the grid in admin/dashboard/page.tsx), so padding/text stay compact
 * rather than the larger single-column sizing this used before. `value`
 * accepts an array (multi-currency totals) so a long combined string never
 * has to be crammed onto one line in a narrow card, each renders on its
 * own line instead.
 */
export function MetricCard({ label, value, caption }: MetricCardProps) {
  const values = Array.isArray(value) ? value : [value];

  return (
    <div className="bg-card border-border rounded-xl border p-3 sm:p-4">
      <p className="text-ink/60 truncate text-[11px] font-medium sm:text-xs">
        {label}
      </p>
      <div className="font-heading text-ink mt-1 flex flex-col text-lg font-semibold tabular-nums sm:text-xl">
        {values.map((v) => (
          <span key={v} className="truncate">
            {v}
          </span>
        ))}
      </div>
      {caption ? (
        <p className="text-ink/40 mt-1 text-[11px] leading-snug">{caption}</p>
      ) : null}
    </div>
  );
}
