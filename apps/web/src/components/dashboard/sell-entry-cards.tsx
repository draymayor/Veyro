import Link from "next/link";
import { ArrowRightCircleIcon } from "@heroicons/react/24/solid";
import { AssetIcon } from "@/components/crypto/asset-icon";
import type { TokenIconKey } from "@/lib/crypto/data";

const CRYPTO_PREVIEW_ICONS: TokenIconKey[] = ["BTC", "ETH", "USDT"];

interface SellEntryCardProps {
  href: string;
  title: string;
  blurb: string;
  visual: React.ReactNode;
}

function SellEntryCard({ href, title, blurb, visual }: SellEntryCardProps) {
  return (
    <Link
      href={href}
      className="bg-card border-border hover:border-primary/30 group flex flex-1 flex-col justify-between gap-4 rounded-2xl border p-3 transition-colors sm:gap-6 sm:p-5"
    >
      <div className="flex items-center justify-between">
        {visual}
        <ArrowRightCircleIcon className="text-ink/20 group-hover:text-primary size-5 shrink-0 transition-colors sm:size-6" />
      </div>
      <div>
        <p className="text-ink font-heading text-sm font-medium sm:text-base">
          {title}
        </p>
        <p className="text-ink/50 mt-1 text-xs sm:text-sm">{blurb}</p>
      </div>
    </Link>
  );
}

export function SellEntryCards() {
  return (
    <div className="flex flex-row gap-3 sm:gap-4">
      <SellEntryCard
        href="/sell/crypto"
        title="Sell Crypto"
        blurb="See your rate, send from any wallet."
        visual={
          <div className="flex -space-x-2">
            {CRYPTO_PREVIEW_ICONS.map((key) => (
              <span
                key={key}
                className="bg-secondary ring-background flex size-7 items-center justify-center rounded-full p-1 ring-2 sm:size-9 sm:p-1.5"
              >
                <AssetIcon iconKey={key} className="size-full" />
              </span>
            ))}
          </div>
        }
      />
      <SellEntryCard
        href="/sell/gift-card"
        title="Sell Gift Cards"
        blurb="Amazon, Steam, Apple, and more."
        visual={
          <div className="flex -space-x-2">
            {[
              { letter: "a", bg: "#131921", fg: "#FF9900" },
              { letter: "S", bg: "#1b2838", fg: "#66c0f4" },
              { letter: "A", bg: "#1c1c1e", fg: "#FAF7F2" },
            ].map((mark, i) => (
              <span
                key={i}
                className="ring-background flex size-7 items-center justify-center rounded-full text-[10px] font-semibold ring-2 sm:size-9 sm:text-xs"
                style={{ background: mark.bg, color: mark.fg }}
              >
                {mark.letter}
              </span>
            ))}
          </div>
        }
      />
    </div>
  );
}
