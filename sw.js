// Service worker: conserva l'app sul telefono così funziona anche senza connessione.
// La pagina si chiede prima alla rete (così gli aggiornamenti arrivano subito) e, se non c'è rete,
// si usa la copia salvata. Caratteri e icone, che non cambiano, si prendono dalla copia salvata.
const CACHE = 'atlante-v5';
const FILE = ['./', 'index.html', 'manifest.webmanifest', 'caratteri/dm-sans.woff',
  'icone/icona-180.png', 'icone/icona-192.png', 'icone/icona-512.png'];

self.addEventListener('install', (ev) => {
  // cache: 'reload' scavalca la cache del browser, così si salva davvero l'ultima versione pubblicata
  ev.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(FILE.map((u) => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const pagina = req.mode === 'navigate' || req.url.endsWith('/index.html') || req.url.endsWith('/');
  if (pagina) {
    ev.respondWith(caches.open(CACHE).then(async (c) => {
      try {
        const r = await fetch(req, { cache: 'no-cache' });
        if (r.ok) c.put('./', r.clone());
        return r;
      } catch (_) {
        return (await c.match('./')) || (await c.match('index.html'));
      }
    }));
    return;
  }
  ev.respondWith(caches.open(CACHE).then(async (c) => {
    const salvata = await c.match(req, { ignoreSearch: true });
    if (salvata) return salvata;
    const r = await fetch(req);
    if (r.ok) c.put(req, r.clone());
    return r;
  }));
});
