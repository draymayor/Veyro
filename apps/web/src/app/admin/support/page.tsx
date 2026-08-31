import { adminFetch } from "@/lib/admin/admin-fetch";
import type { AdminSupportThreadListItem } from "@/lib/admin/support/types";
import { SupportFilters } from "@/components/admin/support/support-filters";
import { SupportThreadRow } from "@/components/admin/support/support-thread-row";

interface PageProps {
  searchParams: Promise<{ status?: string; category?: string }>;
}

// Support Inbox (docs/admin-guide.md): categorized ticket list, filterable
// by status and category, backed by real GET /admin/support/threads. Same
// adminFetch null-vs-empty-array distinction as every other admin list.
export default async function AdminSupportPage({ searchParams }: PageProps) {
  const { status, category } = await searchParams;

  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (category) query.set("category", category);
  const queryString = query.toString();

  const threads = await adminFetch<AdminSupportThreadListItem[]>(
    `/admin/support/threads${queryString ? `?${queryString}` : ""}`,
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-ink text-lg font-semibold sm:text-xl">
          Support Inbox
        </h1>
        <SupportFilters />
      </div>

      {threads === null ? (
        <p className="text-ink/60 text-sm">
          Couldn&apos;t load support threads. Try refreshing the page.
        </p>
      ) : threads.length === 0 ? (
        <p className="border-border text-ink/50 rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
          No support threads match these filters.
        </p>
      ) : (
        <div className="flex flex-col">
          {threads.map((thread) => (
            <SupportThreadRow key={thread.user_id} thread={thread} />
          ))}
        </div>
      )}
    </div>
  );
}
