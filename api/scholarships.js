// Scholarship live data (GitHub Action har ghante "data" branch par likhta hai).
// raw.githubusercontent purana data de deta hai (force-push ke baad cache), isliye GitHub API se
// taaza file laate hain aur Vercel edge par 1 minute cache karte hain.
export const config = { runtime: 'edge' };
const API = 'https://api.github.com/repos/coderx01official/Rtuhub/contents/scholarships.json?ref=data';
const RAW = 'https://raw.githubusercontent.com/coderx01official/Rtuhub/data/scholarships.json';

export default async function handler() {
  let body = null;
  try {
    const r = await fetch(API, { headers: { accept: 'application/vnd.github.raw', 'user-agent': 'rtuhub.in' }, cache: 'no-store' });
    if (r.ok) body = await r.text();
  } catch (e) {}
  if (!body) {
    try { const r = await fetch(RAW + '?t=' + Date.now(), { cache: 'no-store' }); if (r.ok) body = await r.text(); } catch (e) {}
  }
  if (!body) return new Response(JSON.stringify({ error: 'live data not available' }), { status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  return new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600' } });
}
