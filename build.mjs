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
const { App, allRoutes, resolveRoute, seo, SITE, HOME_LINKS } = await import(pathToFileURL(SSR).href + '?' + Date.now());
fs.rmSync(SSR);

const template = fs.readFileSync('src/index.html', 'utf8').replaceAll('%CSS%', CSS).replaceAll('%JS%', JS);
const page = (title, desc, url, head, app) => template
  .replaceAll('%TITLE%', esc(title)).replaceAll('%DESC%', esc(desc)).replaceAll('%URL%', esc(url))
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
          { '@type': 'ItemList', name: 'Sections', itemListElement: HOME_LINKS.map(([to, , name], i) => ({ '@type': 'SiteNavigationElement', position: i + 1, name, url: SITE + to })) }
        ]
      })
    : ld({
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [['rtuhub.in', '/'], ...s.crumbs].map(([name, to], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + to }))
      });
  const file = path.join(DIST, p === '/' ? 'index.html' : p.slice(1) + '.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, page(s.title, s.desc, SITE + p, head, renderToString(createElement(App, { initialPath: p }))));
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
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.css': 'text/css', '.xml': 'application/xml', '.txt': 'text/plain', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
  http.createServer(async (req, res) => {
    // /api/* : wahi functions jo Vercel par chalte hain
    if (req.url.startsWith('/api/')) {
      const name = req.url.slice(5).split('?')[0];
      if (!/^[a-z]+$/.test(name) || !fs.existsSync(`api/${name}.js`)) { res.writeHead(404); return res.end(); }
      const { default: handler } = await import(pathToFileURL(path.resolve(`api/${name}.js`)).href);
      const out = await handler(new Request('http://' + req.headers.host + req.url, { headers: req.headers }));
      res.writeHead(out.status, Object.fromEntries(out.headers));
      return res.end(out.body ? Buffer.from(await out.arrayBuffer()) : undefined);
    }
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/+$/, '') || '/index';
    const file = [p, p + '.html'].map(f => path.join(DIST, f)).find(f => f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile()) || DIST + '/app.html';
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  }).listen(4173, () => console.log('Preview: http://localhost:4173'));
}
