// =====================================================================
//  RTU NEWS LIVE checker — GitHub Action har 2 ghante chalata hai.
//  Sirf RTU ka official exam portal (rtu.sumsraj.com) padhte hain, 3 page, beech me 5–8 s ka gap:
//    1) Home "News & Events"            -> result live, exam form, admit card, revaluation...
//    2) General Instructions & Notifications (har notice ka apna link)
//    3) Exam notice board                -> exam form / revaluation ki LAST DATE + is mahine ke results
//  rtu.ac.in aur udrtukota.ac.in Cloudflare challenge ("Just a moment") dete hain:
//  unhe automatic nahi padhte (captcha bypass nahi karte) — site par unke seedhe link hain.
//  Output: out/news.json -> "news-data" branch -> /api/news (bina deploy ke live).
//  Koi page na khule to pichhla data rakhte hain (stale), khaali nahi karte. Purani news history me rehti hai.
// =====================================================================
import fs from 'node:fs';

const UA = 'Mozilla/5.0 (compatible; rtuhub-news-check/1.0; +https://www.rtuhub.in/news)';
const SUMS = 'https://rtu.sumsraj.com';
const PREV_SRC = 'https://api.github.com/repos/coderx01official/Rtuhub/contents/news.json?ref=news-data';
const EVERY_HOURS = 2;
const KEEP_DAYS = 400, MAX_ITEMS = 400;

const sleep = ms => new Promise(r => setTimeout(r, ms));
let requests = 0, lastAt = 0;
async function get(url, ms = 35000) {
  const wait = lastAt + 5000 + Math.random() * 3000 - Date.now();       // ek site, ek ke baad ek, 5–8 s gap
  if (wait > 0) await sleep(wait);
  lastAt = Date.now(); requests++;
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,*/*' }, redirect: 'follow', signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const t = await r.text();
  if (/<title>\s*Just a moment/i.test(t)) throw new Error('challenge page');
  return t;
}
async function getRetry(url) { try { return await get(url); } catch (e) { await sleep(6000); return get(url); } }
const errText = e => String(e?.cause?.code || (e?.name === 'TimeoutError' && 'timeout') || e?.message || e).slice(0, 80);

// ---------- text helpers ----------
const decode = s => s.replace(/&nbsp;?/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
const clean = s => decode(s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = n => String(n).padStart(2, '0');
// "18-10-2026" / "11/10/2026" / "30/OCT/2026" / "16-OCT-2026" -> "2026-10-18"
function ymd(s) {
  const m = String(s).match(/(\d{1,2})\s*[-/.]\s*(\d{1,2}|[A-Za-z]{3,9})\s*[-/.]\s*(20\d\d)/);
  if (!m) return '';
  const mo = /^\d+$/.test(m[2]) ? +m[2] : MON[m[2].slice(0, 3).toLowerCase()];
  if (!mo || mo > 12 || +m[1] < 1 || +m[1] > 31) return '';
  return `${m[3]}-${pad(mo)}-${pad(m[1])}`;
}
// ALL CAPS notice ko padhne layak banao (B.Tech, UD, MBA... waise hi rehte hain)
const UPPER = /^(ud|utd|rtu|mba|mca|bba|bca|bfa|bfad|bve|reap|leep|pg|ug|ph\.?d|dat|cam|ii|iii|iv|vi|vii|viii|ix|x|xi|xii|i|v|sc|st|obc|ews|tfws|sums|pdf|rs|it|ai|ds|cse)$/i;
function tidy(t) {
  t = t.replace(/\s+/g, ' ').replace(/\s+([,.;:)])/g, '$1').replace(/\(\s+/g, '(').trim();
  const letters = t.replace(/[^A-Za-z]/g, '');
  if (letters && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.6) {
    t = t.toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase());
  }
  t = t.replace(/\b([bm])[.\-\s]{0,2}(tech|arch|des)\b/gi, (_, a, b) => a.toUpperCase() + '.' + b[0].toUpperCase() + b.slice(1).toLowerCase());
  t = t.replace(/\b([a-z.]+)\b/gi, w => UPPER.test(w) ? w.toUpperCase() : w);
  t = t.replace(/\b(\d+)(st|nd|rd|th)\b/gi, (_, n, s) => n + s.toLowerCase()).replace(/\b(I{1,3}|IV|VI{0,3}|IX)(st|nd|rd|th)\b/gi, (_, r, s) => r.toUpperCase() + s.toLowerCase());
  t = t.replace(/(\d\s*[-/]\s*)(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(?=\s*[-/]\s*\d)/gi, (_, a, m) => a + m[0].toUpperCase() + m.slice(1).toLowerCase());
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// ---------- category + program ----------
const CATS = [
  ['reval', /re-?\s?valuation|reval\b|copy view|view copy|scrutiny|re-?totaling/i],
  ['result', /\bresult/i],
  ['admit', /admit\s*card/i],
  ['form', /exam(ination)?\s*forms?|form\s*(submission|filling|fill)|forms?\s+(are|is|has|have)\s/i],
  ['fee', /\bfees?\b\s*(submission|payment|deposit)|semester fee|fee structure/i],
  ['timetable', /time\s*-?\s*table|date\s*sheet|exam(ination)?\s*schedule|schedule for .*exam|tentative schedule|mercy exam/i],
  ['admission', /admission|\breap\b|\bleep\b|sliding|allocation|counsel|induction|reporting|vacant seat|\bcam\b|\bdat\b/i],
  ['scholarship', /scholarship|छात्रवृत्ति/i]
];
const catOf = t => (CATS.find(([, re]) => re.test(t)) || ['notice'])[0];
const PROGS = [
  ['btech', /\bB[.\-\s]{0,2}TECH\b/i], ['barch', /\bB[.\-\s]{0,2}ARCH\b/i], ['mtech', /\bM[.\-\s]{0,2}TECH\b/i], ['mba', /\bMBA\b/i],
  ['mca', /\bMCA\b/i], ['bba', /\bBBA\b/i], ['bca', /\bBCA\b/i], ['design', /\bB\.?\s?DES\b|\bBFAD?\b|\bBVE\b/i], ['phd', /\bPh\.?\s?D\b|\bDAT\b/i]
];
const progsOf = t => PROGS.filter(([, re]) => re.test(t)).map(([k]) => k);
const ud = t => /\bU\.?T?D\b|university department/i.test(t);
// news ke andar likhi last date (agar ho)
function lastDateIn(t) {
  const m = t.match(/last\s*date[\s\S]{0,60}?(\d{1,2}\s*[-/.]\s*(?:\d{1,2}|[A-Za-z]{3,9})\s*[-/.]\s*20\d\d)/i) || t.match(/(?:upto|up to|till|by)\s*(\d{1,2}\s*[-/.]\s*(?:\d{1,2}|[A-Za-z]{3,9})\s*[-/.]\s*20\d\d)/i);
  return m ? ymd(m[1]) : '';
}
const keyOf = (src, t, d) => src + ':' + d + ':' + t.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 80);

// ---------- 1) Home: News & Events ----------
function parseHome(html) {
  const i = html.search(/<ul class=['"]News['"]>/);
  if (i < 0) throw new Error('News list not found');
  const block = html.slice(i, html.indexOf('</ul>', i + 20));
  const out = [];
  for (const li of block.split(/<li\b[^>]*>/i).slice(1)) {
    const txt = clean(li);
    const m = txt.match(/^(.*?)\s*Posted on\s*:?\s*(\d{1,2}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*20\d\d)/i);
    const body = (m ? m[1] : txt).trim(), d = m ? ymd(m[2]) : '';
    if (body.length < 8) continue;
    out.push({ src: 'news', t: tidy(body), raw: body, d, u: SUMS + '/' });
  }
  return out;
}
// ---------- 2) General Instructions & Notifications ----------
function parseNotices(html) {
  const out = [];
  for (const m of html.matchAll(/Posted on:?\s*<span>\s*([^<]+?)\s*<\/span>[\s\S]{0,400}?<a href="(General_Inst_Not_Desc\.aspx\?id=\d+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const t = clean(m[3]); if (t.length < 5) continue;
    out.push({ src: 'notice', t: tidy(t), raw: t, d: ymd(m[1]), u: SUMS + '/CollegePortal/' + m[2] });
  }
  if (!out.length) throw new Error('no notices found');
  return out;
}
// ---------- 3) Exam notice board ----------
function listById(html, id) {
  const i = html.indexOf(`id="${id}"`); if (i < 0) return [];
  const end = html.indexOf('</div>', i);
  return html.slice(i, end).split(/<li\b[^>]*>/i).slice(1).map(clean).filter(Boolean);
}
const semNice = s => s.replace(/\s+/g, ' ').replace(/\bB\.\s?(Tech|Arch|Des)\b/gi, (_, x) => 'B.' + x[0].toUpperCase() + x.slice(1).toLowerCase()).replace(/\b([IVX]+)(st|nd|rd|th)\b/g, '$1').trim();
function parseBoard(html) {
  const deadlines = [], results = [];
  for (const t of listById(html, 'ctl00_ContentPlaceHolder1_examlist')) {
    // "B. Tech UD IIIrd Sem - ( Back/Reback With 2000 Late  Fee) - Last Date - 30/10/2026 - Payment Upto - 30/10/2026"
    const m = t.match(/^(.*?)\s*-\s*\(\s*(.*?)\s*\)\s*-\s*Last Date\s*-?\s*([\d/.-]+)(?:\s*-\s*Payment Upto\s*-?\s*([\d/.-]+))?/i);
    if (!m) continue;
    deadlines.push({ kind: 'form', what: semNice(m[1]), note: m[2].replace(/\s+/g, ' ').replace(/(\d+)\s*Late\s*Fee/i, '₹$1 late fee').replace(/^with\s+/i, '').replace(/\bWith\b/g, 'with'), last: ymd(m[3]), pay: m[4] ? ymd(m[4]) : '', progs: progsOf(m[1]), ud: ud(m[1]) });
  }
  for (const t of listById(html, 'ctl00_ContentPlaceHolder1_revallist')) {
    // "B. Tech IInd Sem - [EVEN SEMESTER] - Last Date: 26/10/2026"
    const m = t.match(/^(.*?)\s*-\s*\[\s*(.*?)\s*\]\s*-\s*Last Date\s*:?\s*([\d/.-]+)/i);
    if (!m) continue;
    deadlines.push({ kind: 'reval', what: semNice(m[1]), note: m[2].replace(/\s+/g, ' ').toLowerCase(), last: ymd(m[3]), progs: progsOf(m[1]), ud: ud(m[1]) });
  }
  for (const t of listById(html, 'ctl00_ContentPlaceHolder1_resultdeclarelist')) {
    // "BBA IIIrd Sem- [ODD SEMESTER ODD SEMESTER (REVAL)] - Result Declared Date: 15/10/2026"
    const m = t.match(/^(.*?)\s*-\s*\[\s*(.*?)\s*\]\s*-\s*Result Declared Date\s*:?\s*([\d/.-]+)/i);
    if (!m) continue;
    const reval = /reval/i.test(m[2]);
    results.push({ what: semNice(m[1]), reval, sem: /even/i.test(m[2]) ? 'even' : /odd/i.test(m[2]) ? 'odd' : '', d: ymd(m[3]), progs: progsOf(m[1]) });
  }
  if (!deadlines.length && !results.length && !/examlist|revallist|resultdeclarelist/.test(html)) throw new Error('board lists not found');
  return { deadlines, results };
}

const SOURCES = [
  { id: 'news', name: 'News & Events', url: SUMS + '/', parse: parseHome },
  { id: 'notice', name: 'Instructions & Notifications', url: SUMS + '/CollegePortal/General_Notification.aspx', parse: parseNotices },
  { id: 'board', name: 'Exam notice board', url: SUMS + '/Monitoring/Examination/Activity_Monitoring.aspx', parse: parseBoard }
];
// automatic nahi padhte (Cloudflare challenge) — UI me seedha link
const BLOCKED = [
  { id: 'rtu', name: 'rtu.ac.in', url: 'https://www.rtu.ac.in/index/viewdata.php?page=More131', why: 'Cloudflare check' },
  { id: 'ud', name: 'UD RTU (udrtukota.ac.in)', url: 'https://udrtukota.ac.in/UTD/', why: 'Cloudflare check' }
];

// ---------- run ----------
const started = Date.now(), now = new Date().toISOString();
let prev = {};
try { prev = await (await fetch(PREV_SRC, { headers: { accept: 'application/vnd.github.raw', 'user-agent': 'rtuhub-news-check' }, signal: AbortSignal.timeout(15000) })).json(); } catch {}
const prevSrc = Object.fromEntries((prev.sources || []).map(s => [s.id, s]));
const prevItems = new Map((prev.items || []).map(x => [x.id, x]));

const sources = [], fresh = [];
let board = null;
for (const s of SOURCES) {
  const out = { id: s.id, name: s.name, url: s.url, site: 'rtu.sumsraj.com' };
  try {
    const got = s.parse(await getRetry(s.url));
    if (s.id === 'board') { board = got; out.count = got.deadlines.length + got.results.length; }
    else { fresh.push(...got); out.count = got.length; }
    out.ok = true; out.lastOk = now;
  } catch (e) {
    const p = prevSrc[s.id] || {};
    Object.assign(out, { ok: false, error: errText(e), stale: true, lastOk: p.lastOk || null, count: p.count || 0 });
  }
  sources.push(out);
}

// news items: naye + purane (history), duplicate hata ke
const items = new Map(prevItems);
for (const x of fresh) {
  const id = keyOf(x.src, x.raw, x.d);
  const old = items.get(id);
  const text = x.raw + ' ' + x.t;
  items.set(id, {
    id, t: x.t, d: x.d || (old && old.d) || now.slice(0, 10), u: x.u, src: x.src,
    cat: catOf(text), progs: progsOf(text), ud: ud(text), last: lastDateIn(x.raw) || undefined,
    // pehli baar (koi purana data nahi) to sab ko 'naya' mat maano: posted date hi first-seen
    first: old ? old.first : (prevItems.size ? now : (x.d ? x.d + 'T06:30:00.000Z' : now)), seen: now
  });
}
// News & Events aur notice me same baat ho to ek hi rakho (notice wala, kyunki uska link hai)
const cutoff = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString().slice(0, 10);
let list = [...items.values()].filter(x => x.d >= cutoff);
const sig = x => x.t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 60);
const noticeSigs = new Set(list.filter(x => x.src === 'notice').map(x => x.d + sig(x)));
list = list.filter(x => x.src !== 'news' || !noticeSigs.has(x.d + sig(x)));
list.sort((a, b) => b.d.localeCompare(a.d) || b.first.localeCompare(a.first));
list = list.slice(0, MAX_ITEMS);

const boardOk = sources.find(s => s.id === 'board').ok;
const data = {
  v: 1, checkedAt: now, runSeconds: Math.round((Date.now() - started) / 1000), everyHours: EVERY_HOURS, requests,
  sources, blocked: BLOCKED,
  deadlines: boardOk ? board.deadlines : (prev.deadlines || []), results: boardOk ? board.results : (prev.results || []),
  boardAt: boardOk ? now : (prev.boardAt || null),
  items: list
};
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/news.json', JSON.stringify(data));
console.log(`sources: ${sources.map(s => s.id + (s.ok ? ' ok(' + s.count + ')' : ' FAIL ' + s.error)).join(', ')}`);
console.log(`items: ${list.length} (new this run: ${list.filter(x => x.first === now).length}), deadlines: ${data.deadlines.length}, results: ${data.results.length}, requests: ${requests}, took ${data.runSeconds}s`);
const cats = {}; for (const x of list) cats[x.cat] = (cats[x.cat] || 0) + 1; console.log('categories:', JSON.stringify(cats));
