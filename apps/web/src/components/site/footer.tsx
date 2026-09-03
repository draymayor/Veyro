import Link from "next/link";
import Image from "next/image";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Home", href: "/" },
      { label: "Gift Cards", href: "/gift-cards" },
      { label: "Crypto", href: "/crypto" },
    ],
  },
  {
    heading: "Company",
    links: [{ label: "Contact Us", href: "/contact" }],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
];

const SOCIALS = [
  { label: "X", href: "https://x.com" },
  { label: "Instagram", href: "https://instagram.com" },
  { label: "TikTok", href: "https://tiktok.com" },
];

export function Footer() {
  return (
    <footer className="border-background/10 bg-ink border-t">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-10 px-4 py-14 sm:px-6 md:grid-cols-5 lg:px-8">
        <div className="col-span-2 md:col-span-2">
          <Link
            href="/"
            className="font-heading text-background flex items-center gap-2 text-xl font-semibold tracking-tight"
          >
            <Image
              src="/veyro_logos/veyro-mark.png"
              alt=""
              width={28}
              height={28}
              className="size-7"
            />
            Veyro
          </Link>
          <p className="text-background/60 mt-3 max-w-xs text-sm">
            Turn gift cards into cash instantly, or hold, sell, and withdraw
            your crypto on your own terms.
          </p>
          <div className="mt-6 flex items-center gap-4">
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="text-background/60 hover:text-background text-sm font-medium transition-colors"
              >
                {social.label}
              </a>
            ))}
          </div>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.heading}>
            <h3 className="font-heading text-background text-sm font-medium">
              {column.heading}
            </h3>
            <ul className="mt-4 space-y-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-background/60 hover:text-background text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="overflow-hidden">
        <div
          aria-hidden="true"
          className="-mb-[0.08em] flex w-full items-center justify-center select-none"
        >
          <Image
            src="/veyro_logos/veyro-mark.png"
            alt=""
            width={512}
            height={512}
            className="h-[30vw] w-[30vw] shrink-0"
          />
          <p className="font-heading text-background text-[22vw] leading-none font-semibold tracking-tighter">
            VEYRO
          </p>
        </div>
      </div>

      <div className="border-background/10 border-t">
        <div className="text-background/50 mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Veyro. All rights reserved.</p>
          <p>
            Platform Rates shown are subject to confirmation at submission time.
          </p>
        </div>
      </div>
    </footer>
  );
}
