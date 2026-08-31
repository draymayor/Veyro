import { formatRelativeTime } from "@/lib/format-relative-time";
import { cn } from "@/lib/utils";
import type { SupportMessage } from "@/lib/support/types";

interface SupportMessageBubbleProps {
  message: SupportMessage;
}

/**
 * Standard chat bubble convention: the user's own messages align right in
 * the terracotta primary color, admin replies align left on a flat
 * secondary tint, no shadow or border either way per
 * docs/design-principles.md's List/Row Styling rule.
 */
export function SupportMessageBubble({ message }: SupportMessageBubbleProps) {
  const isUser = message.sender === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 sm:max-w-[70%]",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-secondary text-ink rounded-bl-md",
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
        <p
          className={cn(
            "mt-1 text-right text-[11px]",
            isUser ? "text-primary-foreground/70" : "text-ink/40",
          )}
        >
          {formatRelativeTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
