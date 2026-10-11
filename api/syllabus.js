// /api/syllabus?list=1      -> syllabus bucket ki saari files (JSON)
// /api/syllabus?p=CSE/2nd Year/....pdf   -> ek file (sirf rtuhub.in ke andar, cookie ke saath)
import { COOKIE, checkToken, fromThisSite, readCookie, deny } from './_auth.js';
import { fetchSyllabusFile, listSyllabus, syllabusReady } from './_r2.js';

export const config = { runtime: 'edge' };

const TYPES = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
let cache = null, cachedAt = 0;   // ek isolate mein 10 minute tak list yaad

export default async function handler(request) {
  const url = new URL(request.url);
  if (!fromThisSite(request)) return deny(403, 'Syllabus opens only on rtuhub.in');

  if (url.searchParams.get('list')) {
    if (!syllabusReady()) return json({ ready: false, files: [] });
    try {
      if (!cache || Date.now() - cachedAt > 600000 || url.searchParams.get('fresh')) {
        cache = await listSyllabus(); cachedAt = Date.now();
        // log mein sirf folder ke naam (kaunse folder hain, kitni files) — debugging ke liye
        const tops = {};
        for (const [k] of cache) { const f = k.split('/').slice(0, 2).join('/'); tops[f] = (tops[f] || 0) + 1; }
        console.log('syllabus folders', cache.length, JSON.stringify(tops).slice(0, 3000));
      }
      return json({ ready: true, files: cache });
    } catch (e) {
      return json({ ready: false, error: String(e.message || e), files: [] }, 502);
    }
  }

  if (!(await checkToken(readCookie(request, COOKIE)))) return deny(401, 'Session expired. Reload rtuhub.in');
  const path = url.searchParams.get('p') || '';
  const ext = (path.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase();
  if (!TYPES[ext] || path.startsWith('/') || path.includes('..') || path.includes('\\')) return deny(400, 'Bad file path');
  const upstream = await fetchSyllabusFile(path, request.headers.get('range'));
  if (!upstream.ok) return deny(upstream.status === 404 ? 404 : 502, 'Syllabus file not found');
  const headers = new Headers({ 'cache-control': 'private, max-age=86400', 'x-content-type-options': 'nosniff', 'content-type': TYPES[ext] });
  for (const h of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (url.searchParams.get('dl')) headers.set('content-disposition', `attachment; filename="${path.split('/').pop().replace(/[^\w .()&-]/g, '_')}"`);
  return new Response(upstream.body, { status: upstream.status, headers });
}

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, max-age=300' }
});
