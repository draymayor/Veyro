import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { ScoutLinkForm } from "@/components/scout/scout-link-form";
import { ScoutPastDays } from "@/components/scout/scout-past-days";
import { adminFetch } from "@/lib/admin/admin-fetch";
import type { ScoutDashboard } from "@/lib/scout/types";

export const metadata: Metadata = {
  title: "Scout",
};

// Scout dashboard (Part B): only reachable by an approved scout - the
// backend's GET /scout/dashboard 403s for anyone else (ScoutApprovedGuard),
// which this page treats the same as "not a scout" and bounces to the
// application entry point rather than showing a broken/empty dashboard.
export default async function ScoutDashboardPage() {
  const dashboard = await adminFetch<ScoutDashboard>("/scout/dashboard");

  if (!dashboard) {
    redirect("/scout/apply");
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
