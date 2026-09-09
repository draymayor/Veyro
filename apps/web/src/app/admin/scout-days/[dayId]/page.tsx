import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { adminFetch } from "@/lib/admin/admin-fetch";
import type { AdminScoutDayDetail } from "@/lib/admin/scout-days/types";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { tradeUserLabel, formatDateTime } from "@/lib/admin/trades/display";
import { ScoutLinkReviewRow } from "@/components/admin/scout-days/scout-link-review-row";
import { ScoutDayActions } from "@/components/admin/scout-days/scout-day-actions";

interface PageProps {
  params: Promise<{ dayId: string }>;
}

const STATUS_TONE = {
  in_progress: { label: "In Progress", tone: "neutral" as const },
  pending_review: { label: "Pending Review", tone: "neutral" as const },
  approved: { label: "Approved", tone: "success" as const },
  rejected: { label: "Rejected", tone: "error" as const },
};

export default async function AdminScoutDayDetailPage({ params }: PageProps) {
  const { dayId } = await params;
  const day = await adminFetch<AdminScoutDayDetail>(
    `/admin/scout-days/${dayId}`,
  );

  if (!day) notFound();

  const { label, tone } = STATUS_TONE[day.status];

  return (
    <div className="mx-auto flex max-w-2xl min-w-0 flex-col gap-5">
      <Link
        href="/admin/scout-days"
        className="text-ink/60 hover:text-ink flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
        Scout Day Review
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-ink text-lg font-semibold sm:text-xl">
          {tradeUserLabel(day.user_display_name, day.user_id)}
        </h1>
        <StatusBadge label={label} tone={tone} />
      </div>

      {day.status === "rejected" && day.rejection_reason ? (
        <div className="bg-secondary rounded-2xl p-4">
          <p className="text-ink/60 text-xs font-medium">Rejection reason</p>
          <p className="text-ink mt-1 text-sm">{day.rejection_reason}</p>
        </div>
      ) : null}

      <div className="bg-card border-border rounded-2xl border p-4 sm:p-5">
        <h2 className="text-ink/60 mb-2 text-xs font-semibold tracking-wide uppercase">
          Day
        </h2>
        <div className="flex flex-col gap-1.5">
          <Row label="Opened" value={formatDateTime(day.opened_at)} />
          {day.closed_at ? (
            <Row label="Closed" value={formatDateTime(day.closed_at)} />
          ) : null}
          <Row label="Links submitted" value={String(day.links.length)} />
          {day.payout_amount_usd !== null ? (
            <Row label="Payout" value={`$${day.payout_amount_usd}`} />
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-ink/60 text-xs font-semibold tracking-wide uppercase">
          Links
        </h2>
        {day.links.map((link) => (
          <ScoutLinkReviewRow key={link.id} dayId={day.id} link={link} />
        ))}
      </div>

      <ScoutDayActions
        dayId={day.id}
        status={day.status}
        linkStatuses={day.links.map((l) => l.link_status)}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink/50 text-sm">{label}</span>
      <span className="text-ink text-right text-sm font-medium break-all">
        {value}
      </span>
    </div>
  );
}
