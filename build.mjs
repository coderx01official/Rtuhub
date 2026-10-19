// =====================================================================
//  BUILD:  node build.mjs          -> dist/ banata hai (Vercel yahi chalata hai)
//          node build.mjs --serve  -> build + http://localhost:4173 par dekho
//
//  1. React code ko ek chhoti minified JS + CSS file mein pack karta hai
//  2. Har URL ka taiyaar HTML page banata hai (Google ke liye) + sitemap.xml
// =====================================================================
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

const DIST = 'dist';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// pdf.js (paper viewer) apni hi site se serve hota hai: node_modules se dist/assets/pdfjs-<version>/ mein copy
const PDFJS_SRC = 'node_modules/pdfjs-dist';
const PDFJS = '/assets/pdfjs-' + JSON.parse(fs.readFileSync(PDFJS_SRC + '/package.json', 'utf8')).version + '/';
const common = { entryPoints: ['src/app.jsx'], bundle: true, jsx: 'automatic', logLevel: 'warning', define: { __PDFJS__: JSON.stringify(PDFJS) } };

fs.rmSync(DIST, { recursive: true, force: true });

// ---------- 0. animated notes ----------
// notes/<subject>/unit-N.html  ->  dist/anotes/<subject>/unit-N.html  (site ke andar frame mein khulte hain)
// Nayi file jodni ho to bas us folder mein daal do; list (src/anotes.json) yahin se banti hai.
const text = h => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/\s+/g, ' ').trim();
// R2 bucket "notes" (1ST YEAR/Animated Notes/<Subject>/Unit N.html) bhi: Vercel build par keys hon to wahan se le aao.
// Same subject + unit repo aur bucket dono mein ho to bucket wala.
const sources = {};   // slug -> { n -> file }
const addSrc = (slug, n, file) => { (sources[slug] = sources[slug] || {})[n] = file; };
if (fs.existsSync('notes')) for (const dir of fs.readdirSync('notes').sort()) {
  if (!fs.statSync('notes/' + dir).isDirectory()) continue;
  for (const f of fs.readdirSync('notes/' + dir)) { const m = f.match(/^unit[-_ ]?(\d+)\.html?$/i); if (m) addSrc(dir, +m[1], `notes/${dir}/${f}`); }
}
{
  const { listSyllabus, fetchSyllabusFile, syllabusReady } = await import('./api/_r2.js');
  const PREFIX = '1ST YEAR/Animated Notes/', CACHE = '.notes-r2';
  if (syllabusReady()) {
    try {
      const keys = (await listSyllabus(process.env.NOTES_BUCKET || 'notes', PREFIX)).map(([k]) => k);
      let got = 0;
      await Promise.all(keys.map(async key => {
        const [subject, file] = key.slice(PREFIX.length).split('/');
        const m = file && !key.slice(PREFIX.length).split('/')[2] && file.match(/^unit[-_ ]?(\d+)\.html?$/i);
        if (!subject || !m) return;
        const res = await fetchSyllabusFile(key, null, process.env.NOTES_BUCKET || 'notes');
        if (!res.ok) { console.warn('notes: ' + key + ' -> ' + res.status); return; }
        const sl = subject.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const out = `${CACHE}/${sl}/unit-${m[1]}.html`;
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
        addSrc(sl, +m[1], out); got++;
      }));
      console.log(`notes bucket: ${got} unit files`);
    } catch (e) { console.warn('notes bucket skipped: ' + e.message); }
  }
}
const anotes = [];
for (const dir of Object.keys(sources).sort()) {
  const units = [];
  for (const [num, file] of Object.entries(sources[dir])) {
    const m = [null, num];
    let html = fs.readFileSync(file, 'utf8').replace(/^\s*```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
    // kuch files mein </html> ke baad bhi content hai: use page ke andar le aao
    const end = html.search(/<\/body>\s*<\/html>/i);
    if (end >= 0) {
      let head = html.slice(0, end);
      const tail = html.slice(end).replace(/<\/body>\s*<\/html>/i, '').trim();
      if (tail) head = head.replace(/<\/div>\s*$/, '') + '\n' + tail + '\n</div>';
      html = head + '\n</body>\n</html>';
    }
    const pick = re => (html.match(re) || [])[1] || '';
    const n = +m[1], to = `/1styear/animated/${dir}/unit-${n}`;
    const title = text(pick(/class="unit-title"[^>]*>([\s\S]*?)<\/div>/) || pick(/<title>([\s\S]*?)<\/title>/)).replace(/^unit\s*\d+\s*[–—:-]\s*/i, '').replace(/\s*\((expanded[^)]*|part \d+)\)\s*$/i, '');
    units.push({ n, title, sub: text(pick(/class="unit-sub"[^>]*>([\s\S]*?)<\/div>/)), heads: [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map(x => text(x[1])) });
    // frame ke andar hi chale (seedha kholo to site ke page par bhej de) + phone par theek dikhe
    const extra = `<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<script>if(top===self)location.replace(${JSON.stringify(to)});document.addEventListener('contextmenu',function(e){e.preventDefault()})</script>
<style>html{scrollbar-width:thin;scrollbar-color:#24406e transparent}body{-webkit-user-select:none;user-select:none;overflow-x:hidden}svg{max-width:100%}@media(max-width:600px){body{padding:14px 10px!important}.card{padding:18px 14px 24px!important}.block{padding:14px 12px 12px!important}.unit-title{font-size:1.25rem!important}table{display:block;overflow-x:auto}}</style>`;
    html = html.replace(/<head>/i, '<head>\n' + extra);
    fs.mkdirSync(`${DIST}/anotes/${dir}`, { recursive: true });
    fs.writeFileSync(`${DIST}/anotes/${dir}/unit-${n}.html`, html);
  }
  if (units.length) anotes.push({ slug: dir, name: dir.replace(/(^|-)([a-z])/g, (_, d, c) => (d ? ' ' : '') + c.toUpperCase()), units: units.sort((x, y) => x.n - y.n) });
}
fs.writeFileSync('src/anotes.json', JSON.stringify(anotes, null, 1) + '\n');

// ---------- 1. browser bundle ----------
const client = await build({
  ...common, outdir: DIST + '/assets', entryNames: 'app-[hash]', format: 'iife', minify: true, target: 'es2020',
  define: { ...common.define, 'process.env.NODE_ENV': '"production"' }, metafile: true, legalComments: 'none'
});
for (const f of ['pdf.min.mjs', 'pdf.worker.min.mjs']) {
  fs.mkdirSync(DIST + PDFJS, { recursive: true });
  fs.copyFileSync(`${PDFJS_SRC}/legacy/build/${f}`, DIST + PDFJS + f);   // legacy = purane phone/browser par bhi chalta hai
}
for (const dir of ['wasm', 'standard_fonts', 'iccs']) fs.cpSync(`${PDFJS_SRC}/${dir}`, DIST + PDFJS + dir, { recursive: true, dereference: true });
fs.cpSync('public', DIST, { recursive: true });   // favicon, logo, og-image, manifest
const outs = Object.keys(client.metafile.outputs).map(f => '/' + path.relative(DIST, f).split(path.sep).join('/'));
const JS = outs.find(f => f.endsWith('.js')), CSS = outs.find(f => f.endsWith('.css'));

// ---------- 2. har URL ka HTML ----------
const SSR = path.resolve('.ssr.mjs');
await build({ ...common, outfile: SSR, format: 'esm', platform: 'node', packages: 'external', loader: { '.css': 'empty' } });
const { App, allRoutes, resolveRoute, seo, SITE, HOME_LINKS, FAQ } = await import(pathToFileURL(SSR).href + '?' + Date.now());
fs.rmSync(SSR);

const template = fs.readFileSync('src/index.html', 'utf8').replaceAll('%CSS%', CSS).replaceAll('%JS%', JS);
const page = (title, desc, url, head, app, kw = '') => template
  .replaceAll('%KEYWORDS%', esc(kw)).replaceAll('%TITLE%', esc(title)).replaceAll('%DESC%', esc(desc)).replaceAll('%URL%', esc(url))
  .replace('%HEAD%', head).replace('%APP%', () => app);
const ld = data => `  <script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

const routes = allRoutes();
for (const p of routes) {
  const route = resolveRoute(p);
  if (route.path !== p) throw new Error('Route mismatch: ' + p + ' -> ' + route.path);
  const s = seo(route);
  const head = p === '/'
    ? ld({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebSite', '@id': SITE + '/#site', name: 'RTU Hub', alternateName: ['rtuhub.in', 'RTUHub'], url: SITE + '/', publisher: { '@id': SITE + '/#org' } },
          { '@type': 'Organization', '@id': SITE + '/#org', name: 'RTU Hub', url: SITE + '/', logo: { '@type': 'ImageObject', url: SITE + '/icon-512.png', width: 512, height: 512 } },
          { '@type': 'FAQPage', '@id': SITE + '/#faq', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
          { '@type': 'ItemList', name: 'Sections', itemListElement: HOME_LINKS.map(([to, , name], i) => ({ '@type': 'SiteNavigationElement', position: i + 1, name, url: SITE + to })) }
        ]
      })
    : ld({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'BreadcrumbList', itemListElement: [['rtuhub.in', '/'], ...s.crumbs].map(([name, to], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + to })) },
          // hub pages (/pyq, /notes, /syllabus): page ka type + FAQ
          ...(s.faq ? [
            { '@type': s.pageType || 'CollectionPage', name: s.title.replace(/ \| rtuhub\.in$/, ''), description: s.desc, url: SITE + p, isPartOf: { '@id': SITE + '/#site' }, ...(s.about ? { about: s.about } : {}) },
            { '@type': 'FAQPage', mainEntity: s.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }
          ] : [])
        ]
      });
  const file = path.join(DIST, p === '/' ? 'index.html' : p.slice(1) + '.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, page(s.title, s.desc, SITE + p, head, renderToString(createElement(App, { initialPath: p })), s.keywords));
}

// galat / naya URL -> khaali page, React browser mein sahi jagah le jata hai
const home = seo(resolveRoute('/'));
fs.writeFileSync(DIST + '/app.html', page(home.title, home.desc, SITE + '/', '  <meta name="robots" content="noindex">', ''));

// ---------- 3. sitemap + robots ----------
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(DIST + '/sitemap.xml',
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  routes.map(p => `<url><loc>${esc(SITE + p)}</loc><lastmod>${today}</lastmod></url>`).join('\n') + '\n</urlset>\n');
fs.writeFileSync(DIST + '/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`Built ${routes.length} pages -> ${DIST}/  (${JS}, ${CSS})`);

// ---------- local preview (Vercel jaisa: /abc -> abc.html, warna app.html) ----------
if (process.argv.includes('--serve')) {
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.css': 'text/css', '.xml': 'application/xml', '.txt': 'text/plain', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
  http.createServer(async (req, res) => {
    // /api/* : wahi functions jo Vercel par chalte hain
    if (req.url.startsWith('/api/')) {
      const name = req.url.slice(5).split('?')[0];
      if (!/^[a-z]+$/.test(name) || !fs.existsSync(`api/${name}.js`)) { res.writeHead(404); return res.end(); }
      const { default: handler } = await import(pathToFileURL(path.resolve(`api/${name}.js`)).href);
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const out = await handler(new Request('http://' + req.headers.host + req.url, { method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined }));
      res.writeHead(out.status, Object.fromEntries(out.headers));
      if (!out.body) return res.end();
      for await (const c of out.body) res.write(c);   // stream jaisa aata hai waisa bhejo
      return res.end();
    }
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/+$/, '') || '/index';
    const file = [p, p + '.html'].map(f => path.join(DIST, f)).find(f => f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile()) || DIST + '/app.html';
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  }).listen(4173, () => console.log('Preview: http://localhost:4173'));
}
