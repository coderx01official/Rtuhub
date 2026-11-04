// Visitor ginti (bina naam / bina asli IP): page khulne par "view", khule rehne par har 2 min mein "ping".
import { d1, d1On, ipHash, ipMask, parseUA, dayOf, deviceOf, where } from './_d1.js';
import { fromThisSite } from './_auth.js';

export const config = { runtime: 'edge' };
const hits = new Map();

export default async function handler(request) {
  const quiet = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  if (request.method !== 'POST' || !d1On() || !fromThisSite(request)) return quiet();
  const dev = deviceOf(request);
  if (dev === 'bot') return quiet();
  const ip = await ipHash(request), now = Date.now(), mine = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (mine.length >= 40) return quiet();
  mine.push(now); hits.set(ip, mine); if (hits.size > 5000) hits.clear();
  let b = null;
  try { b = JSON.parse(await request.text()); } catch (e) {}
  if (!b || !/^[a-f0-9]{24}$/.test(String(b.vid || ''))) return quiet();
  const view = b.t === 'view', path = String(b.path || '/').split('?')[0].slice(0, 120), w = where(request);
  const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>"]/g, '').slice(0, n);
  const ua = request.headers.get('user-agent') || '', u = parseUA(ua);
  const screen = clean(b.sc, 20), lang = clean(b.lang, 12), tz = clean(b.tz, 40), ref = clean(b.ref, 60), mdl = clean(b.model, 40) || u.model;
  const sigBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode([ip, ua, screen, tz, lang].join('|')));
  const sig = [...new Uint8Array(sigBuf)].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 16);   // ek hi phone/laptop pehchaanne ke liye (cookie hat jaye tab bhi)
  const st = [{ sql: `INSERT INTO visitors (vid, first_ts, last_ts, ip, ipm, country, city, device, os, browser, dev, screen, lang, tz, ref, sig, hits) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(vid) DO UPDATE SET last_ts = excluded.last_ts, ip = excluded.ip, ipm = excluded.ipm, country = excluded.country, city = excluded.city, device = excluded.device, os = excluded.os, browser = excluded.browser,
    dev = COALESCE(NULLIF(excluded.dev, ''), dev), screen = COALESCE(NULLIF(excluded.screen, ''), screen), lang = COALESCE(NULLIF(excluded.lang, ''), lang), tz = COALESCE(NULLIF(excluded.tz, ''), tz),
    ref = COALESCE(NULLIF(ref, ''), excluded.ref), sig = excluded.sig, hits = hits + ?`,
    params: [b.vid, now, now, ip, ipMask(request), w.country, w.city, dev, u.os, u.browser, mdl, screen, lang, tz, ref, sig, view ? 1 : 0, view ? 1 : 0] }];
  if (view) st.push({ sql: 'INSERT INTO events (ts, day, vid, ip, kind, path, prov, model, ok, status, country, device) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', params: [now, dayOf(now), b.vid, ip, 'view', path, '', '', 1, '', w.country, dev] });
  try { await d1(st); } catch (e) {}
  return quiet();
}
