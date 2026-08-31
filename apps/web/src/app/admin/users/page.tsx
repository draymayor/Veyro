import { adminFetch } from "@/lib/admin/admin-fetch";
import type { AdminUserListItem } from "@/lib/admin/users/types";
import { UserFilters } from "@/components/admin/users/user-filters";
import { UserRow } from "@/components/admin/users/user-row";

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string }>;
}

// User Management (docs/admin-guide.md): full user list, searchable by
// name/email/id and filterable by account status, backed by real
// GET /admin/users. Same adminFetch null-vs-empty-array distinction as
// every other admin list, so a genuinely empty result never reads as an
// error.
export default async function AdminUsersPage({ searchParams }: PageProps) {
  const { search, status } = await searchParams;

  const query = new URLSearchParams();
  if (search) query.set("search", search);
  if (status) query.set("status", status);
  const queryString = query.toString();

  const users = await adminFetch<AdminUserListItem[]>(
    `/admin/users${queryString ? `?${queryString}` : ""}`,
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-ink text-lg font-semibold sm:text-xl">
          User Management
        </h1>
        <UserFilters />
      </div>

      {users === null ? (
        <p className="text-ink/60 text-sm">
          Couldn&apos;t load users. Try refreshing the page.
        </p>
      ) : users.length === 0 ? (
        <p className="border-border text-ink/50 rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
          No users match these filters.
        </p>
      ) : (
        <div className="flex flex-col">
          {users.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}
