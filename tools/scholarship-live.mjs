// =====================================================================
//  Scholarship LIVE checker — GitHub Action har ghante chalata hai.
//  1) Official portals (NSP, SJE Rajasthan, ...) ke scholarship notices
//  2) Har RTU college ki official site par "scholarship" wale links/notices
//  Output: out/scholarships.json  ->  "data" branch  ->  site seedha padhti hai (bina deploy ke).
//  Koi page na khule to pichhla data rakhte hain (stale: true), khaali nahi karte.
//  robots.txt maante hain, har site par 1-2 request, saaf user-agent.
// =====================================================================
import fs from 'node:fs';
import { COLLEGES } from '../src/colleges.js';
import { LIVE_SRC } from '../src/scholarships.js';

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
  { id: 'hte', name: 'Higher & Technical Education, Rajasthan', url: 'https://hte.rajasthan.gov.in/', type: 'official' },
  { id: 'lic', name: 'LIC of India', url: 'https://licindia.in/', type: 'official' },
  { id: 'ongc', name: 'ONGC Scholarship', url: 'https://ongcscholar.org/', type: 'official' },
  { id: 'b4s-rj', name: 'Buddy4Study: Rajasthan scholarships', url: 'https://www.buddy4study.com/article/rajasthan-scholarship', type: 'trusted' },
  { id: 'b4s-sje', name: 'Buddy4Study: SJE scholarship', url: 'https://www.buddy4study.com/article/sje-scholarship', type: 'trusted' },
  { id: 'c360-rj', name: 'Careers360: Rajasthan scholarship', url: 'https://school.careers360.com/articles/rajasthan-scholarship', type: 'trusted' }
];

async function get(url, ms = 25000) {
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,*/*' }, redirect: 'follow', signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r;
}
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
    const r = await get(s.url);
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

const started = Date.now();
let prev = {};
try { prev = await (await fetch(LIVE_SRC, { headers: { accept: 'application/vnd.github.raw', 'user-agent': 'rtuhub-scholarship-check' }, signal: AbortSignal.timeout(15000) })).json(); } catch {}
const prevSrc = Object.fromEntries((prev.sources || []).map(s => [s.id, s]));

const sources = await Promise.all(SOURCES.map(s => checkSource(s, prevSrc[s.id])));
const colleges = {};
const queue = COLLEGES.filter(c => c.web);
await Promise.all(Array.from({ length: 8 }, async () => {
  while (queue.length) { const c = queue.shift(); colleges[c.slug] = await checkCollege(c, (prev.colleges || {})[c.slug]); }
}));

const data = { v: 1, checkedAt: new Date().toISOString(), runSeconds: Math.round((Date.now() - started) / 1000), sources, colleges };
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/scholarships.json', JSON.stringify(data));
const okC = Object.values(colleges).filter(c => c.ok).length, withLinks = Object.values(colleges).filter(c => c.links && c.links.length).length;
console.log(`sources ok: ${sources.filter(s => s.ok).map(s => s.id).join(', ')} | failed: ${sources.filter(s => !s.ok).map(s => s.id + '(' + s.error + ')').join(', ')}`);
console.log(`colleges reachable: ${okC}/${Object.keys(colleges).length}, with scholarship links: ${withLinks}, took ${data.runSeconds}s`);
