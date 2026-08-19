import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/seo/public-pages";
import { organizationAndWebsiteSchema } from "@/lib/seo/site-schema";
import { JsonLd } from "@/components/seo/json-ld";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Veyro",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "Veyro",
    description: SITE_DESCRIPTION,
    siteName: "Veyro",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        spaceGrotesk.variable,
        inter.variable,
        "font-sans",
      )}
    >
      <body className="bg-background text-ink flex min-h-full flex-col font-sans">
        {organizationAndWebsiteSchema().map((schema) => (
          <JsonLd key={schema["@type"]} data={schema} />
        ))}
        {children}
      </body>
    </html>
  );
}
