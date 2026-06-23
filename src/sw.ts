import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Injetado pelo VitePWA em build time
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json() as {
    title?: string;
    body?: string;
    url?: string;
    icon?: string;
  };

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Netzach ✦', {
      body: data.body ?? 'Uma mensagem da sua sacerdotisa',
      icon: data.icon ?? '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: data.url ?? '/' },
    })
  );
});

// Clique na notificação abre a rota correta
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data?.url as string) ?? '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((c) => c.url.includes(url) && 'focus' in c);
        if (existing) return existing.focus();
        return self.clients.openWindow(url);
      })
  );
});
