import type { ComponentType, SVGProps } from "react";

interface ComingSoonWidgetProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  blurb: string;
}

/**
 * Right-column teaser for a feature that doesn't exist yet (Convert, P2P
 * Trading). Deliberately not a WidgetShell: those preview a page that's
 * already built and link to it; these have nowhere to link yet, so no
 * "View all" and no href, just a plain "Coming Soon" tag.
 */
export function ComingSoonWidget({
  icon: Icon,
  title,
  blurb,
}: ComingSoonWidgetProps) {
  return (
    <div className="bg-card border-border rounded-2xl border p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <h3 className="text-ink text-sm font-medium">{title}</h3>
        </div>
        <span className="bg-secondary text-ink/50 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap">
          Coming Soon
        </span>
      </div>
      <p className="text-ink/50 text-xs">{blurb}</p>
    </div>
  );
}
