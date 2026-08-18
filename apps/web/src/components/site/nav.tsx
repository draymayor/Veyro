"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, House, Gift, Coins, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", href: "/", icon: House },
  { label: "Gift Cards", href: "/gift-cards", icon: Gift },
  { label: "Crypto", href: "/crypto", icon: Coins },
  { label: "Contact Us", href: "/contact", icon: Mail },
];

function MenuTile({
  item,
  onSelect,
}: {
  item: (typeof NAV_LINKS)[number];
  onSelect?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onSelect}
      className="group border-border bg-background hover:border-primary/40 hover:bg-secondary flex flex-col gap-2.5 rounded-xl border p-4 transition-colors"
    >
      <span className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex size-9 items-center justify-center rounded-full transition-colors">
        <item.icon className="size-4.5" />
      </span>
      <span className="font-heading text-ink block text-sm font-medium">
        {item.label}
      </span>
    </Link>
  );
}

export function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-3 z-50 w-full px-4 sm:top-4 sm:px-6 lg:px-8">
      <div className="border-border bg-background/90 mx-auto flex h-16 w-full max-w-6xl items-center justify-between rounded-full border px-4 shadow-[0_10px_30px_rgba(28,27,41,0.08)] backdrop-blur-md sm:px-5">
        <Link
          href="/"
          className="font-heading text-ink flex items-center gap-2 text-xl font-semibold tracking-tight"
        >
          <Image
            src="/veyro_logos/veyro-mark.png"
            alt=""
            width={28}
            height={28}
            className="size-7"
            priority
          />
          Veyro
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-ink/70 hover:text-ink text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-full px-5"
          >
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild size="lg" className="rounded-full px-5">
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="text-ink flex items-center justify-center rounded-full p-2 md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div
        className={cn(
          "mx-auto grid w-full max-w-6xl overflow-hidden transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden",
          mobileOpen ? "grid-rows-[1fr] pt-2" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-border bg-background rounded-2xl border p-4 shadow-[0_10px_30px_rgba(28,27,41,0.08)]">
            <div className="grid grid-cols-2 gap-2">
              {NAV_LINKS.map((link) => (
                <MenuTile
                  key={link.href}
                  item={link}
                  onSelect={() => setMobileOpen(false)}
                />
              ))}
            </div>
            <div className="border-border mt-3 flex flex-col gap-2 border-t pt-3">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full"
              >
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  Log In
                </Link>
              </Button>
              <Button asChild size="lg" className="rounded-full">
                <Link href="/signup" onClick={() => setMobileOpen(false)}>
                  Get Started
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
