import type { ComponentType, SVGProps } from "react";
import {
  HomeIcon,
  UserGroupIcon,
  TrophyIcon,
  WalletIcon,
  BellIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  GiftIcon,
  MegaphoneIcon,
} from "@heroicons/react/24/solid";

export type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
};

// Mobile bottom nav. docs/context.md originally scoped this to exactly
// Home/Leaderboard/Assets; Earn was added as a fourth main tab so it gets
// the same always-visible placement rather than living behind an icon or
// a card link.
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/leaderboard", label: "Leaderboard", icon: TrophyIcon },
  { href: "/earn", label: "Earn", icon: GiftIcon },
  { href: "/assets", label: "Assets", icon: WalletIcon },
];

// Desktop sidebar nav. Referrals is its own standalone route (docs/context.md:
// "not a Leaderboard tab"), reachable directly here rather than only via a
// link/card on Leaderboard or a widget deep inside Home.
export const DESKTOP_NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/leaderboard", label: "Leaderboard", icon: TrophyIcon },
  { href: "/referrals", label: "Referrals", icon: UserGroupIcon },
  { href: "/earn", label: "Earn", icon: GiftIcon },
  { href: "/assets", label: "Assets", icon: WalletIcon },
  { href: "/notifications", label: "Notifications", icon: BellIcon },
  { href: "/settings", label: "Settings", icon: Cog6ToothIcon },
  { href: "/support", label: "Support", icon: ChatBubbleLeftRightIcon },
];

// Only shown for an approved scout_applications row (see AppLayout's
// isScout check) - not in the static arrays above, appended conditionally
// by SidebarNav/BottomNav instead.
export const SCOUT_NAV_ITEM: NavItem = {
  href: "/scout",
  label: "Scout",
  icon: MegaphoneIcon,
};
