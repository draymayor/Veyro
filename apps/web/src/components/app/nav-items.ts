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

// Appended to MOBILE_NAV_ITEMS only for an approved scout (BottomNav's
// isScout prop) - an approved scout needs quick daily access to submit
// links, same as before this route was merged with the explainer, so this
// isn't gated behind the /home discovery card the way pre-approval access
// is (ScoutBanner). Desktop doesn't need this: DESKTOP_NAV_ITEMS already
// lists Scout unconditionally since the sidebar has room.
export const SCOUT_MOBILE_NAV_ITEM: NavItem = {
  href: "/scout",
  label: "Scout",
  icon: MegaphoneIcon,
};

// Desktop sidebar nav. Referrals is its own standalone route (docs/context.md:
// "not a Leaderboard tab"), reachable directly here rather than only via a
// link/card on Leaderboard or a widget deep inside Home. Scout is always
// visible (not gated on approval) - /scout itself shows the
// requirements/apply explainer for a non-scout and the working dashboard
// once approved, so the nav item has somewhere real to send anyone.
export const DESKTOP_NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/leaderboard", label: "Leaderboard", icon: TrophyIcon },
  { href: "/referrals", label: "Referrals", icon: UserGroupIcon },
  { href: "/earn", label: "Earn", icon: GiftIcon },
  { href: "/scout", label: "Scout", icon: MegaphoneIcon },
  { href: "/assets", label: "Assets", icon: WalletIcon },
  { href: "/notifications", label: "Notifications", icon: BellIcon },
  { href: "/settings", label: "Settings", icon: Cog6ToothIcon },
  { href: "/support", label: "Support", icon: ChatBubbleLeftRightIcon },
];
