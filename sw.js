/* دفتر — service worker: offline app shell + cache-first runtime for fonts and libraries + Web Push */
const VERSION = 'daftar-shell-v2.2.0';
try { importScripts('./push-config.js'); } catch (e) { self.DAFTAR_PUSH = {}; }
const RUNTIME = 'daftar-runtime-v1';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './favicon.ico',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png', './icons/badge-96.png', './push-config.js',
];
const CDN = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)\//;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
});
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION && k !== RUNTIME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      event.respondWith((async () => (await caches.match('./index.html')) || fetch(req))());
      return;
    }
    event.respondWith((async () => {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })());
    return;
  }
  if (CDN.test(req.url)) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone()).catch(() => {});
      return res;
    })());
  }
});

/* ---------- Web Push ---------- */
self.addEventListener('push', event => {
  let d = {};
  if (event.data) { try { d = event.data.json(); } catch (e) { d = { body: event.data.text() }; } }
  const title = d.title || 'دفتر';
  const opts = {
    body: d.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/badge-96.png',
    dir: 'rtl', lang: 'ar',
    data: { url: d.url || './' },
  };
  if (d.tag) { opts.tag = d.tag; opts.renotify = true; }
  if (d.image) opts.image = d.image;
  event.waitUntil(self.registration.showNotification(title, opts));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope);
  if (target.origin !== self.location.origin) { event.waitUntil(self.clients.openWindow(target.href)); return; }
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const c = all.find(w => w.url.startsWith(self.registration.scope));
    if (c) { await c.focus(); c.postMessage({ type: 'NAV', hash: target.hash.slice(1) }); return; }
    await self.clients.openWindow(target.href);
  })());
});
/* the browser rotated the subscription: re-subscribe and tell the push server */
self.addEventListener('pushsubscriptionchange', event => {
  const cfg = self.DAFTAR_PUSH || {};
  if (!cfg.server) return;
  event.waitUntil((async () => {
    const old = event.oldSubscription;
    const key = (old && old.options && old.options.applicationServerKey) || (cfg.vapidPublicKey && b64u(cfg.vapidPublicKey));
    if (!key) return;
    const sub = event.newSubscription || await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    await fetch(cfg.server.replace(/\/$/, '') + '/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sub: sub.toJSON(), old: old ? old.endpoint : null }) });
  })());
});
function b64u(s) {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4));
  return Uint8Array.from(b, c => c.charCodeAt(0));
}
