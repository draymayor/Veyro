import type { Metadata } from "next";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { ScoutLinkForm } from "@/components/scout/scout-link-form";
import { ScoutPastDays } from "@/components/scout/scout-past-days";
import { ScoutExplainer } from "@/components/scout/scout-explainer";
import { adminFetch } from "@/lib/admin/admin-fetch";
import { getScoutProgramDetails } from "@/lib/scout/get-program-details";
import type {
  ScoutApplicationStatusResponse,
  ScoutDashboard,
} from "@/lib/scout/types";

export const metadata: Metadata = {
  title: "Scout",
};

// Single in-app Scout entry point (Parts A/E and B merged into one route):
// a logged-in user who isn't an approved scout sees the live
// requirements/earnings explainer with an inline Apply form
// (ScoutExplainer); once approved, this same route renders the working
// dashboard below instead. /scout/apply now just redirects here for any
// old links/bookmarks.
export default async function ScoutPage() {
  const status = await adminFetch<ScoutApplicationStatusResponse>(
    "/scout/application-status",
  );

  if (status?.status !== "approved") {
    const programDetails = await getScoutProgramDetails();
    return (
      <>
        <InnerPageHeader title="Scout" backHref="/home" />
        <main className="mx-auto max-w-md px-4 pt-4 pb-16 sm:px-6">
          <ScoutExplainer
            programDetails={programDetails}
            status={status?.status ?? "not_applied"}
            rejectionReason={status?.rejectionReason ?? null}
          />
        </main>
      </>
    );
  }

  const dashboard = await adminFetch<ScoutDashboard>("/scout/dashboard");

  // Approved per application-status but the dashboard call itself failed
  // (network/API hiccup) - fall back to the explainer's shape rather than
  // rendering a broken/empty dashboard, same defensive posture the old
  // page had for the null case.
  if (!dashboard) {
    const programDetails = await getScoutProgramDetails();
    return (
      <>
        <InnerPageHeader title="Scout" backHref="/home" />
        <main className="mx-auto max-w-md px-4 pt-4 pb-16 sm:px-6">
          <ScoutExplainer
            programDetails={programDetails}
            status="pending"
            rejectionReason={null}
          />
        </main>
      </>
    );
  }

  const {
    minLinksPerDay,
    dailyRateUsd,
    approvedDays,
    requiredDays,
    maxPendingDays,
    blocked,
    currentDay,
    pastDays,
  } = dashboard;

  const approvedLinkCount = currentDay?.approvedLinkCount ?? 0;
  const progressPct = Math.min((approvedLinkCount / minLinksPerDay) * 100, 100);

  return (
    <>
      <InnerPageHeader title="Scout" backHref="/home" />
      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 pt-4 pb-16 sm:px-6">
        <div className="border-border bg-card rounded-2xl border p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-ink text-sm font-medium">Paid days</p>
            <p className="text-ink text-lg font-semibold tabular-nums">
              {approvedDays}/{requiredDays}
            </p>
          </div>
          <div className="bg-secondary mt-2 h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{
                width: `${Math.min((approvedDays / requiredDays) * 100, 100)}%`,
              }}
            />
          </div>
          <p className="text-ink/50 mt-2 text-xs">
            ${dailyRateUsd}/day, paid to your wallet as Scout Program income.
          </p>
        </div>

        {blocked ? (
          <div className="bg-error/10 border-error/20 rounded-2xl border p-4">
            <p className="text-error text-sm font-medium">
              Veyro needs to review your existing {maxPendingDays} completed
              days before you can start a new one.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <p className="text-ink text-sm font-medium">
                {currentDay ? "Current day" : "Start a new day"}
              </p>
              <p className="text-ink/60 text-xs tabular-nums">
                {approvedLinkCount}/{minLinksPerDay}+ approved
              </p>
            </div>
            <div className="bg-secondary h-1.5 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-ink/50 text-xs">
              {minLinksPerDay}+ approved links needed, with every submission
              reviewed - a rejected link needs an approved replacement. Submit
              as many as you like - the day closes for review once all of that
              is true AND 24 hours have passed since it opened.
            </p>
            <ScoutLinkForm disabled={blocked} />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-ink text-sm font-medium">Past days</p>
          <ScoutPastDays days={pastDays} />
        </div>
      </main>
    </>
  );
}
