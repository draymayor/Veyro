import type { SupportMessage } from "@/lib/support/types";

export interface SupportMessageDayGroup {
  dateKey: string;
  messages: SupportMessage[];
}

function dateKeyFor(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Buckets messages (already in chronological order) into per-calendar-day groups for date dividers. */
export function groupMessagesByDay(
  messages: SupportMessage[],
): SupportMessageDayGroup[] {
  const groups: SupportMessageDayGroup[] = [];

  for (const message of messages) {
    const key = dateKeyFor(message.createdAt);
    const current = groups.at(-1);
    if (current && current.dateKey === key) {
      current.messages.push(message);
    } else {
      groups.push({ dateKey: key, messages: [message] });
    }
  }

  return groups;
}
