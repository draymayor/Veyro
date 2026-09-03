/**
 * Single source of truth for Veyro's public, indexable marketing pages
 * (per docs/context.md's Public Site Structure). Shared by app/robots.ts
 * and app/sitemap.ts so the allowed/indexed page list can't drift between
 * the two.
 */

export const SITE_URL = "https://veyro.best";

export const SITE_DESCRIPTION =
  "Veyro lets you sell gift cards for instant cash and hold your own real crypto balance, sell whenever you want at the live rate, or withdraw it to any wallet. See your rate up front, always.";

export interface PublicPage {
  path: string;
  changeFrequency: "weekly" | "monthly";
  priority: number;
}

export const PUBLIC_PAGES: PublicPage[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/gift-cards", changeFrequency: "weekly", priority: 0.8 },
  { path: "/crypto", changeFrequency: "weekly", priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.3 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.3 },
];
