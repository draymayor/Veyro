import type { ReactNode } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/require-admin";
import { AdminShell } from "@/components/admin/admin-shell";

// Internal tool, never indexed, same reasoning as the (app) group's layout.
export const metadata: Metadata = {
  title: "Veyro Admin",
  robots: { index: false, follow: false },
};

// requireAdmin verifies the session and admin role server-side (via the
// backend's guarded GET /admin/session, checking users.is_admin), never a
// client-side-only check, per docs/context.md's Admin Authentication
// Architecture.
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

  return <AdminShell>{children}</AdminShell>;
}
