/* دفتر — سيرفر الإشعارات (Cloudflare Worker + KV)
   POST /subscribe     {sub, platform, v}            ← من التطبيق
   POST /unsubscribe   {endpoint}                    ← من التطبيق
   POST /test          {endpoint}                    ← إشعار تجريبي لنفس الجهاز (مرة كل دقيقة)
   GET  /stats                                       ← للمسؤول (Authorization: Bearer ADMIN_TOKEN)
   POST /send          {title, body, url, platform, cursor}  ← للمسؤول، بيبعت على دفعات
   Env: SUBS (KV) · VAPID_PUBLIC_KEY · VAPID_PRIVATE_KEY (secret) · VAPID_SUBJECT · ADMIN_TOKEN (secret) · ALLOWED_ORIGINS (اختياري) */
import { sendPush } from './webpush.js';

const PUSH_HOSTS = [/\.googleapis\.com$/, /\.push\.apple\.com$/, /\.mozilla\.com$/, /\.mozaws\.net$/, /\.notify\.windows\.com$/];
const PLATFORMS = ['android', 'ios', 'desktop'];
const BATCH = 40; // Workers free plan: 50 outgoing requests per invocation

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const keyFor = async endpoint => 'sub:' + hex(await crypto.subtle.digest('SHA-256', enc.encode(endpoint))).slice(0, 40);

function cors(req, env) {
  const origin = req.headers.get('Origin') || '';
  const list = String(env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim()).filter(Boolean);
  const allow = list.includes('*') ? '*' : list.includes(origin) ? origin : list[0];
  return { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}
const json = (data, status, h) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...h } });

function validSub(sub) {
  if (!sub || typeof sub.endpoint !== 'string' || !sub.keys || typeof sub.keys.p256dh !== 'string' || typeof sub.keys.auth !== 'string') return false;
  if (sub.endpoint.length > 1024 || sub.keys.p256dh.length > 200 || sub.keys.auth.length > 64) return false;
  let u; try { u = new URL(sub.endpoint); } catch (e) { return false; }
  return u.protocol === 'https:' && PUSH_HOSTS.some(r => r.test(u.hostname));
}
function isAdmin(req, env) {
  const got = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const want = String(env.ADMIN_TOKEN || '');
  if (!want || got.length !== want.length) return false;
  let d = 0; for (let i = 0; i < want.length; i++) d |= got.charCodeAt(i) ^ want.charCodeAt(i);
  return d === 0;
}
const vapidOf = env => ({ publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT });
const clip = (s, n) => String(s || '').slice(0, n);

function buildPayload(b) {
  const p = { title: clip(b.title, 80) || 'دفتر', body: clip(b.body, 400) };
  if (b.url) p.url = clip(b.url, 300);
  if (b.tag) p.tag = clip(b.tag, 40);
  if (b.image) p.image = clip(b.image, 300);
  return p;
}

export default {
  async fetch(req, env) {
    const h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    const path = new URL(req.url).pathname.replace(/\/+$/, '') || '/';
    let body = {};
    if (req.method === 'POST') { try { body = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400, h); } }

    if (path === '/' ) return json({ ok: true, service: 'daftar-push' }, 200, h);

    if (path === '/subscribe' && req.method === 'POST') {
      const sub = body.sub;
      if (!validSub(sub)) return json({ error: 'invalid subscription' }, 400, h);
      const platform = PLATFORMS.includes(body.platform) ? body.platform : 'desktop';
      const rec = { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, platform, v: clip(body.v, 12), t: Date.now() };
      await env.SUBS.put(await keyFor(sub.endpoint), JSON.stringify(rec), { metadata: { p: platform } });
      if (typeof body.old === 'string' && body.old !== sub.endpoint) await env.SUBS.delete(await keyFor(body.old));
      return json({ ok: true }, 200, h);
    }

    if (path === '/unsubscribe' && req.method === 'POST') {
      if (typeof body.endpoint !== 'string') return json({ error: 'endpoint required' }, 400, h);
      await env.SUBS.delete(await keyFor(body.endpoint));
      return json({ ok: true }, 200, h);
    }

    if (path === '/test' && req.method === 'POST') {
      if (typeof body.endpoint !== 'string') return json({ error: 'endpoint required' }, 400, h);
      const k = await keyFor(body.endpoint);
      const raw = await env.SUBS.get(k);
      if (!raw) return json({ error: 'not subscribed' }, 404, h);
      const rec = JSON.parse(raw);
      if (rec.lastTest && Date.now() - rec.lastTest < 60000) return json({ error: 'wait a minute' }, 429, h);
      rec.lastTest = Date.now();
      await env.SUBS.put(k, JSON.stringify(rec), { metadata: { p: rec.platform } });
      const r = await sendPush(rec, { title: 'دفتر', body: 'الإشعارات شغالة تمام على الجهاز ده ✓', url: './#prefs', tag: 'test' }, vapidOf(env), { ttl: 600, urgency: 'high' });
      if (r.gone) await env.SUBS.delete(k);
      return json({ ok: r.ok, status: r.status }, r.ok ? 200 : 502, h);
    }

    if (path === '/stats' && req.method === 'GET') {
      if (!isAdmin(req, env)) return json({ error: 'unauthorized' }, 401, h);
      const counts = { total: 0, android: 0, ios: 0, desktop: 0 };
      let cursor;
      do {
        const page = await env.SUBS.list({ prefix: 'sub:', cursor });
        for (const k of page.keys) { counts.total++; const p = (k.metadata && k.metadata.p) || 'desktop'; counts[p] = (counts[p] || 0) + 1; }
        cursor = page.list_complete ? null : page.cursor;
      } while (cursor);
      return json(counts, 200, h);
    }

    if (path === '/send' && req.method === 'POST') {
      if (!isAdmin(req, env)) return json({ error: 'unauthorized' }, 401, h);
      if (!body.title && !body.body) return json({ error: 'title or body required' }, 400, h);
      const payload = buildPayload(body);
      const target = PLATFORMS.includes(body.platform) ? body.platform : 'all';
      const page = await env.SUBS.list({ prefix: 'sub:', cursor: body.cursor || undefined, limit: BATCH });
      const keys = page.keys.filter(k => target === 'all' || ((k.metadata && k.metadata.p) || 'desktop') === target);
      const out = { sent: 0, failed: 0, removed: 0 };
      await Promise.all(keys.map(async k => {
        const raw = await env.SUBS.get(k.name); if (!raw) return;
        try {
          const r = await sendPush(JSON.parse(raw), payload, vapidOf(env), { ttl: +body.ttl || 4 * 86400, topic: body.topic });
          if (r.ok) out.sent++; else if (r.gone) { out.removed++; await env.SUBS.delete(k.name); } else out.failed++;
        } catch (e) { out.failed++; }
      }));
      return json({ ...out, cursor: page.list_complete ? null : page.cursor, done: !!page.list_complete }, 200, h);
    }

    return json({ error: 'not found' }, 404, h);
  },
};
