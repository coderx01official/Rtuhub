// Engineering jobs live data (GitHub Action har 6 ghante "jobs-data" branch par likhta hai: tools/jobs_live.py).
// raw.githubusercontent force-push ke baad purana de deta hai, isliye GitHub API se taaza file; edge par 2 min cache.
export const config = { runtime: 'edge' };
const API = 'https://api.github.com/repos/coderx01official/Rtuhub/contents/jobs.json?ref=jobs-data';
const RAW = 'https://raw.githubusercontent.com/coderx01official/Rtuhub/jobs-data/jobs.json';

export default async function handler() {
  let body = null;
  try {
    const r = await fetch(API, { headers: { accept: 'application/vnd.github.raw', 'user-agent': 'rtuhub.in' }, cache: 'no-store' });
    if (r.ok) body = await r.text();
  } catch (e) {}
  if (!body) {
    try { const r = await fetch(RAW + '?t=' + Date.now(), { cache: 'no-store' }); if (r.ok) body = await r.text(); } catch (e) {}
  }
  if (!body) return new Response(JSON.stringify({ error: 'live jobs not available' }), { status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  return new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=1800' } });
}
