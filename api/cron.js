// =====================================================================
//  AUTOMATIC REFRESH: har 2 din mein models + keys + photo-reading (vision) apne aap dobara test.
//  Vercel Cron roz ek baar bulata hai (/api/cron). Agar pichhla poora test 2 din se purana hai to naya shuru hota hai.
//  Poora test 1 minute mein nahi hota, isliye ek baar mein EK kaam (ek provider ke 10 models / ek provider ki keys / 6 vision keys),
//  phir ye apne aap ko agle kaam ke liye bula leta hai. Sab kuch D1 mein: model_meta 'cron:state' / 'cron:last'.
//  Auth: Authorization: Bearer CRON_SECRET (Vercel env). Admin cookie se ?force=1 par abhi chalane ka button bhi.
// =====================================================================
import { d1, d1On, later } from './_d1.js';
import { authed, isCron } from './_adminauth.js';

export const config = { maxDuration: 60 };
const ORIGIN = () => String(process.env.SITE_ORIGIN || 'https://www.rtuhub.in').replace(/\/$/, '');
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const EVERY = 2 * 86400000 - 3600000;   // 2 din (1 ghanta chhoot: roz ke cron ka samay thoda idhar-udhar ho sakta hai)

async function getMeta(k) { const [r] = await d1([{ sql: 'SELECT v FROM model_meta WHERE k = ?', params: [k] }]); return r.results[0] ? r.results[0].v : ''; }
const setMeta = (k, v) => d1([{ sql: 'INSERT OR REPLACE INTO model_meta (k, v, ts) VALUES (?,?,?)', params: [k, String(v), Date.now()] }]);

async function work(st, task) {
  const H = { authorization: 'Bearer ' + process.env.CRON_SECRET };
  const path = task.t === 'models' ? `/api/ai?refresh=${encodeURIComponent(task.p)}&from=${task.from}`
    : task.t === 'key' ? `/api/ai?keytest=${encodeURIComponent(task.p)}` : `/api/ai?visiontest=1&from=${task.from}`;
  try {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 48000);
    const r = await fetch(ORIGIN() + path, { headers: H, signal: ctl.signal, cache: 'no-store' });
    clearTimeout(timer);
    const j = await r.json().catch(() => ({}));
    if (task.t === 'models' && task.from === 0 && j.total > 10) { const add = []; for (let f = 10; f < j.total; f += 10) add.push({ t: 'models', p: task.p, from: f }); st.queue.unshift(...add); }
    if (task.t === 'vision' && task.from === 0 && j.total > 6) { const add = []; for (let f = 6; f < j.total; f += 6) add.push({ t: 'vision', from: f }); st.queue.unshift(...add); }
    if (!r.ok) st.err = (st.err || 0) + 1;
  } catch (e) { st.err = (st.err || 0) + 1; }
  st.steps = (st.steps || 0) + 1;
  if (!st.queue.length) {
    st.done = true; st.finished = Date.now(); await setMeta('cron:last', Date.now());
    await d1([{ sql: 'DELETE FROM events WHERE ts < ?', params: [Date.now() - 400 * 86400000] }]).catch(() => {});   // data safai: 13 mahine se purane events hata do (database chhota rahe)
  }
  await setMeta('cron:state', JSON.stringify(st));
  if (!st.done) await fetch(ORIGIN() + '/api/cron?step=1', { headers: H, cache: 'no-store' }).catch(() => {});   // agla kaam (turant 202 lautata hai)
}

async function handler(request) {
  const url = new URL(request.url), force = url.searchParams.get('force') === '1';
  const ok = isCron(request) || (force && await authed(request));
  if (!ok) return json({ error: 'auth' }, 401);
  if (!d1On()) return json({ error: 'D1 not connected' });
  let st = null;
  try { st = JSON.parse((await getMeta('cron:state')) || 'null'); } catch (e) {}
  if (st && !st.done && Date.now() - st.started > 3 * 3600000) st = null;           // atka hua purana run: naya shuru
  if (!st || st.done) {
    const last = +(await getMeta('cron:last')) || 0;
    if (!force && Date.now() - last < EVERY) return json({ skipped: 'tested recently', last });
    const caps = await fetch(ORIGIN() + '/api/ai?caps=1', { cache: 'no-store' }).then(r => r.json()).catch(() => ({}));
    const provs = (caps.providers || []).map(p => p.id);
    st = { started: Date.now(), done: false, steps: 0, err: 0, queue: [...provs.flatMap(p => [{ t: 'models', p, from: 0 }, { t: 'key', p }]), { t: 'vision', from: 0 }] };
  }
  const task = st.queue.shift();
  if (!task) { st.done = true; await setMeta('cron:state', JSON.stringify(st)); return json({ done: true }); }
  later(work(st, task));                                   // jawab turant, kaam piche chalta rahe
  return json({ started: true, task: task.t, remaining: st.queue.length }, 202);
}
export default { fetch: handler };
