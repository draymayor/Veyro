import { StatusBadge } from "@/components/dashboard/status-badge";
import type { ScoutPastDay } from "@/lib/scout/types";

const STATUS_TONE = {
  pending_review: { label: "Pending review", tone: "neutral" as const },
  approved: { label: "Approved", tone: "success" as const },
  rejected: { label: "Rejected", tone: "error" as const },
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
    <div className="flex flex-col gap-2">
      {days.map((day) => {
        const { label, tone } = STATUS_TONE[day.status];
        return (
          <div
            key={day.id}
            className="border-border flex items-start justify-between gap-3 rounded-xl border p-3"
          >
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
            <StatusBadge label={label} tone={tone} />
          </div>
        );
      })}
    </div>
  );
}
