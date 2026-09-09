import { adminFetch } from "@/lib/admin/admin-fetch";
import type { AdminScoutApplicationListItem } from "@/lib/admin/scout-applications/types";
import { ScoutApplicationFilters } from "@/components/admin/scout-applications/scout-application-filters";
import { ScoutApplicationRow } from "@/components/admin/scout-applications/scout-application-row";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

// Scout Applications queue (docs/database-schema.md's Careers / Scout
// program section, Part D1), same list/filter shape as Trade Review.
export default async function AdminScoutApplicationsPage({
  searchParams,
}: PageProps) {
  const { status } = await searchParams;

  const query = new URLSearchParams();
  if (status) query.set("status", status);
  const queryString = query.toString();

  const applications = await adminFetch<AdminScoutApplicationListItem[]>(
    `/admin/scout-applications${queryString ? `?${queryString}` : ""}`,
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-ink text-lg font-semibold sm:text-xl">
          Scout Applications
        </h1>
        <ScoutApplicationFilters />
      </div>

      {applications === null ? (
        <p className="text-ink/60 text-sm">
          Couldn&apos;t load applications. Try refreshing the page.
        </p>
      ) : applications.length === 0 ? (
        <p className="border-border text-ink/50 rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
          No applications match these filters.
        </p>
      ) : (
        <div className="flex flex-col">
          {applications.map((application) => (
            <ScoutApplicationRow
              key={application.id}
              application={application}
            />
          ))}
        </div>
      )}
    </div>
  );
}
