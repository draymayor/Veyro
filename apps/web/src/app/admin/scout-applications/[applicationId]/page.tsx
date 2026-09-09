import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { adminFetch } from "@/lib/admin/admin-fetch";
import type { AdminScoutApplicationListItem } from "@/lib/admin/scout-applications/types";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { tradeUserLabel, formatDateTime } from "@/lib/admin/trades/display";
import { ScoutApplicationActions } from "@/components/admin/scout-applications/scout-application-actions";
import { scoutPlatformLabel } from "@/lib/scout/platforms";

interface PageProps {
  params: Promise<{ applicationId: string }>;
}

const STATUS_TONE: Record<
  AdminScoutApplicationListItem["status"],
  { label: string; tone: "success" | "neutral" | "error" }
> = {
  pending: { label: "Pending", tone: "neutral" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "error" },
};

export default async function AdminScoutApplicationDetailPage({
  params,
}: PageProps) {
  const { applicationId } = await params;
  const application = await adminFetch<AdminScoutApplicationListItem>(
    `/admin/scout-applications/${applicationId}`,
  );

  if (!application) notFound();

  const { label, tone } = STATUS_TONE[application.status];

  return (
    <div className="mx-auto flex max-w-2xl min-w-0 flex-col gap-5">
      <Link
        href="/admin/scout-applications"
        className="text-ink/60 hover:text-ink flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
        Scout Applications
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-ink text-lg font-semibold sm:text-xl">
          {application.full_name ??
            tradeUserLabel(application.user_display_name, application.user_id)}
        </h1>
        <StatusBadge label={label} tone={tone} />
      </div>

      {application.status === "rejected" && application.rejection_reason ? (
        <div className="bg-secondary rounded-2xl p-4">
          <p className="text-ink/60 text-xs font-medium">Rejection reason</p>
          <p className="text-ink mt-1 text-sm">
            {application.rejection_reason}
          </p>
        </div>
      ) : null}

      <Section title="Applicant">
        <Row label="Full name" value={application.full_name ?? "-"} />
        <Row label="Applied" value={formatDateTime(application.applied_at)} />
      </Section>

      <Section title="Platforms">
        {application.platforms.length === 0 && !application.other_platform ? (
          <p className="text-ink/50 text-sm">No platforms provided.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {application.platforms.map((p) => (
              <Row
                key={p.platform}
                label={scoutPlatformLabel(p.platform)}
                value={p.handle}
              />
            ))}
            {application.other_platform ? (
              <Row
                label={`Other: ${application.other_platform}`}
                value={application.other_handle ?? "-"}
              />
            ) : null}
          </div>
        )}
      </Section>

      <Section title="Why / posting style">
        <p className="text-ink text-sm leading-relaxed whitespace-pre-wrap">
          {application.motivation ?? "-"}
        </p>
      </Section>

      <Section title="Commitment">
        <Row
          label="Can commit"
          value={
            application.can_commit === null
              ? "-"
              : application.can_commit
                ? "Yes"
                : "No"
          }
        />
        {application.commitment_note ? (
          <p className="text-ink/70 mt-1 text-sm leading-relaxed whitespace-pre-wrap">
            {application.commitment_note}
          </p>
        ) : null}
      </Section>

      <ScoutApplicationActions
        applicationId={application.id}
        status={application.status}
      />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border-border rounded-2xl border p-4 sm:p-5">
      <h2 className="text-ink/60 mb-2 text-xs font-semibold tracking-wide uppercase">
        {title}
      </h2>
      <div className="flex flex-col gap-1.5">{children}</div>
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
