// RTU news live data (GitHub Action har 2 ghante "news-data" branch par likhta hai: tools/news-live.mjs).
// raw.githubusercontent force-push ke baad purana de deta hai, isliye GitHub API se taaza file; edge par 1 min cache.
export const config = { runtime: 'edge' };
const API = 'https://api.github.com/repos/coderx01official/Rtuhub/contents/news.json?ref=news-data';
const RAW = 'https://raw.githubusercontent.com/coderx01official/Rtuhub/news-data/news.json';

export default async function handler() {
  let body = null;
  try {
    const r = await fetch(API, { headers: { accept: 'application/vnd.github.raw', 'user-agent': 'rtuhub.in' }, cache: 'no-store' });
    if (r.ok) body = await r.text();
  } catch (e) {}
  if (!body) {
    try { const r = await fetch(RAW + '?t=' + Date.now(), { cache: 'no-store' }); if (r.ok) body = await r.text(); } catch (e) {}
  }
  if (!body) return new Response(JSON.stringify({ error: 'live news not available' }), { status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  return new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600' } });
}
