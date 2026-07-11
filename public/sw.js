// Minimal offline cache. App is fully client-side, so caching the shell is enough.
const CACHE = "jarvis-lite-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./index.html", "./manifest.json"])));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

// Network-first, fall back to cache when offline.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html"))),
  );
});

// Реальные push-уведомления — приходят от Supabase даже когда приложение закрыто.
self.addEventListener("push", (event) => {
  let data = { title: "Джарвис", body: "" };
  try {
    if (event.data) data = event.data.json();
  } catch {
    data = { title: "Джарвис", body: event.data ? event.data.text() : "" };
  }
  const options = {
    body: data.body || "",
    icon: "./icon.svg",
    badge: "./icon.svg",
    tag: data.tag || "jarvis-push",
  };
  event.waitUntil(self.registration.showNotification(data.title || "Джарвис", options));
});

// Клик по уведомлению — фокусируем открытую вкладку или открываем приложение.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./");
    }),
  );
});
