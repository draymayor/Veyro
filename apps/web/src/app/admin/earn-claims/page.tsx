import { adminFetch } from "@/lib/admin/admin-fetch";
import type { AdminEarnClaimListItem } from "@/lib/admin/earn-claims/types";
import { EarnClaimsFilter } from "@/components/admin/earn-claims/earn-claims-filter";
import { EarnClaimRow } from "@/components/admin/earn-claims/earn-claim-row";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

// Real usage monitoring for the $50,000 Earn bonus pool
// (docs/database-schema.md's earn_bonus_claims section). Read-only: every
// state change (claim/unlock/pay/expire) happens server-side via
// EarnService, never from an admin action here.
export default async function AdminEarnClaimsPage({ searchParams }: PageProps) {
  const { status } = await searchParams;

  const query = new URLSearchParams();
  if (status) query.set("status", status);
  const queryString = query.toString();

  const claims = await adminFetch<AdminEarnClaimListItem[]>(
    `/admin/earn-claims${queryString ? `?${queryString}` : ""}`,
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-ink text-lg font-semibold sm:text-xl">
          Earn Bonus Claims
        </h1>
        <EarnClaimsFilter />
      </div>

      {claims === null ? (
        <p className="text-ink/60 text-sm">
          Couldn&apos;t load Earn bonus claims. Try refreshing the page.
        </p>
      ) : claims.length === 0 ? (
        <p className="border-border text-ink/50 rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
          No claims match these filters.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {claims.map((claim) => (
            <EarnClaimRow key={claim.id} claim={claim} />
          ))}
        </div>
      )}
    </div>
  );
}
