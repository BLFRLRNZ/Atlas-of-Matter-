// Service worker: conserva l'app sul telefono così funziona anche senza connessione.
const CACHE = 'atlante-v4';
const FILE = ['./', 'index.html', 'manifest.webmanifest',
  'caratteri/dm-sans.woff',
  'icone/icona-180.png', 'icone/icona-192.png', 'icone/icona-512.png'];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});
// Prima la copia salvata (veloce e offline), poi aggiorna in background quando c'è rete.
self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') return;
  ev.respondWith(caches.open(CACHE).then(async (c) => {
    const salvata = await c.match(ev.request, { ignoreSearch: true });
    const rete = fetch(ev.request).then((r) => { if (r.ok && new URL(ev.request.url).origin === location.origin) c.put(ev.request, r.clone()); return r; })
      .catch(() => salvata);
    return salvata || rete;
  }));
});
