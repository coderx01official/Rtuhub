// Har college ke logo ke candidates download karta hai (GitHub Actions me chalta hai, wahan internet khula hai).
// Sources: college ki official website (logo img, apple-touch-icon, og:image), Wikipedia infobox, college listing page.
// Output: logos-raw/<slug>/<n>-<source>.<ext> + logos-raw/manifest.json. Sahi logo baad me haath se chuna jaata hai.
import fs from 'node:fs';

const jobs = JSON.parse(fs.readFileSync('tools/logo-jobs.json', 'utf8'));
const OUT = 'logos-raw';
const UA = 'Mozilla/5.0 (compatible; rtuhub-logo-fetch/1.0; +https://www.rtuhub.in)';
const MAX_PER_SOURCE = 6;

async function get(url, ms = 15000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*' }, redirect: 'follow', signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r;
  } finally { clearTimeout(t); }
}
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, 'i')); return m ? m[2].trim() : ''; };
const abs = (u, base) => { try { return new URL(u.replace(/&amp;/g, '&'), base).href; } catch { return ''; } };

function candidatesFromHtml(html, base) {
  const out = [];
  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    if (!/logo|emblem|brand/i.test(tag)) continue;
    const src = attr(tag, 'data-src') || attr(tag, 'data-lazy-src') || attr(tag, 'src') || (attr(tag, 'srcset').split(/\s+/)[0] || '');
    if (src && !src.startsWith('data:')) out.push(['img', abs(src, base)]);
  }
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const rel = attr(tag, 'rel').toLowerCase();
    if (rel.includes('apple-touch-icon') || (rel.includes('icon') && /\d{3}/.test(attr(tag, 'sizes')))) out.push(['icon', abs(attr(tag, 'href'), base)]);
  }
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (/og:image|twitter:image/i.test(attr(tag, 'property') + attr(tag, 'name'))) out.push(['og', abs(attr(tag, 'content'), base)]);
  }
  return out.filter(([, u]) => u);
}

async function fromPage(url) {
  const r = await get(url); const html = await r.text();
  return candidatesFromHtml(html, r.url).slice(0, MAX_PER_SOURCE * 2);
}

async function fromWiki(q) {
  const api = 'https://en.wikipedia.org/w/api.php?format=json&origin=*&';
  const s = await (await get(api + 'action=query&list=search&srlimit=1&srsearch=' + encodeURIComponent(q))).json();
  const title = s.query?.search?.[0]?.title; if (!title) return [];
  const p = await (await get(api + 'action=parse&prop=text&section=0&page=' + encodeURIComponent(title))).json();
  const html = p.parse?.text?.['*'] || '';
  const imgs = (html.match(/<img\b[^>]*>/gi) || []).map(t => abs(attr(t, 'src'), 'https://en.wikipedia.org/'))
    .filter(u => /logo|emblem|seal|crest|insignia/i.test(u))
    // thumb URL -> 400px version
    .map(u => u.replace(/\/(\d+)px-/, '/400px-'));
  return imgs.slice(0, 3).map(u => ['wiki', u, title]);
}

const extOf = (type, url) => {
  if (/svg/.test(type)) return 'svg'; if (/png/.test(type)) return 'png'; if (/webp/.test(type)) return 'webp';
  if (/jpe?g/.test(type)) return 'jpg'; if (/gif/.test(type)) return 'gif'; if (/icon/.test(type)) return 'ico';
  const m = url.split('?')[0].match(/\.(png|jpe?g|svg|webp|gif|ico)$/i); return m ? m[1].toLowerCase() : '';
};

const manifest = {};
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT);

async function run(job) {
  const dir = `${OUT}/${job.slug}`; fs.mkdirSync(dir);
  const log = manifest[job.slug] = { name: job.name, files: [], errors: [] };
  const cands = [];
  const sources = [...(job.web ? [job.web] : []), ...job.urls];
  for (const u of sources) { try { cands.push(...await fromPage(u)); } catch (e) { log.errors.push(`${u}: ${e.message}`); } }
  try { cands.push(...await fromWiki(job.wiki || `${job.name} ${job.city}`)); } catch (e) { log.errors.push('wiki: ' + e.message); }
  const seen = new Set(); let n = 0;
  for (const [src, url, note] of cands) {
    if (seen.has(url) || n >= 10) continue; seen.add(url);
    try {
      const r = await get(url); const type = r.headers.get('content-type') || '';
      const ext = extOf(type, url); if (!ext) continue;
      const buf = Buffer.from(await r.arrayBuffer()); if (buf.length < 200 || buf.length > 3e6) continue;
      const file = `${++n}-${src}.${ext}`; fs.writeFileSync(`${dir}/${file}`, buf);
      log.files.push({ file, url, note: note || '' });
    } catch (e) { log.errors.push(`${url}: ${e.message}`); }
  }
}

// 6 colleges ek saath
const queue = [...jobs];
await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) await run(queue.shift()); }));
fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 1));
const got = Object.values(manifest).filter(m => m.files.length).length;
console.log(`candidates saved for ${got}/${jobs.length} colleges`);
