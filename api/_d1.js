// =====================================================================
//  D1 (Cloudflare SQLite) — admin portal ka data yahin jaata hai. Sirf Vercel env se chalta hai (repo mein kuch nahi):
//    D1_TOKEN        Cloudflare API token, permission: Account > D1 > Edit
//    D1_ACCOUNT_ID   Cloudflare account id (jis account mein D1 database hai)
//    D1_DATABASE_ID  (optional) database ka id. Na ho to "rtuhub" naam ka database khud dhoondh leta hai, nahi mile to bana deta hai.
//  Visitor ka asli IP kabhi save nahi hota: sirf secret ke saath bana chhota hash. Naam / email / sawaal / jawab kuch nahi.
// =====================================================================
const cfg = () => ({ token: process.env.D1_TOKEN || '', acc: process.env.D1_ACCOUNT_ID || '', db: process.env.D1_DATABASE_ID || '' });
export const d1Missing = () => { const c = cfg(); return [!c.token && 'D1_TOKEN', !c.acc && 'D1_ACCOUNT_ID'].filter(Boolean); };
export const d1On = () => d1Missing().length === 0;

const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS visitors (vid TEXT PRIMARY KEY, first_ts INTEGER, last_ts INTEGER, ip TEXT, country TEXT, city TEXT, device TEXT, hits INTEGER DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, day TEXT, vid TEXT, ip TEXT, kind TEXT, path TEXT, prov TEXT, model TEXT, ok INTEGER, status TEXT, country TEXT, device TEXT)',
  'CREATE INDEX IF NOT EXISTS ev_day ON events(kind, day)',
  'CREATE INDEX IF NOT EXISTS ev_ts ON events(kind, ts)',
  'CREATE INDEX IF NOT EXISTS vis_last ON visitors(last_ts)'
];
let ready = false, dbP = null;
const api = (c, path, init = {}) => fetch('https://api.cloudflare.com/client/v4/accounts/' + c.acc + path, { ...init, headers: { authorization: 'Bearer ' + c.token, 'content-type': 'application/json' } }).then(r => r.json().catch(() => null));
function dbId(c) {
  if (c.db) return Promise.resolve(c.db);
  if (!dbP) dbP = (async () => {
    const list = await api(c, '/d1/database?name=rtuhub&per_page=20');
    const hit = list && list.success && (list.result || []).find(d => d.name === 'rtuhub');
    if (hit) return hit.uuid;
    const made = await api(c, '/d1/database', { method: 'POST', body: JSON.stringify({ name: 'rtuhub' }) });
    if (made && made.success && made.result) return made.result.uuid;
    throw new Error('d1 create failed ' + String(made && made.errors && made.errors[0] && made.errors[0].message || '').slice(0, 100));
  })().catch(e => { dbP = null; throw e; });
  return dbP;
}

// statements: [{ sql, params? }]  ->  [{ results: [...] }]
export async function d1(statements, { init = true } = {}) {
  const c = cfg();
  if (!d1On()) throw new Error('d1 not configured');
  const id = await dbId(c);
  const run = async body => {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${c.acc}/d1/database/${id}/query`, {
      method: 'POST', headers: { authorization: 'Bearer ' + c.token, 'content-type': 'application/json' }, body: JSON.stringify(body)
    });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j || !j.success) throw new Error('d1 ' + res.status + ' ' + String(j && j.errors && j.errors[0] && j.errors[0].message || '').slice(0, 120));
    return j.result;
  };
  if (init && !ready) { await run({ batch: SCHEMA.map(sql => ({ sql })) }); ready = true; }
  return run({ batch: statements.map(s => ({ sql: s.sql, params: s.params || [] })) });
}

// ---------- chhote helpers (edge + node dono mein chalte hain) ----------
const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
export async function ipHash(request) {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'x';
  const d = await crypto.subtle.digest('SHA-256', enc.encode((process.env.RTUHUB_SECRET || 'rtuhub') + '|ip|' + ip));
  return hex(d).slice(0, 16);
}
export const dayOf = (ts = Date.now()) => new Date(ts + 19800000).toISOString().slice(0, 10);   // India (IST) ka din
export function deviceOf(request) {
  const ua = request.headers.get('user-agent') || '';
  if (!ua || /bot|crawl|spider|slurp|headless|lighthouse|preview|curl|wget|python|node-fetch|monitor|uptime/i.test(ua)) return 'bot';
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  return /mobi|android|iphone/i.test(ua) ? 'mobile' : 'desktop';
}
export function where(request) {
  let city = request.headers.get('x-vercel-ip-city') || '';
  try { city = decodeURIComponent(city); } catch (e) {}
  return { country: (request.headers.get('x-vercel-ip-country') || '').slice(0, 2), city: city.slice(0, 40) };
}
export const vidOf = request => { const m = (request.headers.get('cookie') || '').match(/(?:^|;\s*)rh_vid=([a-f0-9]{24})/); return m ? m[1] : ''; };

// background mein chalao (jawab bhejne ke baad bhi poora hone do)
export function later(promise) {
  const p = Promise.resolve(promise).catch(() => {});
  try { const ctx = globalThis[Symbol.for('@vercel/request-context')]; const w = ctx && ctx.get && ctx.get() && ctx.get().waitUntil; if (w) w(p); } catch (e) {}
  return p;
}

// AI use ka ek event (kaun sa provider/model, chala ya nahi). vid cookie se, IP hash se.
export async function aiEvent(request, { ok, prov = '', model = '', status = '' }) {
  if (!d1On()) return;
  const dev = deviceOf(request);
  if (dev === 'bot') return;
  const ts = Date.now(), w = where(request);
  await d1([{ sql: 'INSERT INTO events (ts, day, vid, ip, kind, path, prov, model, ok, status, country, device) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    params: [ts, dayOf(ts), vidOf(request), await ipHash(request), 'ai', '', String(prov).slice(0, 30), String(model).slice(0, 80), ok ? 1 : 0, String(status).slice(0, 30), w.country, dev] }]);
}
