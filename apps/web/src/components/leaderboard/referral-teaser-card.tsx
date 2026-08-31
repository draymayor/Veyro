import Link from "next/link";
import { CopyButton } from "@/components/dashboard/copy-button";
import { Button } from "@/components/ui/button";
import { OrbitRings } from "@/components/home/orbit-rings";

interface ReferralTeaserCardProps {
  /** Read from platform_settings where key = 'referral_bonus_usd' (docs/database-schema.md), never hardcoded. */
  bonusAmountUsd: number;
  referralCount: number;
  link: string;
}

/**
 * Compact card surfacing the viewer's own referral link and count, with
 * a link out to the standalone Referrals page (docs/context.md: not a
 * Leaderboard tab, its own route). Reuses the same terracotta CTA-banner
 * treatment and OrbitRings decoration already used for promotional cards
 * on the public site, rather than inventing a new visual language just
 * for this card. The link itself sits in a bordered field, the same
 * copyable-value pattern the crypto deposit-address screen uses, rather
 * than a plain line of text, so it visually reads as "the thing you
 * share," not just a caption.
 */
export function ReferralTeaserCard({
  bonusAmountUsd,
  referralCount,
  link,
}: ReferralTeaserCardProps) {
  return (
    <div className="bg-primary relative overflow-hidden rounded-2xl p-4 sm:p-5">
      <OrbitRings
        className="text-background pointer-events-none absolute top-1/2 left-0 size-64 -translate-y-1/2 opacity-50 sm:size-72"
        stroke="currentColor"
        dot="currentColor"
      />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-primary-foreground font-heading text-base font-semibold sm:text-lg">
              Earn ${bonusAmountUsd} per referral
            </p>
            <p className="text-primary-foreground/60 mt-0.5 text-xs">
              {referralCount} referrals so far
            </p>
          </div>
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="bg-background text-ink hover:bg-background/90 shrink-0 rounded-full"
          >
            <Link href="/referrals">View Referrals</Link>
          </Button>
        </div>

        <div className="border-primary-foreground/15 bg-primary-foreground/10 flex items-center gap-2 rounded-xl border px-3 py-2">
          <span className="text-primary-foreground min-w-0 flex-1 truncate text-xs font-medium">
            {link}
          </span>
          <CopyButton
            value={link}
            label="Copy referral link"
            className="text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground"
          />
        </div>
      </div>
    </div>
  );
}
