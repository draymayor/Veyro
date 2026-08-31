import Link from "next/link";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  userLabel,
  accountStatusInfo,
  formatDateTime,
} from "@/lib/admin/users/display";
import type { AdminUserListItem } from "@/lib/admin/users/types";

export function UserRow({ user }: { user: AdminUserListItem }) {
  const { label, tone } = accountStatusInfo(user.account_status);

  return (
    <Link
      href={`/admin/users/${user.id}`}
      className="hover:bg-secondary/60 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors sm:gap-4 sm:px-3"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-ink truncate text-sm font-medium">
            {userLabel(user.display_name, user.id)}
          </span>
          {user.withdrawals_suspended ? (
            <span className="bg-error/15 text-error shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium">
              Withdrawals suspended
            </span>
          ) : null}
        </div>
        <p className="text-ink/50 truncate text-xs">
          {user.email ?? "No email on file"}
        </p>
        <p className="text-ink/35 text-xs">
          Joined {formatDateTime(user.created_at)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge label={label} tone={tone} />
        <span className="text-ink/40 text-[11px]">{user.country ?? "-"}</span>
      </div>
    </Link>
  );
}
