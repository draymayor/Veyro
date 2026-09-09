import Image from "next/image";
import { formatMessageTime } from "@/lib/format-relative-time";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/app/user-avatar";
import type { SupportMessage } from "@/lib/support/types";

interface SupportMessageBubbleProps {
  message: SupportMessage;
  /** The ticket owner, whose avatar represents every "user"-sender message. */
  ticketOwner: { id: string; profileImageUrl: string | null };
}

const AVATAR_SIZE = 28;

/**
 * Standard chat bubble convention: the user's own messages align right in
 * the terracotta primary color, admin replies align left on a flat
 * secondary tint, no shadow or border either way per
 * docs/design-principles.md's List/Row Styling rule. Each bubble shows only
 * its clock time - the day is carried by the SupportDateDivider grouping
 * messages above it. Every message also carries an avatar: the ticket
 * owner's own photo/generated avatar for their messages, Veyro's mark for
 * admin replies, so the thread reads like chatting with "Veyro" itself.
 */
export function SupportMessageBubble({
  message,
  ticketOwner,
}: SupportMessageBubbleProps) {
  const isUser = message.sender === "user";

  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      {isUser ? (
        <UserAvatar user={ticketOwner} size={AVATAR_SIZE} />
      ) : (
        <span className="bg-secondary flex size-7 shrink-0 items-center justify-center rounded-full">
          <Image
            src="/veyro_logos/veyro-mark.png"
            alt="Veyro"
            width={18}
            height={18}
            className="rounded-sm"
          />
        </span>
      )}

      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 sm:max-w-[65%]",
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
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
