import type { ComponentType, SVGProps } from "react";
import {
  HomeIcon,
  UserGroupIcon,
  TrophyIcon,
  WalletIcon,
  BellIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";

export type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
};

// Mobile bottom nav: exactly these three items, per docs/context.md.
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/leaderboard", label: "Leaderboard", icon: TrophyIcon },
  { href: "/assets", label: "Assets", icon: WalletIcon },
];

// Desktop sidebar nav. Referrals is its own standalone route (docs/context.md:
// "not a Leaderboard tab"), reachable directly here rather than only via a
// link/card on Leaderboard or a widget deep inside Home.
export const DESKTOP_NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/leaderboard", label: "Leaderboard", icon: TrophyIcon },
  { href: "/referrals", label: "Referrals", icon: UserGroupIcon },
  { href: "/assets", label: "Assets", icon: WalletIcon },
  { href: "/notifications", label: "Notifications", icon: BellIcon },
  { href: "/settings", label: "Settings", icon: Cog6ToothIcon },
  { href: "/support", label: "Support", icon: ChatBubbleLeftRightIcon },
];
