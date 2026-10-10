// /api/paper?p=1ST YEAR/1 SEMESTER/ENGINEERING PHYSICS/2025-ENGINEERING PHYSICS.pdf
// Paper sirf tab milta hai jab request rtuhub.in ke page se aayi ho aur cookie sahi ho.
import { COOKIE, checkToken, fromThisSite, readCookie, deny } from './_auth.js';
import { fetchPaper } from './_r2.js';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const url = new URL(request.url);
  const path = url.searchParams.get('p') || '';
  if (!fromThisSite(request)) return deny(403, 'This paper opens only on rtuhub.in');
  if (!(await checkToken(readCookie(request, COOKIE)))) return deny(401, 'Session expired. Reload rtuhub.in');
  if (!/^[^/].*\.pdf$/i.test(path) || path.includes('..') || path.includes('\\')) return deny(400, 'Bad paper path');

  const upstream = await fetchPaper(path, request.headers.get('range'));
  if (!upstream.ok) return deny(upstream.status === 404 ? 404 : 502, 'Paper not found');
  const headers = new Headers({ 'cache-control': 'private, max-age=86400', 'x-content-type-options': 'nosniff', 'content-type': 'application/pdf' });
  for (const h of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (url.searchParams.get('dl')) {
    const name = path.split('/').pop().replace(/[^\w .()&-]/g, '_');
    headers.set('content-disposition', `attachment; filename="${name}"`);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
