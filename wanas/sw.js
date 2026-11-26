/* سند و ونس — service worker خاص باللعبة بس (scope: /wanas/)
   الصفحة والملفات: من النت الأول (عشان أي تحديث يوصل على طول) ولو مفيش نت من الكاش. */
const VERSION = 'wanas-v5';
const CORE = ['./', './index.html', './manifest.webmanifest', './js/data.js?v=5', './js/audio.js?v=5', './js/art.js?v=5', './js/game.js?v=5', './js/ui.js?v=5', './js/extras.js?v=5', './js/three.min.js?v=2', './js/render3d.js?v=5',
  './img/wanas.png', './img/sanad.png', './img/wanas-portrait.png', './img/sanad-portrait.png', './icons/icon-192.png', './icons/icon-512.png', './icons/favicon-64.png'];
const FONTS = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('wanas-') && k !== VERSION && k !== 'wanas-fonts').map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
    e.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: 'no-cache' });
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      } catch (err) {
        return (await caches.match(req, { ignoreSearch: req.mode === 'navigate' })) || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
      }
    })());
  } else if (FONTS.test(req.url)) {
    e.respondWith((async () => {
      const c = await caches.open('wanas-fonts'), hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req); if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res;
    })());
  }
});
