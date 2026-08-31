import type { ComponentType, SVGProps } from "react";
import {
  Squares2X2Icon,
  ClipboardDocumentCheckIcon,
  TableCellsIcon,
  BanknotesIcon,
  ChartBarIcon,
  ArrowUpCircleIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
} from "@heroicons/react/24/solid";

export type AdminNavIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface AdminNavItem {
  href: string;
  label: string;
  icon: AdminNavIcon;
}

// Route list for the admin shell nav, per docs/admin-guide.md's sections.
// Dashboard uses an exact-path match for its active state; every other
// item uses a prefix match for its own sub-routes.
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: Squares2X2Icon },
  {
    href: "/admin/trades",
    label: "Trade Review",
    icon: ClipboardDocumentCheckIcon,
  },
  { href: "/admin/transactions", label: "Transactions", icon: TableCellsIcon },
  {
    href: "/admin/deposits/manual",
    label: "Manual Deposit",
    icon: BanknotesIcon,
  },
  { href: "/admin/rates", label: "Rate Management", icon: ChartBarIcon },
  {
    href: "/admin/withdrawals",
    label: "Payout Processing",
    icon: ArrowUpCircleIcon,
  },
  {
    href: "/admin/support",
    label: "Support Inbox",
    icon: ChatBubbleLeftRightIcon,
  },
  { href: "/admin/users", label: "User Management", icon: UsersIcon },
];
