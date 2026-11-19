// =====================================================================
//  FACULTY STORAGE — R2 bucket "facultydatabase" (PYQ / notes wale bucket se bilkul alag).
//  Vercel env (repo mein kuch nahi):
//    FACULTY_CF_ACCOUNT_ID   Cloudflare account id (32 akshar)
//    FACULTY_CF_TOKEN        Cloudflare API token (R2 edit permission)
//    FACULTY_BUCKET          (optional) default: facultydatabase
//    FACULTY_PASSWORD        faculty portal ka password
//    FACULTY_R2_ACCESS_KEY_ID / FACULTY_R2_SECRET_ACCESS_KEY  (optional; na ho to token se khud bante hain)
//  Token se S3 keys: access key = token ka id, secret = SHA-256(token)  (Cloudflare ka tareeka).
//  Bucket na ho to khud banta hai, aur browser se seedha upload ke liye CORS bhi khud lagta hai.
// =====================================================================
import { signedHeaders, encodePath, sha256 } from './_r2.js';

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function hmac(key, text) {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, enc.encode(text));
}
const q = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());

export const ENV = () => ({
  acc: String(process.env.FACULTY_CF_ACCOUNT_ID || '').trim(),
  token: String(process.env.FACULTY_CF_TOKEN || '').trim(),
  bucket: String(process.env.FACULTY_BUCKET || 'facultydatabase').trim(),
  ak: String(process.env.FACULTY_R2_ACCESS_KEY_ID || '').trim(),
  sk: String(process.env.FACULTY_R2_SECRET_ACCESS_KEY || '').trim(),
  pass: String(process.env.FACULTY_PASSWORD || '')
});
export const configured = () => { const e = ENV(); return !!(e.acc && (e.token || (e.ak && e.sk))); };

const cfApi = (path, init = {}) => fetch('https://api.cloudflare.com/client/v4' + path, {
  ...init, headers: { authorization: 'Bearer ' + ENV().token, 'content-type': 'application/json', ...(init.headers || {}) }
}).then(r => r.json().catch(() => null), () => null);

// ---------- S3 keys ----------
let credP = null;
export function creds() {
  const e = ENV();
  if (!e.acc) return Promise.reject(new Error('FACULTY_CF_ACCOUNT_ID missing'));
  const base = { host: `${e.acc}.r2.cloudflarestorage.com`, bucket: e.bucket };
  if (e.ak && e.sk) return Promise.resolve({ ...base, ak: e.ak, sk: e.sk });
  if (!e.token) return Promise.reject(new Error('FACULTY_CF_TOKEN missing'));
  if (!credP) credP = (async () => {
    let id = '';
    for (const p of ['/user/tokens/verify', `/accounts/${e.acc}/tokens/verify`]) {
      const j = await cfApi(p);
      if (j && j.success && j.result && j.result.id) { id = j.result.id; break; }
    }
    if (!id) throw new Error('Cloudflare token could not be verified');
    return { ...base, ak: id, sk: await sha256(e.token) };
  })().catch(err => { credP = null; throw err; });
  return credP;
}

// ---------- bucket + CORS (ek isolate mein ek baar; naya origin aaye to dobara) ----------
const ORIGINS = new Set(['https://rtuhub.in', 'https://www.rtuhub.in']);
let setupP = null, setupFor = '', lastSetup = { bucket: 'unknown', cors: 'unknown' };
export function setup(origin) {
  const e = ENV();
  if (origin && /^https:\/\/[a-z0-9.-]+$/i.test(origin)) ORIGINS.add(origin);
  const want = [...ORIGINS].sort().join(',');
  if (setupP && setupFor === want) return setupP;
  setupFor = want;
  setupP = (async () => {
    if (!e.token) return lastSetup = { bucket: 'skipped (no token)', cors: 'skipped (no token)' };
    const b = `/accounts/${e.acc}/r2/buckets/${encodeURIComponent(e.bucket)}`;
    let bucket = 'ok';
    const got = await cfApi(b);
    if (!(got && got.success)) {
      const made = await cfApi(`/accounts/${e.acc}/r2/buckets`, { method: 'POST', body: JSON.stringify({ name: e.bucket }) });
      bucket = made && made.success ? 'created' : 'check failed: ' + String(got && got.errors && got.errors[0] && got.errors[0].message || 'no access').slice(0, 120);
    }
    const rules = { rules: [{ allowed: { origins: [...ORIGINS], methods: ['PUT', 'GET', 'HEAD'], headers: ['content-type'] }, exposeHeaders: ['ETag'], maxAgeSeconds: 3600 }] };
    const c = await cfApi(b + '/cors', { method: 'PUT', body: JSON.stringify(rules) });
    const cors = c && c.success ? 'ok' : 'failed: ' + String(c && c.errors && c.errors[0] && c.errors[0].message || 'no access').slice(0, 120);
    return lastSetup = { bucket, cors };
  })().catch(err => { setupP = null; return lastSetup = { bucket: 'error', cors: 'error: ' + String(err.message || err).slice(0, 120) }; });
  return setupP;
}
export const setupState = () => lastSetup;

// ---------- S3 calls ----------
export async function s3(method, key, { body, headers = {}, range } = {}) {
  const c = await creds();
  const p = '/' + encodePath(c.bucket + '/' + key);
  const h = await signedHeaders({ host: c.host, path: p, region: 'auto', accessKey: c.ak, secretKey: c.sk, range, method, payloadHash: 'UNSIGNED-PAYLOAD' });
  return fetch(`https://${c.host}${p}`, { method, headers: { ...headers, ...h }, body });
}

// browser ke liye 15 minute ka upload link (sirf isi ek file ke liye, sirf PUT)
export async function presignPut(key, expires = 900) {
  const c = await creds();
  const amzDate = new Date().toISOString().replace(/[-:]|\.\d{3}/g, ''), day = amzDate.slice(0, 8);
  const scope = `${day}/auto/s3/aws4_request`;
  const p = '/' + encodePath(c.bucket + '/' + key);
  const params = { 'X-Amz-Algorithm': 'AWS4-HMAC-SHA256', 'X-Amz-Credential': `${c.ak}/${scope}`, 'X-Amz-Date': amzDate, 'X-Amz-Expires': String(expires), 'X-Amz-SignedHeaders': 'host' };
  const query = Object.keys(params).sort().map(k => q(k) + '=' + q(params[k])).join('&');
  const canonical = ['PUT', p, query, 'host:' + c.host, '', 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256(canonical)].join('\n');
  let k = await hmac('AWS4' + c.sk, day);
  for (const part of ['auto', 's3', 'aws4_request']) k = await hmac(k, part);
  return `https://${c.host}${p}?${query}&X-Amz-Signature=${hex(await hmac(k, toSign))}`;
}

// ---------- index.json: saari files ki list ----------
let cache = null, cachedAt = 0;
export async function readIndex(fresh = false) {
  if (!fresh && cache && Date.now() - cachedAt < 15000) return cache;
  const r = await s3('GET', 'index.json');
  let out;
  if (r.status === 404) out = { items: [], etag: null };
  else if (!r.ok) throw new Error('index read ' + r.status);
  else { const j = await r.json().catch(() => ({})); out = { items: Array.isArray(j.items) ? j.items : [], etag: r.headers.get('etag') }; }
  cache = out; cachedAt = Date.now();
  return out;
}
// do teacher ek saath upload karein to bhi kuch na khoye: ETag match hone par hi likhna, warna dobara padh kar
export async function updateIndex(change) {
  let conditional = true;
  for (let i = 0; i < 6; i++) {
    const { items, etag } = await readIndex(true);
    const next = change(items.slice());
    const headers = { 'content-type': 'application/json' };
    if (conditional) { if (etag) headers['if-match'] = etag; else headers['if-none-match'] = '*'; }
    const r = await s3('PUT', 'index.json', { body: JSON.stringify({ v: 1, updated: Date.now(), items: next }), headers });
    if (r.ok) { cache = { items: next, etag: r.headers.get('etag') }; cachedAt = Date.now(); return next; }
    if (r.status === 412 || r.status === 409) { await new Promise(res => setTimeout(res, 120 * (i + 1) + Math.random() * 100)); continue; }
    if (conditional && (r.status === 501 || r.status === 400)) { conditional = false; continue; }   // condition samajh na aaye to bina condition
    throw new Error('index write ' + r.status);
  }
  throw new Error('index busy, try again');
}
