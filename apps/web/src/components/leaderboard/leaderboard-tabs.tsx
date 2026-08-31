"use client";

import { Tabs } from "radix-ui";
import type { AppUser } from "@/components/app/app-user";
import { TradingPanel } from "./trading-panel";
import { ReferralsPanel } from "./referrals-panel";

const TAB_TRIGGER =
  "text-ink/50 data-[state=active]:bg-card data-[state=active]:text-ink data-[state=active]:shadow-sm rounded-full px-4 py-1.5 text-sm font-medium transition-colors";

interface LeaderboardTabsProps {
  currentUser: AppUser;
}

/**
 * Mobile-only tab switcher between the Trading and Referrals panels
 * (docs/context.md: desktop shows both side by side instead, see
 * LeaderboardPage's lg:grid). Same tab pill pattern as RatesSection's
 * Crypto/Gift Cards tabs, not a new tab component.
 */
export function LeaderboardTabs({ currentUser }: LeaderboardTabsProps) {
  return (
    <Tabs.Root defaultValue="trading" className="lg:hidden">
      <Tabs.List className="bg-secondary/70 mb-4 inline-flex gap-1 rounded-full p-1">
        <Tabs.Trigger value="trading" className={TAB_TRIGGER}>
          Trading
        </Tabs.Trigger>
        <Tabs.Trigger value="referrals" className={TAB_TRIGGER}>
          Referrals
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="trading">
        <TradingPanel currentUser={currentUser} />
      </Tabs.Content>
      <Tabs.Content value="referrals">
        <ReferralsPanel currentUser={currentUser} />
      </Tabs.Content>
    </Tabs.Root>
  );
}
