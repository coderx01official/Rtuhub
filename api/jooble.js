// Jooble job search (Engineering Jobs feed ke liye). Key Vercel env JOOBLE_API_KEY me rehti hai, code me nahi.
// GitHub Action (tools/jobs_live.py) yahan se sirf fixed searches maangta hai; edge par 6 ghante cache,
// isliye bahar se koi bhi isse Jooble ki limit khatam nahi kar sakta.
export const config = { runtime: 'edge' };
const QUERIES = new Set([
  'graduate engineer trainee', 'fresher software engineer', 'junior engineer fresher',
  'electrical engineer fresher', 'mechanical engineer fresher', 'civil engineer fresher',
  'electronics engineer fresher', 'instrumentation engineer fresher', 'engineering intern',
  'software developer fresher', 'data analyst fresher', 'vlsi engineer fresher', 'embedded engineer fresher',
  'network engineer fresher', 'test engineer fresher', 'cloud engineer fresher', 'site engineer fresher',
  'design engineer fresher', 'production engineer fresher', 'quality engineer fresher',
  'maintenance engineer fresher', 'graduate apprentice', 'btech fresher', 'trainee engineer',
]);
const json = (o, status, cache) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache || 'no-store' } });

export default async function handler(req) {
  const q = (new URL(req.url).searchParams.get('q') || '').trim().toLowerCase();
  if (!QUERIES.has(q)) return json({ error: 'unknown search' }, 400);
  const key = process.env.JOOBLE_API_KEY;
  if (!key) return json({ error: 'JOOBLE_API_KEY not set' }, 503);
  try {
    const r = await fetch('https://jooble.org/api/' + encodeURIComponent(key), {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ keywords: q, location: 'India', page: '1' })
    });
    if (!r.ok) return json({ error: 'jooble ' + r.status }, 502);
    return new Response(await r.text(), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=21600, stale-while-revalidate=3600' } });
  } catch (e) {
    return json({ error: 'jooble not reachable' }, 502);
  }
}
