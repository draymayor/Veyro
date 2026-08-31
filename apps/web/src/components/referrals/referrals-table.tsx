import { UserGroupIcon } from "@heroicons/react/24/solid";
import type { ReferralTableRow } from "@/lib/referrals/data";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { findCountry } from "@/lib/countries";

interface ReferralsTableProps {
  rows: ReferralTableRow[];
}

function formatJoinedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Table view of a user's referrals (docs/context.md's Referrals page
 * section): referred user's own User ID (never their email, matching the
 * identifier format shown for a user on admin pages), joined date, deposit
 * status derived from bonus_paid_at, and country. Filterable above via
 * ReferralFilters.
 */
export function ReferralsTable({ rows }: ReferralsTableProps) {
  return (
    <section>
      <h2 className="text-ink font-heading mb-2 text-base font-medium">
        Your Referrals
      </h2>
      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="border-border overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-border text-ink/45 border-b text-xs font-medium">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-border/60 border-b last:border-0"
                >
                  <td className="text-ink px-4 py-3 font-medium">
                    {row.referredUserIdLabel}
                  </td>
                  <td className="text-ink/60 px-4 py-3">
                    {formatJoinedDate(row.joinedAt)}
                  </td>
                  <td className="text-ink/60 px-4 py-3">
                    {row.country
                      ? (findCountry(row.country)?.name ?? row.country)
                      : "N/A"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <StatusBadge
                      label={row.status === "success" ? "Success" : "Pending"}
                      tone={row.status === "success" ? "success" : "neutral"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="border-border text-ink/50 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
      <UserGroupIcon className="text-ink/30 size-6" aria-hidden="true" />
      <p>No referrals match this filter.</p>
    </div>
  );
}
