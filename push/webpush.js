/* Web Push (RFC 8030) with VAPID (RFC 8292) and aes128gcm payload encryption (RFC 8291 / RFC 8188).
   Pure WebCrypto, no dependencies: runs on Cloudflare Workers, Deno and Node 20+. */
const enc = new TextEncoder();

export function b64uEncode(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function b64uDecode(str) {
  const s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8));
}

/** VAPID Authorization header for one push service origin. */
export async function vapidAuth(endpoint, { publicKey, privateKey, subject }, ttlSeconds = 12 * 3600) {
  const aud = new URL(endpoint).origin;
  const header = b64uEncode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64uEncode(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + ttlSeconds, sub: subject })));
  const pub = b64uDecode(publicKey);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error('VAPID public key must be an uncompressed P-256 point');
  const jwk = { kty: 'EC', crv: 'P-256', x: b64uEncode(pub.slice(1, 33)), y: b64uEncode(pub.slice(33, 65)), d: privateKey, ext: true };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  // WebCrypto returns the raw r||s signature, which is exactly the JWS ES256 format
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(header + '.' + claims));
  return `vapid t=${header}.${claims}.${b64uEncode(sig)}, k=${publicKey}`;
}

/** Encrypt a payload for one subscription (single aes128gcm record). */
export async function encryptPayload(plaintext, p256dh, auth) {
  const uaPub = b64uDecode(p256dh);
  const authSecret = b64uDecode(auth);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(authSecret, ecdh, concat(enc.encode('WebPush: info\0'), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const record = concat(plaintext, new Uint8Array([2])); // 0x02 = last record delimiter, no padding
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, record));
  const head = new Uint8Array(21);
  head.set(salt, 0);
  new DataView(head.buffer).setUint32(16, 4096);
  head[20] = asPub.length;
  return concat(head, asPub, ct);
}

export const MAX_PLAINTEXT = 3993; // 4096 - header(86) - delimiter(1) - tag(16)

/**
 * Send one notification. `sub` = PushSubscription JSON ({ endpoint, keys: { p256dh, auth } }).
 * Returns { ok, status, gone } — gone=true means the subscription is dead and should be deleted.
 */
export async function sendPush(sub, payload, vapid, { ttl = 86400, urgency = 'normal', topic } = {}) {
  const data = enc.encode(typeof payload === 'string' ? payload : JSON.stringify(payload));
  if (data.length > MAX_PLAINTEXT) throw new Error('payload too large');
  const body = await encryptPayload(data, sub.keys.p256dh, sub.keys.auth);
  const headers = {
    Authorization: await vapidAuth(sub.endpoint, vapid),
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    TTL: String(ttl),
    Urgency: urgency,
  };
  if (topic) headers.Topic = topic;
  const res = await fetch(sub.endpoint, { method: 'POST', headers, body });
  return { ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410 };
}
