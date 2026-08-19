import type { MetadataRoute } from "next";
import { PUBLIC_PAGES, SITE_URL } from "@/lib/seo/public-pages";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: PUBLIC_PAGES.map((page) => page.path),
      disallow: [
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/select-country",
        "/home",
        "/leaderboard",
        "/assets",
        "/settings",
        "/notifications",
        "/sell/gift-card",
        "/sell/crypto",
        "/admin",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
