import { adminFetch } from "@/lib/admin/admin-fetch";
import type { AdminScoutDayListItem } from "@/lib/admin/scout-days/types";
import { ScoutDayFilters } from "@/components/admin/scout-days/scout-day-filters";
import { ScoutDayRow } from "@/components/admin/scout-days/scout-day-row";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

// Scout Day Review queue (docs/database-schema.md's Careers / Scout program
// section, Part D2).
export default async function AdminScoutDaysPage({ searchParams }: PageProps) {
  const { status } = await searchParams;

  const query = new URLSearchParams();
  if (status) query.set("status", status);
  const queryString = query.toString();

  const days = await adminFetch<AdminScoutDayListItem[]>(
    `/admin/scout-days${queryString ? `?${queryString}` : ""}`,
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-ink text-lg font-semibold sm:text-xl">
          Scout Day Review
        </h1>
        <ScoutDayFilters />
      </div>

      {days === null ? (
        <p className="text-ink/60 text-sm">
          Couldn&apos;t load scout days. Try refreshing the page.
        </p>
      ) : days.length === 0 ? (
        <p className="border-border text-ink/50 rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
          No days match these filters.
        </p>
      ) : (
        <div className="flex flex-col">
          {days.map((day) => (
            <ScoutDayRow key={day.id} day={day} />
          ))}
        </div>
      )}
    </div>
  );
}
