import { formatDateDivider } from "@/lib/format-relative-time";

interface SupportDateDividerProps {
  iso: string;
}

/** Centered day label ("Today", "Yesterday", ...) separating a chat thread into date groups. */
export function SupportDateDivider({ iso }: SupportDateDividerProps) {
  return (
    <div className="flex items-center justify-center py-1">
      <span className="text-ink/40 bg-secondary rounded-full px-2.5 py-0.5 text-[11px] font-medium">
        {formatDateDivider(iso)}
      </span>
    </div>
  );
}
