import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { ScoutApplyForm } from "@/components/scout/scout-apply-form";
import { adminFetch } from "@/lib/admin/admin-fetch";

export const metadata: Metadata = {
  title: "Scout Application",
};

interface ScoutApplicationStatusResponse {
  status: "not_applied" | "pending" | "approved" | "rejected";
  rejectionReason: string | null;
}

// Careers Part A/E: the application form itself. adminFetch is a plain
// bearer-token server fetch helper (name aside, it's not admin-specific -
// same getSession -> Authorization header sequence any authenticated
// GET needs), reused here rather than duplicating it.
export default async function ScoutApplyPage() {
  const status = await adminFetch<ScoutApplicationStatusResponse>(
    "/scout/application-status",
  );

  if (status?.status === "approved") {
    redirect("/scout");
  }

  return (
    <>
      <InnerPageHeader title="Become a Scout" backHref="/home" />
      <main className="mx-auto max-w-md px-4 pt-4 pb-16 sm:px-6">
        {status?.status === "pending" ? (
          <div className="border-border rounded-2xl border border-dashed px-4 py-12 text-center">
            <p className="text-ink text-base font-semibold">
              Application pending
            </p>
            <p className="text-ink/60 mt-2 text-sm">
              We&apos;re reviewing your application. You&apos;ll get a
              notification once there&apos;s a decision.
            </p>
          </div>
        ) : status?.status === "rejected" ? (
          <div className="border-border rounded-2xl border border-dashed px-4 py-12 text-center">
            <p className="text-ink text-base font-semibold">
              Application not approved
            </p>
            {status.rejectionReason ? (
              <p className="text-ink/60 mt-2 text-sm">
                {status.rejectionReason}
              </p>
            ) : null}
          </div>
        ) : (
          <ScoutApplyForm />
        )}
      </main>
    </>
  );
}
