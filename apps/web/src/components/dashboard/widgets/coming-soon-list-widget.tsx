import type { ComponentType, SVGProps } from "react";

interface ComingSoonListItem {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
}

interface ComingSoonListWidgetProps {
  title: string;
  items: ComingSoonListItem[];
}

/**
 * Right-column teaser grouping several not-yet-built features under one
 * card (Earn, Airdrop, Connect Wallet), rather than one full ComingSoonWidget
 * each - these are lighter-weight than Convert/P2P Trading, so a shared
 * "Coming Soon" tag per row keeps the sidebar from getting crowded with
 * near-identical cards. Same container language as ComingSoonWidget
 * (bg-card/border-border shell, bg-primary/10 icon circle, bg-secondary tag).
 */
export function ComingSoonListWidget({
  title,
  items,
}: ComingSoonListWidgetProps) {
  return (
    <div className="bg-card border-border rounded-2xl border p-4">
      <h3 className="text-ink mb-3 text-sm font-medium">{title}</h3>
      <div className="flex flex-col gap-3">
        {items.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="text-ink text-sm font-medium">{label}</span>
            </div>
            <span className="bg-secondary text-ink/50 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap">
              Coming Soon
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
