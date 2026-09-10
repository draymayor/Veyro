"use client";

import { Accordion } from "radix-ui";
import { ChevronDown } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { ScoutPastDay, ScoutPastDayLink } from "@/lib/scout/types";

const STATUS_TONE = {
  pending_review: { label: "Pending review", tone: "neutral" as const },
  approved: { label: "Approved", tone: "success" as const },
  rejected: { label: "Rejected", tone: "error" as const },
};

const LINK_STATUS_TONE: Record<
  ScoutPastDayLink["link_status"],
  { label: string; tone: "success" | "neutral" | "error" }
> = {
  pending: { label: "Pending", tone: "neutral" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "error" },
};

export function ScoutPastDays({ days }: { days: ScoutPastDay[] }) {
  if (days.length === 0) {
    return (
      <p className="text-ink/50 text-sm">
        No completed days yet. Submissions to your first day above will show
        here once it closes.
      </p>
    );
  }

  return (
    <Accordion.Root type="single" collapsible className="flex flex-col gap-2">
      {days.map((day) => {
        const { label, tone } = STATUS_TONE[day.status];
        return (
          <Accordion.Item
            key={day.id}
            value={day.id}
            className="border-border overflow-hidden rounded-xl border"
          >
            <Accordion.Header>
              <Accordion.Trigger className="group flex w-full items-start justify-between gap-3 p-3 text-left">
                <div className="min-w-0">
                  <p className="text-ink text-sm font-medium">
                    {new Date(day.opened_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-ink/50 text-xs">
                    {day.links.length} link{day.links.length === 1 ? "" : "s"}
                  </p>
                  {day.status === "rejected" && day.rejection_reason ? (
                    <p className="text-error mt-1 text-xs">
                      {day.rejection_reason}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge label={label} tone={tone} />
                  <ChevronDown
                    className="text-ink/40 size-4 shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-180"
                    aria-hidden="true"
                  />
                </div>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden motion-reduce:!animate-none">
              <div className="border-border flex flex-col gap-2 border-t p-3">
                {day.links.map((link) => {
                  const linkStatus = LINK_STATUS_TONE[link.link_status];
                  return (
                    <div
                      key={link.id}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-ink/80 truncate text-xs break-all">
                          {link.url}
                        </p>
                        {link.platform ? (
                          <p className="text-ink/40 text-[11px]">
                            {link.platform}
                          </p>
                        ) : null}
                        {link.link_status === "rejected" &&
                        link.rejection_reason ? (
                          <p className="text-error mt-0.5 text-[11px]">
                            {link.rejection_reason}
                          </p>
                        ) : null}
                      </div>
                      <StatusBadge
                        label={linkStatus.label}
                        tone={linkStatus.tone}
                      />
                    </div>
                  );
                })}
              </div>
            </Accordion.Content>
          </Accordion.Item>
        );
      })}
    </Accordion.Root>
  );
}
