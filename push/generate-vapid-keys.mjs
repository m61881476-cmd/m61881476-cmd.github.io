// node push/generate-vapid-keys.mjs  →  prints a new VAPID key pair (run once, keep the private key secret)
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
const b64u = b => Buffer.from(b).toString('base64url');
console.log('VAPID_PUBLIC_KEY  (حطه في push-config.js وفي wrangler.toml):\n' + b64u(raw) + '\n');
console.log('VAPID_PRIVATE_KEY (سري! حطه بـ: npx wrangler secret put VAPID_PRIVATE_KEY):\n' + jwk.d);
