// URLs ki list (tools/urls.json) download karke raw-files/ me save karta hai, log.json ke saath.
import fs from 'node:fs';
const OUT = process.env.OUT || 'raw-files'; fs.mkdirSync(OUT, { recursive: true });
const UA = 'Mozilla/5.0 (compatible; rtuhub-data-fetch/1.0; +https://www.rtuhub.in)';
const list = JSON.parse(fs.readFileSync(process.env.URLS || 'tools/urls.json', 'utf8'));
const log = [];
const q = [...list];
await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) { const [name, u] = q.shift();
  try {
    const r = await fetch(u, { headers: { 'user-agent': UA, accept: '*/*' }, redirect: 'follow', signal: AbortSignal.timeout(60000) });
    const buf = Buffer.from(await r.arrayBuffer());
    const type = r.headers.get('content-type') || '';
    const ext = /pdf/.test(type) || /\.pdf($|\?)/i.test(u) ? 'pdf' : /json/.test(type) ? 'json' : /html/.test(type) ? 'html' : 'bin';
    if (buf.length < 15e6) fs.writeFileSync(`${OUT}/${name}.${ext}`, buf);
    log.push({ name, u, status: r.status, type, len: buf.length, final: r.url });
  } catch (e) { log.push({ name, u, err: String(e.cause?.code || e.message || e) }); }
} }));
fs.writeFileSync(`${OUT}/log.json`, JSON.stringify(log, null, 1));
console.log(log.map(l => `${l.name} ${l.status || l.err} ${l.len || ''}`).join('\n'));
