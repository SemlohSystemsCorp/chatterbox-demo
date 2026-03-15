// Chatterbox Service Worker — handles push notifications

const APP_URL = self.location.origin;

// Install — activate immediately
self.addEventListener("install", () => {
  self.skipWaiting();
});

// Activate — claim all clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for messages from the client to show notifications
self.addEventListener("message", (event) => {
  const { type, payload } = event.data || {};

  if (type === "SHOW_NOTIFICATION") {
    const { title, body, tag, icon, data } = payload;

    event.waitUntil(
      self.registration.showNotification(title, {
        body: body || undefined,
        tag: tag || `chatterbox-${Date.now()}`,
        icon: icon || "/icon.png",
        badge: "/icon.png",
        data: data || {},
        requireInteraction: false,
        silent: false,
        actions: [
          { action: "open", title: "Open" },
          { action: "dismiss", title: "Dismiss" },
        ],
      })
    );
  }
});

// Handle notification click — focus existing tab or open new one
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url
    ? new URL(event.notification.data.url, APP_URL).href
    : APP_URL;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Try to find an existing tab and navigate it
        for (const client of clients) {
          if (client.url.startsWith(APP_URL) && "focus" in client) {
            // Navigate to the notification's target URL
            if (event.notification.data?.url) {
              client.postMessage({
                type: "NAVIGATE",
                url: event.notification.data.url,
              });
            }
            return client.focus();
          }
        }
        // No existing tab — open a new one
        return self.clients.openWindow(url);
      })
  );
});
