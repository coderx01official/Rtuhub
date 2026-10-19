// Har college ki official site se AICTE EOA (Extension of Approval) PDF dhoondta hai.
// EOA me branch-wise approved intake hota hai (official). Output: eoa-raw/<slug>/*.pdf + manifest.json
import fs from 'node:fs';
const OUT = process.env.OUT || 'eoa-raw';
const jobs = JSON.parse(fs.readFileSync(process.env.JOBS || 'tools/eoa-jobs.json', 'utf8'));
const UA = 'Mozilla/5.0 (compatible; rtuhub-data-fetch/1.0; +https://www.rtuhub.in)';
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT);
const PAGE = /aicte|approval|mandatory|disclosure|eoa|statutor|affiliat|e\.o\.a|extension|regulatory|compliance|about/i;
const PDF = /eoa|e\.o\.a|aicte|approv|extension|loa|letter.of/i;
async function get(u, ms = 45000) {
  const r = await fetch(u, { headers: { 'user-agent': UA, accept: '*/*' }, redirect: 'follow', signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error('HTTP ' + r.status); return r;
}
const abs = (h, b) => { try { return new URL(h.replace(/&amp;/g, '&'), b).href.split('#')[0]; } catch { return ''; } };
function links(html, base) {
  const out = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const h = (m[1].match(/href\s*=\s*["']([^"']+)["']/i) || [])[1]; if (!h || h.startsWith('mailto:') || h.startsWith('tel:') || h.startsWith('javascript')) continue;
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
    const u = abs(h, base); if (u) out.push([u, text]);
  }
  return out;
}
const score = s => (/(2025.?26|2025.?2026|25.?26)/.test(s) ? 100 : /(2024.?25|2024.?2025)/.test(s) ? 50 : 0) + (/eoa|extension/i.test(s) ? 20 : 0) + (/aicte/i.test(s) ? 10 : 0);
const manifest = {};
async function run(job) {
  const log = manifest[job.slug] = { name: job.name, web: job.web, pages: [], pdfs: [], errors: [] };
  const host = new URL(job.web).hostname.replace(/^www\./, '');
  const same = u => { try { return new URL(u).hostname.replace(/^www\./, '').endsWith(host) || host.endsWith(new URL(u).hostname.replace(/^www\./, '')); } catch { return false; } };
  const pdfs = new Map(); const seenPages = new Set();
  const visit = async (u, depth) => {
    if (seenPages.has(u) || seenPages.size > 14) return; seenPages.add(u);
    let html; try { const r = await get(u); if (!/html/.test(r.headers.get('content-type') || '')) return; html = await r.text(); log.pages.push(u); } catch (e) { log.errors.push(`${u}: ${e.message}`); return; }
    const L = links(html, u);
    for (const [l, t] of L) if (/\.pdf($|\?)/i.test(l) && (PDF.test(l) || PDF.test(t))) pdfs.set(l, Math.max(pdfs.get(l) || 0, score(l + ' ' + t)));
    if (depth < 2) for (const [l, t] of L) if (same(l) && !/\.(pdf|jpe?g|png|docx?|zip)($|\?)/i.test(l) && (PAGE.test(l) || PAGE.test(t))) await visit(l, depth + 1);
  };
  await visit(job.web, 0);
  const best = [...pdfs].sort((a, b) => b[1] - a[1]).slice(0, 6);
  fs.mkdirSync(`${OUT}/${job.slug}`);
  let n = 0;
  for (const [u, sc] of best) {
    try { const r = await get(u, 90000); const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > 14e6 || buf.slice(0, 4).toString() !== '%PDF') { log.errors.push(`${u}: not pdf/too big`); continue; }
      const f = `${++n}.pdf`; fs.writeFileSync(`${OUT}/${job.slug}/${f}`, buf); log.pdfs.push({ file: f, url: u, score: sc, size: buf.length });
    } catch (e) { log.errors.push(`${u}: ${e.message}`); }
  }
  log.allPdfLinks = [...pdfs].slice(0, 40);
}
const q = [...jobs];
await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) await run(q.shift()); }));
fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 1));
console.log(Object.entries(manifest).map(([s, m]) => `${s}: pages ${m.pages.length}, pdfs ${m.pdfs.length}`).join('\n'));
