// Visitor ginti (bina naam / bina asli IP): page khulne par "view", khule rehne par har 2 min mein "ping".
import { d1, d1On, ipHash, dayOf, deviceOf, where } from './_d1.js';
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
  const st = [{ sql: 'INSERT INTO visitors (vid, first_ts, last_ts, ip, country, city, device, hits) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(vid) DO UPDATE SET last_ts = excluded.last_ts, ip = excluded.ip, country = excluded.country, city = excluded.city, device = excluded.device, hits = hits + ?',
    params: [b.vid, now, now, ip, w.country, w.city, dev, view ? 1 : 0, view ? 1 : 0] }];
  if (view) st.push({ sql: 'INSERT INTO events (ts, day, vid, ip, kind, path, prov, model, ok, status, country, device) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', params: [now, dayOf(now), b.vid, ip, 'view', path, '', '', 1, '', w.country, dev] });
  try { await d1(st); } catch (e) {}
  return quiet();
}
