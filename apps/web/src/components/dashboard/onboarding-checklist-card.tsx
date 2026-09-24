"use client";

import { useRouter } from "next/navigation";
import {
  CheckIcon,
  EnvelopeIcon,
  GiftIcon,
  BanknotesIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import type { OnboardingStep } from "@/lib/onboarding/data";

const STEP_HREF: Record<OnboardingStep["key"], string> = {
  verify_email: "/settings",
  claim_bonus: "/earn",
  first_deposit: "/deposit/crypto",
  set_pin: "/settings",
};

const STEP_DESCRIPTION: Record<OnboardingStep["key"], string> = {
  verify_email: "Confirm your email to secure your account.",
  claim_bonus: "Claim your share of the Earn bonus pool.",
  first_deposit: "Fund your wallet to start trading.",
  set_pin: "Add a PIN to protect your withdrawals.",
};

const STEP_ICON: Record<OnboardingStep["key"], typeof EnvelopeIcon> = {
  verify_email: EnvelopeIcon,
  claim_bonus: GiftIcon,
  first_deposit: BanknotesIcon,
  set_pin: LockClosedIcon,
};

/**
 * New-user checklist on Home (docs/database-schema.md's onboarding-checklist
 * proposal). Never shown once every step is complete - the parent page just
 * doesn't render it, see home/page.tsx - and cannot be dismissed early.
 */
export function OnboardingChecklistCard({
  steps,
}: {
  steps: OnboardingStep[];
}) {
  const router = useRouter();

  const completedCount = steps.filter((s) => s.completed).length;

  // Recomputed on every render straight from the `steps` prop (no local
  // state to go stale) - incomplete steps stay pinned at the start so they
  // never require horizontal scrolling to find, completed ones sink to the
  // end in the order they were finished. Array.prototype.sort is stable,
  // so ties keep their original relative order.
  const orderedSteps = [...steps].sort(
    (a, b) => Number(a.completed) - Number(b.completed),
  );

  return (
    <div className="border-border bg-card relative rounded-2xl border p-4 sm:p-5">
      <div>
        <p className="text-ink font-heading text-sm font-semibold">
          Complete your account
        </p>
        <p className="text-ink/50 text-xs">
          {completedCount} of {steps.length} complete
        </p>
      </div>

      <ul className="-mx-1 mt-3 flex snap-x scrollbar-none gap-3 overflow-x-auto px-1 pb-1">
        {orderedSteps.map((step) => {
          const Icon = STEP_ICON[step.key];
          return (
            <li key={step.key} className="w-36 shrink-0 snap-start">
              <button
                type="button"
                disabled={step.completed}
                onClick={() => router.push(STEP_HREF[step.key])}
                className="group border-border/60 bg-background hover:border-primary/40 disabled:hover:border-border/60 flex h-full w-full flex-col items-center gap-2.5 rounded-2xl border p-3 text-center transition-colors disabled:cursor-default"
              >
                <span className="relative">
                  <span
                    className={
                      step.completed
                        ? "bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full"
                        : "bg-ink/5 text-ink/60 group-hover:bg-primary/10 group-hover:text-primary flex size-12 items-center justify-center rounded-full transition-colors"
                    }
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  {step.completed ? (
                    <span className="bg-primary border-card absolute -right-0.5 -bottom-0.5 flex size-4.5 items-center justify-center rounded-full border-2">
                      <CheckIcon
                        className="size-2.5 text-white"
                        strokeWidth={3}
                        aria-hidden="true"
                      />
                    </span>
                  ) : null}
                </span>

                <span
                  className={
                    step.completed
                      ? "text-ink/50 text-xs font-semibold"
                      : "text-ink text-xs font-semibold"
                  }
                >
                  {step.label}
                </span>
                <span className="text-ink/45 line-clamp-2 text-[11px] leading-tight">
                  {STEP_DESCRIPTION[step.key]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
