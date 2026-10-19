// Round 2: WordPress media API + sitemap + gehra crawl. 2026-27 EOA sabse pehle.
import fs from 'node:fs';
const OUT = process.env.OUT || 'eoa-raw2';
const jobs = JSON.parse(fs.readFileSync(process.env.JOBS || 'tools/eoa-jobs2.json', 'utf8'));
const UA = 'Mozilla/5.0 (compatible; rtuhub-data-fetch/1.0; +https://www.rtuhub.in)';
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT);
const PAGE = /aicte|approv|mandatory|disclosure|eoa|statutor|affiliat|extension|regulatory|compliance|naac|nirf|iqac|about|download|notice|document/i;
const PDF = /eoa|e\.o\.a|aicte|approv|extension|loa|letter.of|intake|sanction/i;
async function get(u, ms = 40000) {
  const r = await fetch(u, { headers: { 'user-agent': UA, accept: '*/*' }, redirect: 'follow', signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error('HTTP ' + r.status); return r;
}
const abs = (h, b) => { try { return new URL(h.replace(/&amp;/g, '&').trim(), b).href.split('#')[0]; } catch { return ''; } };
function links(html, base) {
  const out = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const h = (m[1].match(/href\s*=\s*["']([^"']+)["']/i) || [])[1]; if (!h || /^(mailto|tel|javascript|whatsapp)/i.test(h)) continue;
    const u = abs(h, base); if (u) out.push([u, m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)]);
  }
  for (const m of html.matchAll(/["'](https?:[^"'\s]+?\.pdf)["']/gi)) out.push([m[1].replace(/\\\//g, '/'), '']);
  return out;
}
const score = s => (/(2026.?27|2026.?2027|26.?27)/.test(s) ? 200 : /(2025.?26|2025.?2026|25.?26)/.test(s) ? 100 : /(2024.?25|2024.?2025)/.test(s) ? 40 : 0) + (/eoa|extension/i.test(s) ? 20 : 0) + (/aicte/i.test(s) ? 10 : 0) - (/rtu|affiliat|mba|mca|fee|scholar|notice|exam/i.test(s) ? 15 : 0);
const manifest = {};
async function run(job) {
  const log = manifest[job.slug] = { name: job.name, web: job.web, pages: [], pdfs: [], errors: [], via: {} };
  const origin = new URL(job.web).origin; const host = new URL(job.web).hostname.replace(/^www\./, '');
  const same = u => { try { const h = new URL(u).hostname.replace(/^www\./, ''); return h.endsWith(host) || host.endsWith(h); } catch { return false; } };
  const pdfs = new Map(); const add = (u, t, via) => { if (!/\.pdf($|\?)/i.test(u)) return; if (!(PDF.test(u) || PDF.test(t))) return; const sc = score(u + ' ' + t); if ((pdfs.get(u) ?? -1) < sc) pdfs.set(u, sc); log.via[u] = via; };
  // 1) WordPress media search
  for (const base of [origin, job.web.replace(/\/$/, '')]) for (const s of ['eoa', 'aicte', 'approval', 'extension']) {
    try { const r = await get(`${base}/wp-json/wp/v2/media?search=${s}&per_page=100`, 25000); const j = await r.json(); if (Array.isArray(j)) for (const m of j) add(m.source_url || '', (m.title && m.title.rendered) || '', 'wp-media'); } catch {}
  }
  // 2) sitemap
  const pagesFromMap = [];
  for (const sm of ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml', '/page-sitemap.xml']) {
    try { const t = await (await get(origin + sm, 25000)).text();
      const locs = [...t.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]);
      for (const l of locs) { if (/\.xml($|\?)/.test(l) && pagesFromMap.length < 400) { try { const t2 = await (await get(l, 25000)).text(); for (const m of t2.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) pagesFromMap.push(m[1]); } catch {} } else pagesFromMap.push(l); }
    } catch {}
  }
  for (const l of pagesFromMap) add(l, '', 'sitemap');
  // 3) crawl
  const seen = new Set(); let budget = 30;
  const queue = [[job.web, 0], ...pagesFromMap.filter(l => /aicte|approv|mandatory|disclosure|eoa|statutor/i.test(l)).slice(0, 10).map(l => [l, 1])];
  while (queue.length && budget > 0) {
    const [u, d] = queue.shift(); if (seen.has(u)) continue; seen.add(u); budget--;
    let html; try { const r = await get(u); if (!/html/.test(r.headers.get('content-type') || '')) continue; html = await r.text(); log.pages.push(u); } catch (e) { log.errors.push(`${u}: ${e.message}`); continue; }
    const L = links(html, u);
    for (const [l, t] of L) add(l, t, 'page:' + u);
    if (d < 3) for (const [l, t] of L) if (same(l) && !seen.has(l) && !/\.(pdf|jpe?g|png|docx?|zip|xlsx?)($|\?)/i.test(l) && (PAGE.test(l) || PAGE.test(t))) queue.push([l, d + 1]);
  }
  const best = [...pdfs].sort((a, b) => b[1] - a[1]).filter(([, s]) => s >= 30).slice(0, 5);
  fs.mkdirSync(`${OUT}/${job.slug}`); let n = 0;
  for (const [u, sc] of best) {
    try { const r = await get(u, 90000); const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > 14e6 || buf.slice(0, 4).toString() !== '%PDF') { log.errors.push(`${u}: not pdf`); continue; }
      const f = `${++n}.pdf`; fs.writeFileSync(`${OUT}/${job.slug}/${f}`, buf); log.pdfs.push({ file: f, url: u, score: sc, via: log.via[u] });
    } catch (e) { log.errors.push(`${u}: ${e.message}`); }
  }
  log.top = [...pdfs].sort((a, b) => b[1] - a[1]).slice(0, 25); delete log.via;
}
const q = [...jobs];
await Promise.all(Array.from({ length: 8 }, async () => { while (q.length) await run(q.shift()); }));
fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 1));
console.log(Object.entries(manifest).map(([s, m]) => `${s}: pages ${m.pages.length}, pdfs ${m.pdfs.length}`).join('\n'));
