"use client";

import { useEffect } from "react";
import { authFetch } from "@/lib/api-client";

// base64url VAPID public key -> the Uint8Array applicationServerKey the
// Push API expects (browsers don't accept the raw base64url string).
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers the push-notification service worker for every signed-in user
 * (mounted once in AppShell, docs/context.md's authenticated app group).
 * Does NOT request notification permission on its own - that stays an
 * explicit user action from a settings toggle (browsers ignore/penalize a
 * permission prompt fired on page load with no user gesture), this only
 * makes sure the worker is registered so that toggle can subscribe
 * immediately when the user opts in, and re-syncs the subscription with the
 * backend if the browser already granted permission from a previous visit.
 */
export function PushRegistration() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return;
    }

    let cancelled = false;

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (registration) => {
        if (cancelled || Notification.permission !== "granted") return;

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) return;

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });
        }

        const json = subscription.toJSON();
        await authFetch("/notifications/push-subscriptions", {
          method: "POST",
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys,
          }),
        });
      })
      .catch(() => {
        // Best-effort background sync - a failure here shouldn't surface
        // anywhere, the explicit subscribeToPush() action (settings toggle)
        // is the path that reports errors to the user.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

/**
 * Explicit opt-in action for a settings toggle: requests permission (must
 * be called from a real user gesture - a click handler, not an effect),
 * subscribes, and registers the subscription with the backend. Throws with
 * a user-facing message on denial or failure so the toggle can show it.
 */
export async function subscribeToPush(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications aren't supported on this browser.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was denied.");
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error("Push notifications aren't configured yet.");
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const json = subscription.toJSON();
  await authFetch("/notifications/push-subscriptions", {
    method: "POST",
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
}

/** Reverses subscribeToPush(): unsubscribes locally and tells the backend to drop the row. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await authFetch("/notifications/push-subscriptions", {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });
}
