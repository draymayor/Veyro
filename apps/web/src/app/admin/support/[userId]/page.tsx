import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { adminFetch } from "@/lib/admin/admin-fetch";
import type { AdminSupportThreadDetail } from "@/lib/admin/support/types";
import { SUPPORT_CATEGORIES } from "@/lib/support/categories";
import type { SupportCategory } from "@/lib/support/types";
import { AdminSupportThread } from "@/components/admin/support/admin-support-thread";

interface PageProps {
  params: Promise<{ userId: string }>;
}

const CATEGORY_LABEL: Record<SupportCategory, string> = Object.fromEntries(
  SUPPORT_CATEGORIES.map((option) => [option.value, option.label]),
) as Record<SupportCategory, string>;

function userLabel(displayName: string | null, userId: string): string {
  return displayName ?? `User ${userId.slice(0, 8)}`;
}

// Support Inbox thread view (docs/admin-guide.md): full message history
// plus reply and mark-resolved, live-updated via AdminSupportThread's
// Realtime subscription. This server component only supplies the initial
// snapshot, everything after that is client-driven.
export default async function AdminSupportThreadPage({ params }: PageProps) {
  const { userId } = await params;
  const thread = await adminFetch<AdminSupportThreadDetail>(
    `/admin/support/threads/${userId}`,
  );

  if (!thread) notFound();

  return (
    <div className="mx-auto flex max-w-2xl min-w-0 flex-col gap-4">
      <Link
        href="/admin/support"
        className="text-ink/60 hover:text-ink flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
        Support Inbox
      </Link>

      <div>
        <h1 className="font-heading text-ink text-lg font-semibold sm:text-xl">
          {userLabel(thread.display_name, thread.user_id)}
        </h1>
        <p className="text-ink/50 text-sm">
          {thread.email ?? "No email on file"}
        </p>
        <p className="text-ink/40 text-xs">
          {CATEGORY_LABEL[thread.category]} · {thread.subject}
        </p>
      </div>

      <AdminSupportThread userId={thread.user_id} initialThread={thread} />
    </div>
  );
}
