// =====================================================================
//  JAWAB CACHE — ek hi sawaal ka jawab sirf ek baar AI se banta hai.
//  100 students "Part A Q1" poochein to AI 1 baar chalega, baaki 99 ko turant saved jawab.
//
//  1. Har server ki apni chhoti memory (hamesha chalti hai, kuch setup nahi).
//  2. R2 bucket (sab servers mein share, hamesha ke liye) — chalu karne ke liye Vercel env mein:
//       AI_CACHE_BUCKET = bucket ka naam (jaise "notes" ya naya "ai-cache")
//     aur R2 token jisme us bucket par WRITE ki permission ho:
//       R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY   (ya AI_CACHE_ACCESS_KEY_ID / AI_CACHE_SECRET_ACCESS_KEY)
//     Ye na ho to sirf memory wala cache chalta hai. R2 likhne mein galti aaye to 10 min ke liye chhod deta hai.
// =====================================================================
import { encodePath, signedHeaders, sha256 } from './_r2.js';

const mem = new Map();          // key -> { text, by }
let r2Off = 0;                  // R2 mein dikkat aayi to kab tak chhodna hai

function r2() {
  const env = process.env;
  const accessKey = env.AI_CACHE_ACCESS_KEY_ID || env.R2_ACCESS_KEY_ID, secretKey = env.AI_CACHE_SECRET_ACCESS_KEY || env.R2_SECRET_ACCESS_KEY;
  if (!env.AI_CACHE_BUCKET || !accessKey || !secretKey || r2Off > Date.now()) return null;
  const account = env.AI_CACHE_ACCOUNT_ID || env.R2_ACCOUNT_ID || '9cb0f8d74fc864ae1a1b3ae541ed0e11';
  return { host: `${account}.r2.cloudflarestorage.com`, bucket: env.AI_CACHE_BUCKET, accessKey, secretKey };
}

// sawaal ki pehchaan: model + bhasha + part + number + us sawaal ka text (paper ka naam nahi, to alag branch ka same paper bhi share hota hai)
export async function cacheKey({ prefer, lang, part, no, question }) {
  return sha256(['v1', prefer, lang, part, no, question.replace(/\s+/g, ' ').trim().toLowerCase()].join('|'));
}

export async function cacheGet(key) {
  if (mem.has(key)) return mem.get(key);
  const e = r2();
  if (!e) return null;
  try {
    const p = '/' + encodePath(`${e.bucket}/ai-answers/${key}.json`);
    const headers = await signedHeaders({ host: e.host, path: p, region: 'auto', accessKey: e.accessKey, secretKey: e.secretKey });
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 2500);
    const res = await fetch(`https://${e.host}${p}`, { headers, signal: ctl.signal }).finally(() => clearTimeout(timer));
    if (res.status === 404) return null;
    if (!res.ok) { r2Off = Date.now() + 600000; return null; }
    const hit = await res.json();
    if (hit && typeof hit.text === 'string') { remember(key, hit); return hit; }
  } catch (e) {}
  return null;
}

export async function cachePut(key, hit) {
  remember(key, hit);
  const e = r2();
  if (!e) return;
  try {
    const body = JSON.stringify(hit), p = '/' + encodePath(`${e.bucket}/ai-answers/${key}.json`);
    const headers = await signedHeaders({ host: e.host, path: p, region: 'auto', accessKey: e.accessKey, secretKey: e.secretKey, method: 'PUT', payloadHash: await sha256(body) });
    const res = await fetch(`https://${e.host}${p}`, { method: 'PUT', headers: { ...headers, 'content-type': 'application/json' }, body });
    if (!res.ok) r2Off = Date.now() + 600000;
  } catch (e) {}
}

function remember(key, hit) {
  mem.set(key, hit);
  if (mem.size > 400) mem.delete(mem.keys().next().value);
}
