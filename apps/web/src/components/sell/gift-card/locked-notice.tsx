import { GiftIcon } from "@heroicons/react/24/solid";

/**
 * Replaces the entire Sell Gift Cards flow (brand picker and the per-brand
 * sell form alike) while the gift card API isn't integrated yet. Rendered
 * at the page level rather than disabling the form, so a direct link to
 * /sell/gift-card/[brand]/[country] can't reach the real form either -
 * same dashed-border empty-state language as ReferralActivityList's
 * EmptyState, plus the "Coming Soon" pill already used for unlaunched
 * features elsewhere (see ComingSoonWidget).
 */
export function GiftCardLocked() {
  return (
    <div className="border-border text-ink/50 flex flex-col items-center gap-3 rounded-2xl border border-dashed px-4 py-14 text-center text-sm">
      <span className="bg-secondary text-ink/40 flex size-11 items-center justify-center rounded-full">
        <GiftIcon className="size-5" aria-hidden="true" />
      </span>
      <span className="bg-secondary text-ink/50 rounded-full px-2 py-0.5 text-[10px] font-medium">
        Coming Soon
      </span>
      <p className="max-w-xs">
        Selling gift cards isn&apos;t available yet. We&apos;re working on it -
        check back soon.
      </p>
    </div>
  );
}
