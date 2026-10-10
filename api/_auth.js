// =====================================================================
//  DOMAIN LOCK (server side) — papers sirf rtuhub.in ke andar se khulte hain.
//  1. Site khulte hi /api/session ek signed cookie deta hai (JS use padh nahi sakta).
//  2. /api/paper tabhi file deta hai jab request isi site se aayi ho + cookie sahi ho.
//  Copy ki hui site (doosra domain) se na cookie jaati hai, na "same-origin" banta hai.
//  Vercel > Settings > Environment Variables mein RTUHUB_SECRET (koi lamba random text) zaroor daalo.
// =====================================================================
const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

async function sign(message) {
  const secret = process.env.RTUHUB_SECRET || 'rtuhub-in-default-secret-set-RTUHUB_SECRET-in-vercel';
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}

export const COOKIE = 'rh_auth';
export const HOURS = 6;

export async function makeToken(now = Date.now()) {
  const exp = now + HOURS * 3600 * 1000;
  return exp + '.' + await sign('rtuhub.v1.' + exp);
}

export async function checkToken(token, now = Date.now()) {
  const [exp, sig] = String(token || '').split('.');
  if (!/^\d+$/.test(exp || '') || !sig || +exp < now) return false;
  const good = await sign('rtuhub.v1.' + exp);
  if (good.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < good.length; i++) diff |= good.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

// request isi site ke page se aayi hai? (browser ye header khud lagata hai, JS badal nahi sakta)
export function fromThisSite(request) {
  const site = request.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin';
  const from = request.headers.get('origin') || request.headers.get('referer');   // purane browser
  try { return new URL(from).host === new URL(request.url).host; } catch (e) { return false; }
}

export function readCookie(request, name) {
  const m = (request.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : '';
}

export const deny = (status, text) => new Response(text, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
