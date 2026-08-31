import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Grouped section shell used by every group on the Settings page. The
 * section itself gets the standard card treatment (border, no heavy
 * shadow), but rows inside it stay flat with no shadows or dividing
 * lines between them, per design-principles.md's List/Row Styling rule.
 */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section>
      <h2 className="text-ink font-heading mb-1 text-base font-medium">
        {title}
      </h2>
      {description ? (
        <p className="text-ink/45 mb-2 text-xs">{description}</p>
      ) : null}
      <div
        className={cn(
          "bg-card border-border flex flex-col rounded-2xl border px-1 py-1 sm:px-2",
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}
