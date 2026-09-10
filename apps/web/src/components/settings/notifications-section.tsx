"use client";

import { useState, useSyncExternalStore } from "react";
import {
  ArrowsRightLeftIcon,
  BanknotesIcon,
  UserGroupIcon,
  UserCircleIcon,
  BellIcon,
} from "@heroicons/react/24/solid";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsRow } from "@/components/settings/settings-row";
import { ToggleSwitch } from "@/components/settings/toggle-switch";
import {
  subscribeToPush,
  unsubscribeFromPush,
} from "@/components/app/push-registration";
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

// No-op subscription: these two booleans never change on their own (a
// browser doesn't emit an event when push support or Notification.permission
// changes), useSyncExternalStore is only used here for its getServerSnapshot
// half - it reads false during SSR/hydration and the real client value on
// the client without ever causing a setState-during-effect render, avoiding
// both a hydration mismatch and the react-hooks/set-state-in-effect rule.
function subscribeToNothing() {
  return () => {};
}

function getPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

function getPushSupportedServerSnapshot() {
  return false;
}

function getNotificationPermissionGranted() {
  return (
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );
}

function getNotificationPermissionGrantedServerSnapshot() {
  return false;
}

/**
 * One toggle per notifications.category value (docs/database-schema.md),
 * so preference is scoped exactly the way notification rows already are
 * everywhere else in the app. Local state only, no real preferences
 * table write yet, structured (one row per category) so a real save call
 * can replace each onCheckedChange without changing this layout.
 */
export function NotificationsSection() {
  const [preferences, setPreferences] = useState(NOTIFICATION_PREFERENCES);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  // Real permission state until the user explicitly toggles this session -
  // after that, the toggle (subscribe/unsubscribe succeeded) is the source
  // of truth, since unsubscribing doesn't revoke the browser's own grant.
  const [pushEnabledOverride, setPushEnabledOverride] = useState<
    boolean | null
  >(null);

  const pushSupported = useSyncExternalStore(
    subscribeToNothing,
    getPushSupported,
    getPushSupportedServerSnapshot,
  );
  const permissionGranted = useSyncExternalStore(
    subscribeToNothing,
    getNotificationPermissionGranted,
    getNotificationPermissionGrantedServerSnapshot,
  );
  const pushEnabled = pushEnabledOverride ?? permissionGranted;

  async function togglePush(enabled: boolean) {
    setPushError(null);
    setPushBusy(true);
    try {
      if (enabled) {
        await subscribeToPush();
      } else {
        await unsubscribeFromPush();
      }
      setPushEnabledOverride(enabled);
    } catch (err) {
      setPushError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setPushBusy(false);
    }
  }

  function toggle(category: NotificationCategory, enabled: boolean) {
    setPreferences((prev) =>
      prev.map((pref) =>
        pref.category === category ? { ...pref, enabled } : pref,
      ),
    );
  }

  return (
    <SettingsSection title="Notifications">
      {pushSupported ? (
        <SettingsRow
          icon={BellIcon}
          label="Push notifications"
          description={
            pushError ??
            "Get notified on this device, even when Veyro is closed."
          }
          right={
            <ToggleSwitch
              checked={pushEnabled}
              onCheckedChange={togglePush}
              label="Push notifications"
              disabled={pushBusy}
            />
          }
        />
      ) : null}
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
