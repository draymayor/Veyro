"use client";

import { ShareIcon } from "@heroicons/react/24/solid";
import { CopyButton } from "@/components/dashboard/copy-button";
import { Button } from "@/components/ui/button";
import { OrbitRings } from "@/components/home/orbit-rings";

interface ReferralHeroCardProps {
  /** Read from platform_settings where key = 'referral_bonus_usd' (docs/database-schema.md), never hardcoded. */
  bonusAmountUsd: number;
  code: string;
  link: string;
}

/**
 * Primary hero for the standalone Referrals page. Reuses the exact
 * OrbitRings + terracotta-card treatment from ReferralTeaserCard (the
 * compact version on Leaderboard), just laid out as the full, focal
 * version of this page rather than a teaser: the code itself is the
 * headline element here instead of being folded into a copyable link
 * field, with its own large display and copy action, plus a dedicated
 * "Share your link" action.
 */
export function ReferralHeroCard({
  bonusAmountUsd,
  code,
  link,
}: ReferralHeroCardProps) {
  async function handleShareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Veyro referral link",
          text: `Join me on Veyro and we both earn when you trade. Use my link:`,
          url: link,
        });
        return;
      } catch {
        // User cancelled the share sheet, or it's unsupported, fall through to copy.
      }
    }
    await navigator.clipboard.writeText(link);
  }

  return (
    <div className="bg-primary relative overflow-hidden rounded-3xl p-6 sm:p-8">
      <OrbitRings
        className="text-background pointer-events-none absolute top-1/2 left-1/2 size-80 -translate-x-1/2 -translate-y-1/2 opacity-50 sm:size-96"
        stroke="currentColor"
        dot="currentColor"
      />
      <div className="relative flex flex-col items-center gap-5 text-center">
        <p className="text-primary-foreground/70 text-xs font-medium tracking-wide uppercase">
          Your referral code
        </p>

        <div className="flex items-center gap-2">
          <span className="font-heading text-primary-foreground text-3xl font-semibold tracking-wide tabular-nums sm:text-4xl">
            {code}
          </span>
          <CopyButton
            value={code}
            label="Copy referral code"
            className="text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground"
          />
        </div>

        <p className="text-primary-foreground font-heading text-base font-semibold sm:text-lg">
          Earn ${bonusAmountUsd} per referral
        </p>

        <div className="border-primary-foreground/15 bg-primary-foreground/10 flex w-full items-center gap-2 rounded-xl border px-3 py-2.5">
          <span className="text-primary-foreground min-w-0 flex-1 truncate text-left text-xs font-medium">
            {link}
          </span>
          <CopyButton
            value={link}
            label="Copy referral link"
            className="text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground"
          />
        </div>

        <Button
          type="button"
          onClick={handleShareLink}
          variant="secondary"
          size="lg"
          className="bg-background text-ink hover:bg-background/90 w-full gap-1.5"
        >
          <ShareIcon className="size-4" aria-hidden="true" />
          Share your link
        </Button>
      </div>
    </div>
  );
}
