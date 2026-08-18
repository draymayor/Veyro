import type { LucideIcon } from "lucide-react";
import { Home, Trophy, Wallet, Bell, Settings } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Mobile bottom nav: exactly these three items, per docs/context.md.
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/assets", label: "Assets", icon: Wallet },
];

// Desktop sidebar nav: all five items.
export const DESKTOP_NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/assets", label: "Assets", icon: Wallet },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];
