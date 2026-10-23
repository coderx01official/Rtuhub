// /api/notes?index=1                      -> notes ki list (R2 bucket "notes" ki notes_index.json, chhoti karke)
// /api/notes?k=pdf/<20 hex>.pdf           -> ek notes PDF (sirf rtuhub.in ke andar, cookie ke saath)
// /api/notes?k=pdf/<20 hex>.pdf&dl=1&n=.. -> wahi PDF download (n = file ka naam)
//
// notes_index.json aur pdf/*.pdf ko phone wali r2_notes.py upload karti hai. Common subject (jaise AEM jo
// CSE, CSE (AI), IT sab me hai) ki PDF bucket me EK hi baar hai; index batata hai wo kin branches me dikhe.
// Vercel env: wahi R2 keys jo syllabus ke liye (ya alag: NOTES_ACCESS_KEY_ID, NOTES_SECRET_ACCESS_KEY),
// NOTES_BUCKET (default: notes).
import { COOKIE, checkToken, fromThisSite, readCookie, deny } from './_auth.js';
import { fetchSyllabusFile, syllabusReady } from './_r2.js';

export const config = { runtime: 'edge' };

const BUCKET = () => process.env.NOTES_BUCKET || 'notes';
const KEY = /^pdf\/[0-9a-f]{20}\.pdf$/;
let cache = null, cachedAt = 0;   // ek isolate mein 5 minute tak index yaad

// site ko jo chahiye sirf wahi (local paths / storage info bahar nahi jaati)
const file = f => ({ title: String(f.title || ''), key: f.key, units: f.units || [], full: !!f.full, size_kb: f.size_kb || 0 });
const files = list => (Array.isArray(list) ? list : []).filter(f => f && KEY.test(f.key)).map(file);
export function slimIndex(ix) {
  const subjects = [];
  for (const e of (ix && ix.subjects) || []) {
    const s = {
      id: e.id, name: e.name, status: e.status,
      handmade: (e.handmade || []).map(h => ({ name: h.name, writer: h.writer || '', units: h.units || [], full: !!h.full, files: files(h.files) })).filter(h => h.files.length),
      typed: files(e.typed),
      extra: Object.fromEntries(Object.entries(e.extra || {}).map(([k, v]) => [k, files(v)]).filter(([, v]) => v.length)),
      syllabus_units: e.syllabus_units || [],
      branches: (e.branches || []).map(b => ({ branch: b.branch, year: b.year, semester: b.semester, subject: b.subject }))
    };
    if (s.handmade.length || s.typed.length || Object.keys(s.extra).length) subjects.push(s);
  }
  return { ready: subjects.length > 0, updated: ix && ix.updated, subjects };
}

export default async function handler(request) {
  const url = new URL(request.url);
  if (!fromThisSite(request)) return deny(403, 'Notes open only on rtuhub.in');

  if (url.searchParams.get('index')) {
    if (!syllabusReady()) return json({ ready: false, subjects: [] });
    try {
      const age = Date.now() - cachedAt;
      if (!cache || age > (cache.ready ? 300000 : 60000) || url.searchParams.get('fresh')) {
        const res = await fetchSyllabusFile('notes_index.json', null, BUCKET());
        if (res.status === 404) cache = { ready: false, subjects: [] };   // upload abhi chal raha hai
        else if (!res.ok) throw new Error('index ' + res.status);
        else cache = slimIndex(await res.json());
        cachedAt = Date.now();
      }
      return json(cache);
    } catch (e) {
      return json({ ready: false, error: String(e.message || e), subjects: [] }, 502);
    }
  }

  if (!(await checkToken(readCookie(request, COOKIE)))) return deny(401, 'Session expired. Reload rtuhub.in');
  const key = url.searchParams.get('k') || '';
  if (!KEY.test(key)) return deny(400, 'Bad file');
  const upstream = await fetchSyllabusFile(key, request.headers.get('range'), BUCKET());
  if (!upstream.ok) return deny(upstream.status === 404 ? 404 : 502, 'Notes file not found');
  const headers = new Headers({ 'cache-control': 'private, max-age=86400', 'x-content-type-options': 'nosniff', 'content-type': 'application/pdf' });
  for (const h of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (url.searchParams.get('dl')) {
    const name = (url.searchParams.get('n') || 'rtuhub-notes').replace(/\.pdf$/i, '').replace(/[^\w .()&,-]/g, '_').slice(0, 140) + '.pdf';
    headers.set('content-disposition', `attachment; filename="${name}"`);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, max-age=120' }
});
