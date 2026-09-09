const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Renders a timestamp the way notification and activity feeds do
 * ("2 hours ago", "Yesterday"), falling back to a plain date once it's
 * old enough that a relative label stops being useful.
 */
export function formatRelativeTime(
  iso: string,
  now: Date = new Date(),
): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();

  if (diffMs < MINUTE) return "Just now";
  if (diffMs < HOUR) {
    const minutes = Math.floor(diffMs / MINUTE);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (diffMs < DAY) {
    const hours = Math.floor(diffMs / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfThen = new Date(
    then.getFullYear(),
    then.getMonth(),
    then.getDate(),
  );
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfThen.getTime()) / DAY,
  );

  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7) return `${dayDiff} days ago`;

  return then.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: then.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

/**
 * Day-level label for a chat date divider ("Today", "Yesterday", a weekday
 * name, or a full date) - the grouping half of the standard chat convention
 * where formatMessageTime below handles the per-bubble clock time.
 */
export function formatDateDivider(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfThen = new Date(
    then.getFullYear(),
    then.getMonth(),
    then.getDate(),
  );
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfThen.getTime()) / DAY,
  );

  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7) return then.toLocaleDateString("en-US", { weekday: "long" });

  return then.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: then.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

/** Clock time for a single bubble, e.g. "3:45 PM" - the date lives in the divider above it. */
export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
