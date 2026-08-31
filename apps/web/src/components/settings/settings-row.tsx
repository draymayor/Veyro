import type { ComponentType, ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

interface SettingsRowProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  description?: string;
  /** Right-aligned content: a value, a badge, a toggle, a chevron, etc. */
  right?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * The one row every Settings group renders through, so spacing and icon
 * treatment stay identical across Account, Security, Payment Methods, and
 * Notifications. Flat, no shadow, no border between rows (the group's
 * SettingsSection provides the only border, around the whole card), per
 * design-principles.md's List/Row Styling rule. Renders as a button when
 * `onClick` is given, keeping the whole row a large, clean tap target
 * rather than a small control inside it.
 */
export function SettingsRow({
  icon: Icon,
  label,
  description,
  right,
  onClick,
  disabled,
  className,
}: SettingsRowProps) {
  const content = (
    <>
      <span className="bg-secondary text-ink/60 flex size-10 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-ink block text-sm font-medium">{label}</span>
        {description ? (
          <span className="text-ink/45 block text-xs">{description}</span>
        ) : null}
      </span>
      {right ? (
        <span className="flex shrink-0 items-center gap-2">{right}</span>
      ) : null}
    </>
  );

  const rowClassName = cn(
    "flex w-full items-center gap-4 rounded-2xl px-2 py-3.5 text-left sm:px-3",
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          rowClassName,
          "hover:bg-secondary/50 transition-colors disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={rowClassName}>{content}</div>;
}
