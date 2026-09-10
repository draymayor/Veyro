import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "@/lib/seo/public-pages";

// Next's native App Router manifest route (served at /manifest.webmanifest)
// - lets the browser offer "Add to Home Screen"/install, and is required
// (alongside a registered service worker) for the installed app to be a
// real push-notification target rather than just a bookmark shortcut.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Veyro",
    short_name: "Veyro",
    description: SITE_DESCRIPTION,
    start_url: "/home",
    display: "standalone",
    background_color: "#FAF7F2",
    theme_color: "#FAF7F2",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
