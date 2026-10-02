const CACHE = "resurface-v2";
const BASE = new URL(self.registration.scope).pathname;
const SHELL = [BASE, `${BASE}manifest.webmanifest`, `${BASE}icon.svg`];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match(BASE))),
  );
});

self.addEventListener("push", (event) => {
  const fallback = {
    title: "A small way back in",
    body: "Pick up something that matters to you.",
    url: BASE,
  };
  let message = fallback;
  try {
    message = { ...fallback, ...event.data.json() };
  } catch {
    // A visible fallback keeps the subscription valid if a payload is malformed.
  }

  event.waitUntil(self.registration.showNotification(message.title, {
    body: message.body,
    icon: `${BASE}icon.svg`,
    badge: `${BASE}icon.svg`,
    tag: "daily-resurface",
    data: { url: message.url || BASE },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || BASE, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.location.origin));
      if (open) {
        open.navigate(target);
        return open.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
