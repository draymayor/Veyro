"use client";

import { useRouter } from "next/navigation";
import {
  Cog6ToothIcon,
  ChevronRightIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsRow } from "@/components/settings/settings-row";

const CHEVRON = (
  <ChevronRightIcon className="text-ink/30 size-4" aria-hidden="true" />
);

/**
 * Settings and Support have no mobile entry point elsewhere: the mobile
 * top bar only carries Profile, Notifications, and Support icons (Settings
 * isn't among them), and the bottom nav is capped at three items (Home,
 * Leaderboard, Assets), per docs/context.md. The desktop sidebar already
 * lists both directly, so this is mobile-only, same as BottomNav's own
 * `md:hidden`. Reuses SettingsSection/SettingsRow (the row-as-navigation
 * pattern already used throughout Settings and Payment Methods) rather
 * than inventing a new link-list style for this one section.
 */
export function ProfileMoreLinks() {
  const router = useRouter();

  return (
    <div className="md:hidden">
      <SettingsSection title="More">
        <SettingsRow
          icon={Cog6ToothIcon}
          label="Settings"
          onClick={() => router.push("/settings")}
          right={CHEVRON}
        />
        <SettingsRow
          icon={ChatBubbleLeftRightIcon}
          label="Support"
          onClick={() => router.push("/support")}
          right={CHEVRON}
        />
      </SettingsSection>
    </div>
  );
}
