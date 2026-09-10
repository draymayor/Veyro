// Minimal push-notification service worker. Hand-written rather than
// next-pwa: this repo's Next.js 16/Turbopack setup isn't a good fit for
// next-pwa's webpack-era plugin, and the app doesn't need offline caching -
// just a registered worker able to receive pushes while the tab is closed.

self.addEventListener("push", (event) => {
  let data = { title: "Veyro", body: "" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Non-JSON payload (shouldn't happen - the API always sends JSON) -
    // fall back to the generic title/body above rather than dropping the
    // notification entirely.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url ?? "/home" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/home";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
