// =====================================================================
//  Scholarship LIVE checker — GitHub Action har 6 ghante chalata hai.
//  Aaram se padhta hai: ek waqt me 2 request, beech me 2–5 s ka random gap, ek site par 8 s ka gap.
//  1) Official portals (NSP, SJE Rajasthan, ...) ke scholarship notices
//  2) Har RTU college ki official site par "scholarship" wale links/notices
//  Output: out/scholarships.json  ->  "data" branch  ->  site seedha padhti hai (bina deploy ke).
//  Koi page na khule to pichhla data rakhte hain (stale: true), khaali nahi karte.
//  robots.txt maante hain, har site par 1-2 request, saaf user-agent.
// =====================================================================
import fs from 'node:fs';
import { COLLEGES } from '../src/colleges.js';
import { LIVE_SRC, SCHOLARSHIPS, SCH_SESSION } from '../src/scholarships.js';

const UA = 'Mozilla/5.0 (compatible; rtuhub-scholarship-check/1.0; +https://www.rtuhub.in/scholarships)';
const REL = /scholarship|छात्रवृत्ति|nsp\b|pragati|saksham|swanath|post.?matric|biometric|बायोमेट्रिक|fee.?waiver|tfws|\bdbt\b|\botr\b|one time registration/i;
const NOTICE = /20\d\d|last date|deadline|extension|extended|apply|renewal|open|अंतिम|दिनांक|तिथि|notice|circular|guideline|%|₹|rs\.?\s?\d/i;
const STOP = /^(home|student|students|institute|officer|about us|menu|skip to( main)? content|login|register|click here|read more|view|view more|download|more|scholarships?|scholarship portal|scholarship info|apply now)$/i;
const NOISE = /seniority|tender|recruit|transfer|चतुर्थ श्रेणी|कर्मचारी|vacanc|result of exam|admit card/i;
// SJMS, AICTE, KSB: India ke bahar (GitHub server) se connection nahi dete; Minority Dept: robots.txt me mana.
// Inki schemes NSP / SJE ke notices aur haath se check ki jaati hain (site par likha hai).
const SOURCES = [
  // official = sarkar / provider ki apni site, trusted = jaani-maani scholarship guide sites (unofficial)
  { id: 'nsp', name: 'National Scholarship Portal', url: 'https://scholarships.gov.in/', type: 'official' },
  { id: 'sje', name: 'SJE Rajasthan (post matric)', url: 'https://sje.rajasthan.gov.in/', type: 'official' },
  { id: 'hte', name: 'Higher & Technical Education, Rajasthan', url: 'https://hte.rajasthan.gov.in/', alt: ['https://hte.rajasthan.gov.in/dept/dce'], type: 'official' },
  { id: 'lic', name: 'LIC of India', url: 'https://licindia.in/', type: 'official' },
  { id: 'ongc', name: 'ONGC Scholarship', url: 'https://ongcscholar.org/', type: 'official' },
  { id: 'b4s-rj', name: 'Buddy4Study: Rajasthan scholarships', url: 'https://www.buddy4study.com/article/rajasthan-scholarship', type: 'trusted' },
  { id: 'b4s-sje', name: 'Buddy4Study: SJE scholarship', url: 'https://www.buddy4study.com/article/sje-scholarship', type: 'trusted' },
  { id: 'c360-rj', name: 'Careers360: Rajasthan scholarship', url: 'https://school.careers360.com/articles/rajasthan-scholarship', type: 'trusted' }
];

// ---------- polite crawling: sab sites ek saath nahi ----------
// Har request ki baari "gate" se aati hai: pichhli request se 2–5 s baad, aur usi site par pichhli se 8 s baad.
// Ek waqt me max 2 request chal rahi hoti hain. User-agent saaf (rtuhub), robots.txt maante hain.
const GAP = [2000, 5000], HOST_GAP = 8000, MAX_PAR = 2;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let gate = Promise.resolve(), lastStart = 0, active = 0, requests = 0;
const lastHit = new Map(), waiting = [];
async function pace(url) {
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } })();
  const turn = gate.then(async () => {
    const wait = Math.max(lastStart + GAP[0] + Math.random() * (GAP[1] - GAP[0]), (lastHit.get(host) || 0) + HOST_GAP) - Date.now();
    if (wait > 0) await sleep(wait);
    lastStart = Date.now(); lastHit.set(host, lastStart);
  });
  gate = turn.catch(() => {});
  await turn;
  while (active >= MAX_PAR) await new Promise(r => waiting.push(r));
  active++; requests++;
}
const done = () => { active--; const w = waiting.shift(); if (w) w(); };
// timeout baari aane ke BAAD shuru hota hai (queue ka intezaar timeout me nahi ginta)
async function politeFetch(url, opts, ms = 25000) { await pace(url); try { return await fetch(url, { ...opts, signal: AbortSignal.timeout(ms) }); } finally { done(); } }
async function get(url, ms = 25000) {
  const r = await politeFetch(url, { headers: { 'user-agent': UA, accept: 'text/html,*/*' }, redirect: 'follow' }, ms);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r;
}
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const errText = e => String(e?.cause?.code || e?.name === 'TimeoutError' && 'timeout' || e?.message || e).slice(0, 80);
const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
const clean = s => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const abs = (h, b) => { try { return new URL(decode(h).trim(), b).href.split('#')[0]; } catch { return ''; } };
const fromFile = u => { try { return decodeURIComponent(new URL(u).pathname.split('/').pop()).replace(/\.(pdf|aspx?|php|html?)$/i, '').replace(/[-_+]+/g, ' ').trim(); } catch { return ''; } };

// robots.txt (User-agent: *) ka Disallow
const robotsCache = new Map();
async function allowed(url) {
  const u = new URL(url);
  if (!robotsCache.has(u.origin)) {
    let rules = [];
    try {
      const t = await (await get(u.origin + '/robots.txt', 10000)).text();
      let on = false;
      for (const raw of t.split(/\r?\n/)) {
        const line = raw.replace(/#.*/, '').trim(); const m = line.match(/^([\w-]+)\s*:\s*(.*)$/); if (!m) continue;
        const k = m[1].toLowerCase(), v = m[2].trim();
        if (k === 'user-agent') on = v === '*' || /rtuhub/i.test(v);
        else if (on && k === 'disallow' && v) rules.push(v);
      }
    } catch {}
    robotsCache.set(u.origin, rules);
  }
  return !robotsCache.get(u.origin).some(p => u.pathname.startsWith(p));
}

// page se relevant links + text lines (notice jaise pehle, menu/nav ke links hata ke)
function extract(html, base) {
  const title = clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').toLowerCase();
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->|<nav\b[\s\S]*?<\/nav>|<header\b[\s\S]*?<\/header>/gi, ' ');
  const items = []; const seen = new Set();
  const bad = t => !t || t.length < 6 || STOP.test(t) || NOISE.test(t) || t.toLowerCase() === title || /^https?:\/\//.test(t);
  for (const m of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const h = (m[1].match(/href\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!h || /^(mailto|tel|javascript|whatsapp)/i.test(h)) continue;
    const u = abs(h, base); if (!u) continue;
    const pdf = /\.pdf($|\?)/i.test(u);
    let t = clean(m[2]) || clean((m[1].match(/title\s*=\s*["']([^"']+)["']/i) || [])[1] || '');
    if ((!t || t.length < 6) && pdf) t = fromFile(u);
    if (bad(t)) continue;
    if (!(REL.test(t) || (pdf && REL.test(fromFile(u))))) continue;
    const key = t.toLowerCase(); if (seen.has(key)) continue; seen.add(key);
    items.push({ t: t.slice(0, 220), u, s: (NOTICE.test(t) ? 3 : 0) + (pdf ? 2 : 0) + (t.length > 40 ? 1 : 0) });
  }
  const text = decode(body.replace(/<(br|\/p|\/li|\/div|\/h\d|\/td|\/marquee|\/span)[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' '));
  for (let line of text.split('\n')) {
    line = line.replace(/\s+/g, ' ').trim();
    if (line.length < 25 || line.length > 400 || !REL.test(line) || bad(line)) continue;
    const key = line.toLowerCase();
    if (seen.has(key) || items.some(i => key.includes(i.t.toLowerCase()) && i.t.length > 30)) continue; seen.add(key);
    items.push({ t: line.slice(0, 300), s: (NOTICE.test(line) ? 3 : 0) + 1 });
  }
  return items.map((it, i) => ({ ...it, i })).sort((a, b) => b.s - a.s || a.i - b.i).map(({ t, u }) => (u ? { t, u } : { t }));
}
const hashOf = items => items.map(i => i.t + '|' + (i.u || '')).join('\n');

async function checkSource(s, prev) {
  const out = { id: s.id, name: s.name, url: s.url, type: s.type, site: new URL(s.url).hostname.replace(/^www\./, '') };
  try {
    if (!(await allowed(s.url))) throw new Error('robots.txt disallows');
    // dheemi sarkari site: 2 baar try, phir doosra page (agar ho)
    let r, last;
    for (const u of [s.url, s.url, ...(s.alt || [])]) {
      try { r = await get(u, 35000); break; } catch (e) { last = e; await new Promise(z => setTimeout(z, 4000)); }
    }
    if (!r) throw last;
    const items = extract(await r.text(), r.url).slice(0, s.type === 'trusted' ? 8 : 14);
    out.ok = true; out.notices = items;
    const h = hashOf(items);
    out.hash = h.length; out.sig = h.slice(0, 2000);
    out.changedAt = prev && prev.sig === out.sig ? prev.changedAt : new Date().toISOString();
  } catch (e) {
    out.ok = false; out.error = errText(e);
    if (prev && prev.notices) { out.notices = prev.notices; out.stale = true; out.changedAt = prev.changedAt; out.sig = prev.sig; out.lastOk = prev.lastOk; }
  }
  if (out.ok) out.lastOk = new Date().toISOString();
  return out;
}

async function checkCollege(c, prev) {
  const out = { url: c.web };
  try {
    if (!(await allowed(c.web))) throw new Error('robots.txt disallows');
    const r = await get(c.web, 20000);
    const html = await r.text();
    let items = extract(html, r.url);
    const host = new URL(r.url).hostname.replace(/^www\./, '');
    // ek scholarship page ho to usse bhi padho
    let page = null;
    for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const h = (m[1].match(/href\s*=\s*["']([^"']+)["']/i) || [])[1]; if (!h) continue;
      const u = abs(h, r.url); if (!u || /\.pdf($|\?)/i.test(u) || u === r.url) continue;
      let hh = ''; try { hh = new URL(u).hostname.replace(/^www\./, ''); } catch { continue; }
      if (hh.endsWith(host) && /scholarship|छात्रवृत्ति/i.test(u + ' ' + clean(m[2]))) { page = { u }; break; }
    }
    if (page && (await allowed(page.u))) {
      try { const r2 = await get(page.u, 20000); const more = extract(await r2.text(), r2.url); items = [...more, ...items]; out.page = page.u; } catch {}
    }
    const seen = new Set();
    out.links = items.filter(i => { const k = (i.u || i.t).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
      .filter(i => i.u ? new URL(i.u).hostname.replace(/^www\./, '').endsWith(host) || /\.pdf($|\?)/i.test(i.u) || /scholarships\.gov\.in|sso\.rajasthan|sjmsnew/.test(i.u) : true)
      .slice(0, 8);
    out.ok = true; out.lastOk = new Date().toISOString();
  } catch (e) {
    out.ok = false; out.error = errText(e);
    if (prev && prev.links) { out.links = prev.links; out.stale = true; out.lastOk = prev.lastOk; out.page = prev.page; }
  }
  return out;
}

// ---------- 3) APPLY TRACKER: private scholarships ka asli form link + last date ----------
// Buddy4Study (inka official partner) ke page me har round ka { title, deadline, applyLink } JSON hota hai.
// Har check me naya round dhoondte hain: B.Tech wala round, sabse nayi deadline. Naya session na ho to "abhi nahi khula".
const TRACK = {
  'pvt-kotak': { page: 'https://www.buddy4study.com/page/kotak-kanya-scholarship', pick: /kotak kanya/i },
  'pvt-aditya': { page: 'https://www.buddy4study.com/page/aditya-birla-capital-scholarship', pick: /undergraduate|professional graduation/i },
  'pvt-hdfc': { page: 'https://www.buddy4study.com/page/hdfc-bank-parivartans-ecss-programme', pick: /undergraduate/i },
  'pvt-reliance': { page: 'https://www.buddy4study.com/page/reliance-foundation-scholarships', pick: /undergraduate/i },
  'pvt-tata': { page: 'https://www.buddy4study.com/page/the-tata-capital-pankh-scholarship-programme', pick: /specialised|professional/i },
  'pvt-legrand': { type: 'scholarlify', page: 'https://scholarlify.com/s/LESPGC' },
  'pvt-siemens': { type: 'b4s-one', page: 'https://www.buddy4study.com/scholarship/siemens-scholarship-program-2026' },
  'pvt-infosys': { page: 'https://www.buddy4study.com/scholarship/infosys-stem-stars-scholarship', pick: /stem stars/i },
  'pvt-glow': { type: 'scholarlify', page: 'https://scholarlify.com/s/FLS2025' }
};
const NOT_UG = /class\s*\d|school|11th|9-12|post\s*graduat|postgraduate|\bpg\b/i;
const [sy] = SCH_SESSION.split('-');                       // '2026'
const sessionOf = t => { const m = String(t).match(/(20\d\d)\s*[-–]\s*(\d\d)/); return m ? m[1] + '-' + m[2] : ''; };
function rounds(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return [];
  const out = [];
  (function walk(o) {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== 'object') return;
    if (typeof o.deadline === 'string' && typeof o.applyLink === 'string' && o.title) out.push({ title: String(o.title).trim(), key: String(o.title) + ' ' + String(o.slug || '').replace(/-/g, ' '), deadline: o.deadline.slice(0, 10), link: o.applyLink.trim(), launch: o.applicationLaunchDate ? String(o.applicationLaunchDate).slice(0, 10) : '' });
    Object.values(o).forEach(walk);
  })(JSON.parse(m[1]));
  return out;
}
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const ymdOf = (d, m, y) => MONTHS[m.slice(0, 3).toLowerCase()] ? `${y}-${String(MONTHS[m.slice(0, 3).toLowerCase()]).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
const curSes = ses => ses === SCH_SESSION || ses === sy || ses.startsWith(sy + '-');
// Scholarlify (Legrand, Glow & Lovely ka partner): title me session, page par "Deadline 30 Sep 2026", dashboard ka form link
function scholarlify(html, page) {
  const title = clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').replace(/\s*\|.*$/, '');
  const m = title.match(/(20\d\d)\s*[-–]\s*(\d\d)/), y = title.match(/\b(20\d\d)\b/);
  const session = m ? m[1] + '-' + m[2] : y ? y[1] : '';
  const text = clean(html);
  const dm = text.match(/(?:Deadline|close[sd]? on)\s*:?\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d\d)/i);
  const code = (page.match(/\/s\/([A-Za-z0-9]+)/) || [])[1];
  const link = code && html.includes('dashboard.scholarlify.com/s.html?sch=' + code) ? 'https://dashboard.scholarlify.com/s.html?sch=' + code : page;
  return { title, session, deadline: dm ? ymdOf(dm[1], dm[2], dm[3]) : '', link, current: curSes(session) };
}
// Buddy4Study ka ek scholarship page (rounds list nahi): bsid se form link, deadline ya "no fixed deadline"
function b4sOne(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/); if (!m) throw new Error('no data');
  const sc = JSON.parse(m[1])?.props?.pageProps?.scholarship?.scholarship; if (!sc || !sc.bsid) throw new Error('no scholarship');
  const session = String(sc.session || '');
  return { title: sc.scholarshipName, session, deadline: String(sc.onlineDeadline || sc.deadlineDate || '').slice(0, 10), noDeadline: !!(sc.isInfiniteDeadline || sc.infiniteDeadline),
    launch: String(sc.applicationLaunchDate || '').slice(0, 10), link: 'https://www.buddy4study.com/application/' + encodeURIComponent(sc.bsid) + '/instruction', current: curSes(session) && sc.status === 1 };
}
async function track(id, t, prev) {
  const out = { page: t.page, src: t.type === 'scholarlify' ? 'Scholarlify' : 'Buddy4Study' };
  try {
    if (!(await allowed(t.page))) throw new Error('robots.txt disallows');
    const r = await get(t.page, 35000);
    const html = await r.text();
    if (t.type) {
      Object.assign(out, t.type === 'scholarlify' ? scholarlify(html, r.url) : b4sOne(html), { ok: true });
      out.changedAt = prev && prev.deadline === out.deadline && prev.link === out.link ? prev.changedAt : new Date().toISOString();
      out.at = new Date().toISOString();
      return [id, out];
    }
    const all = rounds(html).filter(x => t.pick.test(x.key) && !NOT_UG.test(x.key) && /^\d{4}-\d\d-\d\d$/.test(x.deadline));
    if (!all.length) throw new Error('no round found');
    all.sort((a, b) => b.deadline.localeCompare(a.deadline));
    const x = all[0], ses = sessionOf(x.title);
    Object.assign(out, { ok: true, title: x.title, deadline: x.deadline, launch: x.launch, session: ses,
      current: ses ? ses === SCH_SESSION : x.deadline >= sy + '-07-01',
      link: /^https:\/\/(www\.|forms\.)?buddy4study\.com\/|^https:\/\/(www\.)?scholarships\.reliancefoundation\.org\//.test(x.link) ? x.link : '' });
    out.changedAt = prev && prev.deadline === out.deadline && prev.link === out.link ? prev.changedAt : new Date().toISOString();
    out.at = new Date().toISOString();
  } catch (e) {
    out.ok = false; out.error = errText(e);
    if (prev && prev.title) { Object.assign(out, { ...prev, ok: false, error: out.error, stale: true }); }
  }
  return [id, out];
}
// ---------- 4) LINK CHECK: har Apply / registration link khulta hai ya nahi ----------
// SPA form pages (forms.buddy4study.com) server ko 404 dete hain par browser me khulte hain: unhe chhod do.
// AICTE / KSB / SJMS bahar se block karte hain: unhe bhi.
const SKIP_CHECK = /dashboard\.scholarlify\.com|forms\.buddy4study\.com|buddy4study\.com\/application\/|aicte-india\.org|ksb\.gov\.in|sjmsnew\.rajasthan/;
async function checkLink(u) {
  try {
    if (!(await allowed(u))) return [u, { ok: null, note: 'robots' }];
    const r = await politeFetch(u, { headers: { 'user-agent': UA, accept: 'text/html,*/*' }, redirect: 'follow' }, 30000);
    try { await r.body?.cancel(); } catch {}
    return [u, { ok: r.ok, status: r.status, at: new Date().toISOString() }];
  } catch (e) { return [u, { ok: false, error: errText(e), at: new Date().toISOString() }]; }
}

const started = Date.now();
let prev = {};
try { prev = await (await fetch(LIVE_SRC, { headers: { accept: 'application/vnd.github.raw', 'user-agent': 'rtuhub-scholarship-check' }, signal: AbortSignal.timeout(15000) })).json(); } catch {}
const prevSrc = Object.fromEntries((prev.sources || []).map(s => [s.id, s]));

const sources = await Promise.all(SOURCES.map(s => checkSource(s, prevSrc[s.id])));
const colleges = {};
const queue = shuffle(COLLEGES.filter(c => c.web));   // har baar alag order
await Promise.all(Array.from({ length: 8 }, async () => {
  while (queue.length) { const c = queue.shift(); colleges[c.slug] = await checkCollege(c, (prev.colleges || {})[c.slug]); }
}));

const apply = Object.fromEntries(await Promise.all(Object.entries(TRACK).map(([id, t]) => track(id, t, (prev.apply || {})[id]))));
const urls = shuffle([...new Set(SCHOLARSHIPS.flatMap(s => [s.apply, s.reg && s.reg[0]]).concat(Object.values(apply).map(a => a.link)).filter(u => u && !SKIP_CHECK.test(u)).map(u => u.split('#')[0]))]);
const links = {};
await Promise.all(Array.from({ length: 6 }, async () => { while (urls.length) { const [u, r] = await checkLink(urls.shift()); links[u] = r; } }));

const data = { v: 2, checkedAt: new Date().toISOString(), runSeconds: Math.round((Date.now() - started) / 1000), everyHours: 6, requests, sources, colleges, apply, links };
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/scholarships.json', JSON.stringify(data));
const okC = Object.values(colleges).filter(c => c.ok).length, withLinks = Object.values(colleges).filter(c => c.links && c.links.length).length;
console.log(`sources ok: ${sources.filter(s => s.ok).map(s => s.id).join(', ')} | failed: ${sources.filter(s => !s.ok).map(s => s.id + '(' + s.error + ')').join(', ')}`);
console.log(`requests: ${requests} (paced), colleges reachable: ${okC}/${Object.keys(colleges).length}, with scholarship links: ${withLinks}, took ${data.runSeconds}s`);
console.log('apply: ' + Object.entries(apply).map(([id, a]) => `${id}=${a.ok ? (a.current ? 'open ' + a.deadline : 'not-open (' + (a.session || a.deadline) + ')') : 'fail ' + a.error}`).join(', '));
console.log('links: ' + Object.entries(links).filter(([, r]) => r.ok === false).map(([u, r]) => u + ' ' + (r.status || r.error)).join(', ') || 'links: all ok');
