"use client";

import { useState } from "react";
import {
  ArrowsRightLeftIcon,
  BanknotesIcon,
  UserGroupIcon,
  UserCircleIcon,
} from "@heroicons/react/24/solid";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsRow } from "@/components/settings/settings-row";
import { ToggleSwitch } from "@/components/settings/toggle-switch";
import {
  NOTIFICATION_PREFERENCES,
  type NotificationCategory,
} from "@/lib/settings/data";

const CATEGORY_ICON: Record<NotificationCategory, typeof ArrowsRightLeftIcon> =
  {
    trades: ArrowsRightLeftIcon,
    wallet: BanknotesIcon,
    referrals: UserGroupIcon,
    account: UserCircleIcon,
  };

/**
 * One toggle per notifications.category value (docs/database-schema.md),
 * so preference is scoped exactly the way notification rows already are
 * everywhere else in the app. Local state only, no real preferences
 * table write yet, structured (one row per category) so a real save call
 * can replace each onCheckedChange without changing this layout.
 */
export function NotificationsSection() {
  const [preferences, setPreferences] = useState(NOTIFICATION_PREFERENCES);

  function toggle(category: NotificationCategory, enabled: boolean) {
    setPreferences((prev) =>
      prev.map((pref) =>
        pref.category === category ? { ...pref, enabled } : pref,
      ),
    );
  }

  return (
    <SettingsSection title="Notifications">
      {preferences.map((pref) => (
        <SettingsRow
          key={pref.category}
          icon={CATEGORY_ICON[pref.category]}
          label={pref.label}
          description={pref.description}
          right={
            <ToggleSwitch
              checked={pref.enabled}
              onCheckedChange={(enabled) => toggle(pref.category, enabled)}
              label={`${pref.label} notifications`}
            />
          }
        />
      ))}
    </SettingsSection>
  );
}
