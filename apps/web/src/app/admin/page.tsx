import { redirect } from "next/navigation";

// Bare /admin has no content of its own; the dashboard home lives at
// /admin/dashboard (see ADMIN_ENTRY_PATH in lib/auth/post-auth-redirect.ts,
// the single redirect target every admin-routing check points at).
export default function AdminRootPage() {
  redirect("/admin/dashboard");
}
