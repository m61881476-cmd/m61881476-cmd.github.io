// End-to-end check of the push server without a network: a fake KV, a fake push service
// that decrypts each message with the subscriber's private key (http_ece) and verifies the VAPID JWT.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createECDH, randomBytes, webcrypto } from 'node:crypto';
import ece from 'http_ece';
import worker from '../worker.js';
import { b64uDecode, b64uEncode } from '../webpush.js';

function fakeKV() {
  const m = new Map();
  return {
    m,
    async get(k) { return m.has(k) ? m.get(k).v : null; },
    async put(k, v, o = {}) { m.set(k, { v, meta: o.metadata }); },
    async delete(k) { m.delete(k); },
    async list({ prefix = '', cursor, limit = 1000 } = {}) {
      const all = [...m.keys()].filter(k => k.startsWith(prefix)).sort();
      const start = cursor ? +cursor : 0;
      const keys = all.slice(start, start + limit).map(name => ({ name, metadata: m.get(name).meta }));
      const end = start + keys.length;
      return { keys, list_complete: end >= all.length, cursor: end >= all.length ? undefined : String(end) };
    },
  };
}
function fakeBrowser(host = 'fcm.googleapis.com') {
  const ecdh = createECDH('prime256v1'); ecdh.generateKeys();
  const auth = randomBytes(16);
  const endpoint = `https://${host}/fcm/send/${b64uEncode(randomBytes(24))}`;
  return { ecdh, auth, sub: { endpoint, keys: { p256dh: b64uEncode(ecdh.getPublicKey()), auth: b64uEncode(auth) } } };
}
async function verifyVapid(authHeader, endpoint, pubKey) {
  const m = /^vapid t=([^,]+), k=(.+)$/.exec(authHeader); assert.ok(m, 'vapid header shape');
  assert.equal(m[2], pubKey);
  const [h, c, s] = m[1].split('.');
  const claims = JSON.parse(Buffer.from(c, 'base64url').toString());
  assert.equal(claims.aud, new URL(endpoint).origin);
  assert.ok(claims.exp > Date.now() / 1000 && claims.exp <= Date.now() / 1000 + 24 * 3600);
  assert.match(claims.sub, /^(mailto:|https:)/);
  const key = await webcrypto.subtle.importKey('raw', b64uDecode(pubKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const ok = await webcrypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64uDecode(s), new TextEncoder().encode(h + '.' + c));
  assert.ok(ok, 'VAPID signature verifies');
}

const kp = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
const VAPID_PUBLIC_KEY = b64uEncode(await webcrypto.subtle.exportKey('raw', kp.publicKey));
const VAPID_PRIVATE_KEY = (await webcrypto.subtle.exportKey('jwk', kp.privateKey)).d;
const env = () => ({ SUBS: fakeKV(), VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT: 'https://example.github.io/daftar/', ADMIN_TOKEN: 'secret-token-123' });
const call = (e, method, path, body, token) => worker.fetch(new Request('https://push.test' + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), Origin: 'https://example.github.io' }, body: body ? JSON.stringify(body) : undefined }), e);

test('subscribe → send delivers a decryptable, correctly signed notification; dead subs get removed', async () => {
  const e = env();
  const phones = [fakeBrowser(), fakeBrowser('web.push.apple.com'), fakeBrowser()];
  for (const [i, p] of phones.entries()) {
    const r = await call(e, 'POST', '/subscribe', { sub: p.sub, platform: i === 1 ? 'ios' : 'android', v: '1.3.0' });
    assert.equal(r.status, 200);
  }
  assert.equal(e.SUBS.m.size, 3);

  const delivered = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const p = phones.find(x => x.sub.endpoint === url); assert.ok(p, 'only real endpoints are called');
    assert.equal(init.headers['Content-Encoding'], 'aes128gcm');
    assert.ok(+init.headers.TTL > 0);
    await verifyVapid(init.headers.Authorization, url, VAPID_PUBLIC_KEY);
    const plain = ece.decrypt(Buffer.from(init.body), { version: 'aes128gcm', privateKey: p.ecdh, authSecret: p.auth });
    delivered.push({ url, msg: JSON.parse(plain.toString()) });
    return new Response(null, { status: p === phones[2] ? 410 : 201 });
  };
  try {
    assert.equal((await call(e, 'POST', '/send', { title: 'x' })).status, 401, 'no token → 401');
    assert.equal((await call(e, 'POST', '/send', { title: 'x' }, 'wrong-token-1234')).status, 401);
    const r = await call(e, 'POST', '/send', { title: 'دفتر 1.3 نزل', body: 'إشعارات وتذكيرات جديدة', url: './#chat' }, 'secret-token-123');
    const out = await r.json();
    assert.deepEqual({ sent: out.sent, removed: out.removed, failed: out.failed, done: out.done }, { sent: 2, removed: 1, failed: 0, done: true });
    assert.equal(delivered.length, 3);
    assert.deepEqual(delivered[0].msg, { title: 'دفتر 1.3 نزل', body: 'إشعارات وتذكيرات جديدة', url: './#chat' });
    assert.equal(e.SUBS.m.size, 2, 'the 410 subscription was deleted');

    delivered.length = 0;
    const r2 = await (await call(e, 'POST', '/send', { title: 'للآيفون بس', platform: 'ios' }, 'secret-token-123')).json();
    assert.equal(r2.sent, 1); assert.equal(delivered[0].url, phones[1].sub.endpoint);

    const stats = await (await call(e, 'GET', '/stats', null, 'secret-token-123')).json();
    assert.deepEqual(stats, { total: 2, android: 1, ios: 1, desktop: 0 });

    delivered.length = 0;
    const t = await call(e, 'POST', '/test', { endpoint: phones[0].sub.endpoint });
    assert.equal(t.status, 200); assert.equal(delivered.length, 1);
    assert.equal((await call(e, 'POST', '/test', { endpoint: phones[0].sub.endpoint })).status, 429, 'test is rate limited');
  } finally { globalThis.fetch = realFetch; }
});

test('batches with a cursor so large lists fit the Workers subrequest limit', async () => {
  const e = env();
  const phones = Array.from({ length: 95 }, () => fakeBrowser());
  for (const p of phones) await call(e, 'POST', '/subscribe', { sub: p.sub, platform: 'android' });
  const realFetch = globalThis.fetch; let n = 0;
  globalThis.fetch = async () => { n++; return new Response(null, { status: 201 }); };
  try {
    let cursor = null, rounds = 0, sent = 0;
    do {
      const r = await (await call(e, 'POST', '/send', { title: 't', cursor }, 'secret-token-123')).json();
      assert.ok(r.sent <= 40); sent += r.sent; cursor = r.cursor; rounds++;
    } while (cursor);
    assert.equal(sent, 95); assert.equal(n, 95); assert.equal(rounds, 3);
  } finally { globalThis.fetch = realFetch; }
});

test('rejects bad subscriptions and non-push hosts; unsubscribe removes', async () => {
  const e = env();
  const bad = fakeBrowser('evil.example.com');
  assert.equal((await call(e, 'POST', '/subscribe', { sub: bad.sub })).status, 400);
  assert.equal((await call(e, 'POST', '/subscribe', { sub: { endpoint: 'http://fcm.googleapis.com/x', keys: bad.sub.keys } })).status, 400);
  assert.equal((await call(e, 'POST', '/subscribe', { sub: { endpoint: 'https://fcm.googleapis.com/x' } })).status, 400);
  const ok = fakeBrowser();
  await call(e, 'POST', '/subscribe', { sub: ok.sub, platform: 'weird' });
  assert.equal(JSON.parse([...e.SUBS.m.values()][0].v).platform, 'desktop');
  await call(e, 'POST', '/unsubscribe', { endpoint: ok.sub.endpoint });
  assert.equal(e.SUBS.m.size, 0);
  const pre = await call(e, 'OPTIONS', '/subscribe');
  assert.equal(pre.status, 204); assert.equal(pre.headers.get('Access-Control-Allow-Origin'), '*');
});
