// Mirrors apps/api/src/scout/scout.constants.ts's SCOUT_PLATFORM_KEYS -
// kept in sync manually (small, fixed list from the application form spec).
export const SCOUT_PLATFORMS = [
  { key: "reddit", label: "Reddit" },
  { key: "x_twitter", label: "X (Twitter)" },
  { key: "threads", label: "Threads" },
  { key: "facebook", label: "Facebook" },
  { key: "discord", label: "Discord" },
  { key: "telegram", label: "Telegram" },
  { key: "tiktok", label: "TikTok" },
  { key: "quora", label: "Quora" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "instagram_status", label: "Instagram (Status/Posts)" },
] as const;

export type ScoutPlatformKey = (typeof SCOUT_PLATFORMS)[number]["key"];

export function scoutPlatformLabel(key: string): string {
  return SCOUT_PLATFORMS.find((p) => p.key === key)?.label ?? key;
}
