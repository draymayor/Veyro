"use client";

import { useState } from "react";
import { Banknote, Link2, CalendarCheck } from "lucide-react";
import { ScoutApplyForm } from "./scout-apply-form";
import { Button } from "@/components/ui/button";
import type { ScoutProgramDetails } from "@/lib/scout/types";

interface ScoutExplainerProps {
  programDetails: ScoutProgramDetails | null;
  status: "not_applied" | "pending" | "rejected";
  rejectionReason: string | null;
}

/**
 * Non-scout view of /scout (Part A/E merged into the app itself, not the
 * public /careers page): requirements/earnings shown live from
 * programDetails (GET /scout/program-details, same platform_settings
 * getDashboard reads for an approved scout - never a hardcoded number),
 * with an Apply button that reveals the existing ScoutApplyForm inline
 * rather than navigating to a separate route. Pending/rejected states
 * short-circuit before the button, matching what the old standalone
 * /scout/apply page showed for those statuses.
 */
export function ScoutExplainer({
  programDetails,
  status,
  rejectionReason,
}: ScoutExplainerProps) {
  const [applying, setApplying] = useState(false);

  if (status === "pending") {
    return (
      <div className="border-border rounded-2xl border border-dashed px-4 py-12 text-center">
        <p className="text-ink text-base font-semibold">Application pending</p>
        <p className="text-ink/60 mt-2 text-sm">
          We&apos;re reviewing your application. You&apos;ll get a notification
          once there&apos;s a decision.
        </p>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="border-border rounded-2xl border border-dashed px-4 py-12 text-center">
        <p className="text-ink text-base font-semibold">
          Application not approved
        </p>
        {rejectionReason ? (
          <p className="text-ink/60 mt-2 text-sm">{rejectionReason}</p>
        ) : null}
      </div>
    );
  }

  if (applying) {
    return <ScoutApplyForm />;
  }

  const details = [
    programDetails
      ? {
          icon: Banknote,
          title: `$${programDetails.dailyRateUsd} per paid day`,
          copy: "Credited straight to your Veyro wallet as Scout Program income, alongside your regular balance.",
        }
      : null,
    programDetails
      ? {
          icon: Link2,
          title: `${programDetails.minLinksPerDay} links to close a day`,
          copy: `Submit at least ${programDetails.minLinksPerDay} posts or comments recruiting Scouts or Veyro users to close out a paid day.`,
        }
      : null,
    programDetails
      ? {
          icon: CalendarCheck,
          title: `${programDetails.requiredPaidDays} paid days to withdraw`,
          copy: `Scout earnings become withdrawable once you've completed ${programDetails.requiredPaidDays} approved paid days. Your regular balance is never affected.`,
        }
      : null,
  ].filter((detail): detail is NonNullable<typeof detail> => detail !== null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-ink text-lg font-semibold">
          Become a Scout
        </h2>
        <p className="text-ink/60 text-sm">
          Recruit new Scouts and Veyro users across your social platforms and
          get paid for every day you meet the requirements.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {details.map((detail) => (
          <div
            key={detail.title}
            className="border-border bg-card flex items-start gap-3 rounded-2xl border p-4"
          >
            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
              <detail.icon className="size-4.5" />
            </span>
            <div>
              <p className="text-ink text-sm font-medium">{detail.title}</p>
              <p className="text-ink/60 mt-1 text-xs">{detail.copy}</p>
            </div>
          </div>
        ))}
      </div>

      <Button size="lg" className="w-full" onClick={() => setApplying(true)}>
        Apply to be a Scout
      </Button>
    </div>
  );
}
