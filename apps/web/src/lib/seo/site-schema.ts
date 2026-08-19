import { SITE_DESCRIPTION, SITE_URL } from "@/lib/seo/public-pages";

/**
 * Site-wide Organization and WebSite JSON-LD, rendered once from the root
 * layout so it appears on every page. Reuses the same name, url, and
 * description already set in the page metadata rather than restating them.
 */
export function organizationAndWebsiteSchema() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Veyro",
      url: SITE_URL,
      logo: `${SITE_URL}/veyro_logos/veyro-mark.png`,
      description: SITE_DESCRIPTION,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Veyro",
      url: SITE_URL,
    },
  ];
}
