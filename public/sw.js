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
    actions: data.actions || [],
    data: data.data || null,
  };
  event.waitUntil(self.registration.showNotification(data.title || "Джарвис", options));
});

// Клик по уведомлению. Кнопка «+30 мин» на напоминании о еде откладывает его,
// не открывая приложение. Обычный клик — фокусируем вкладку или открываем её.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const info = event.notification.data;

  if (event.action === "snooze30" && info?.kind === "meal") {
    event.waitUntil(
      fetch(`${info.functionsUrl}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${info.anonKey}` },
        body: JSON.stringify({ deviceId: info.deviceId, meal: info.meal, minutes: 30 }),
      }).catch(() => {}),
    );
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./");
    }),
  );
});
