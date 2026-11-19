// =====================================================================
//  WEB PUSH — naya notice publish ho to jin students ne "Notify me" on kiya, unke phone/laptop par notification.
//  - VAPID keys pehli baar khud bante hain aur R2 (facultydatabase) mein push/vapid.json mein rehte hain (env ki zaroorat nahi).
//  - Subscriptions: push/subs.json (sirf endpoint URL; koi naam/email nahi).
//  - Push khaali (bina payload) bhejte hain, isliye encryption nahi chahiye: sw.js notification aane par
//    /api/faculty?a=public se sabse naya notice padh kar dikhata hai.
// =====================================================================
import { s3 } from './_faculty.js';

const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const timed = ms => (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined);
const SUBS = 'push/subs.json', VAPID = 'push/vapid.json', MAX_SUBS = 50000;

// endpoint sirf asli push services ke hi chalein (koi apna server daal kar hamse requests na karwa sake)
const PUSH_HOSTS = /(^|\.)(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com|web\.push\.apple\.com)$/i;
export function okEndpoint(e) {
  try { const u = new URL(String(e || '')); return u.protocol === 'https:' && PUSH_HOSTS.test(u.hostname) && String(e).length < 1000; } catch (x) { return false; }
}

// ---------- VAPID keys (ek isolate mein ek baar padhna) ----------
let keysP = null;
export function vapid() {
  if (!keysP) keysP = (async () => {
    const r = await s3('GET', VAPID);
    let j = null;
    if (r.ok) j = await r.json().catch(() => null);
    else if (r.status !== 404) throw new Error('vapid read ' + r.status);
    if (!j || !j.d || !j.pub) {
      const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
      const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
      const pub = b64u(await crypto.subtle.exportKey('raw', kp.publicKey));
      const w = await s3('PUT', VAPID, { body: JSON.stringify({ ...jwk, pub }), headers: { 'content-type': 'application/json', 'if-none-match': '*' } });
      if (!w.ok) {   // kisi aur request ne abhi abhi bana diya: wahi padho
        const again = await s3('GET', VAPID);
        if (!again.ok) throw new Error('vapid write ' + w.status);
        j = await again.json();
      } else j = { ...jwk, pub };
    }
    const { pub, ...jwk } = j;
    const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, d: jwk.d, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    return { pub, key };
  })().catch(e => { keysP = null; throw e; });
  return keysP;
}

const jwtCache = new Map();
async function auth(endpoint) {
  const aud = new URL(endpoint).origin, now = Math.floor(Date.now() / 1000);
  const hit = jwtCache.get(aud);
  if (hit && hit.exp - now > 3600) return hit.h;
  const { pub, key } = await vapid();
  const exp = now + 12 * 3600;
  const part = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))) + '.' + b64u(enc.encode(JSON.stringify({ aud, exp, sub: 'mailto:support@rtuhub.in' })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(part));
  const h = `vapid t=${part}.${b64u(sig)}, k=${pub}`;
  jwtCache.set(aud, { h, exp });
  return h;
}

// ---------- subscriptions list ----------
async function readSubs() {
  const r = await s3('GET', SUBS);
  if (r.status === 404) return { list: [], etag: null };
  if (!r.ok) throw new Error('subs read ' + r.status);
  const j = await r.json().catch(() => ({}));
  return { list: Array.isArray(j.list) ? j.list : [], etag: r.headers.get('etag') };
}
async function changeSubs(fn) {
  for (let i = 0; i < 6; i++) {
    const { list, etag } = await readSubs();
    const next = fn(list.slice());
    if (next === null) return list;   // kuch badalna nahi
    const headers = { 'content-type': 'application/json', ...(etag ? { 'if-match': etag } : { 'if-none-match': '*' }) };
    const w = await s3('PUT', SUBS, { body: JSON.stringify({ v: 1, list: next }), headers });
    if (w.ok) return next;
    if (w.status === 412 || w.status === 409) { await new Promise(r => setTimeout(r, 100 * (i + 1) + Math.random() * 100)); continue; }
    throw new Error('subs write ' + w.status);
  }
  throw new Error('subs busy');
}
export const addSub = e => changeSubs(l => l.some(x => x.e === e) ? null : [{ e, t: Date.now() }, ...l].slice(0, MAX_SUBS));
export const removeSubs = gone => changeSubs(l => { const s = new Set(gone); const n = l.filter(x => !s.has(x.e)); return n.length === l.length ? null : n; });

// ---------- sabko bhejna (khaali push; 20-20 ek saath) ----------
export async function notifyAll() {
  const { list } = await readSubs();
  if (!list.length) return { sent: 0, gone: 0 };
  const gone = [];
  let sent = 0;
  for (let i = 0; i < list.length; i += 20) {
    await Promise.all(list.slice(i, i + 20).map(async ({ e }) => {
      try {
        const r = await fetch(e, { method: 'POST', headers: { authorization: await auth(e), ttl: '86400', urgency: 'high', 'content-length': '0' }, signal: timed(6000) });
        if (r.status === 404 || r.status === 410) gone.push(e); else if (r.ok) sent++;
      } catch (x) { /* ek fail ho to baaki chalte rahein */ }
    }));
  }
  if (gone.length) await removeSubs(gone).catch(() => {});
  return { sent, gone: gone.length };
}
