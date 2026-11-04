/* No external scripts or Firebase credentials. WOFFU OS Browser Push. */

function safeInternalPath(value) {
  if (typeof value !== "string" || value.length > 2048 ||
      !value.startsWith("/") || value.startsWith("//") ||
      value.includes("\\") || /[\u0000-\u001F\u007F]/.test(value)) {
    return "/notifications";
  }
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin !== self.location.origin) return "/notifications";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/notifications";
  }
}

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "WOFFU OS", body: event.data.text() };
  }

  const title = typeof payload.title === "string" ?
    payload.title.slice(0, 120) : "WOFFU OS";
  const options = {
    body: typeof payload.body === "string" ? payload.body.slice(0, 500) : "",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    data: { url: safeInternalPath(payload.url) },
    tag: typeof payload.tag === "string" ? payload.tag.slice(0, 64) : undefined,
    renotify: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = safeInternalPath(event.notification?.data?.url);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(async windows => {
        for (const client of windows) {
          // Only navigate a same-origin registered service worker client.
          if (typeof client.navigate === "function" && typeof client.focus === "function") {
            await client.navigate(targetUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
