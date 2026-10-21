// =====================================================================
//  CONNECTORS LOGIN (Claude jaisa "Authorize" button) — GitHub aur Vercel.
//    /api/oauth?start=github     -> GitHub ka "Authorize" page
//    /api/oauth?p=github&code=…  -> GitHub wapas yahan bhejta hai (callback)
//    /api/oauth?start=vercel     -> Vercel integration install / authorize page
//    /api/oauth?p=vercel&code=…  -> Vercel ka callback
//    /api/oauth?status=1         -> kaun connected hai (sirf naam)
//    /api/oauth?logout=github    -> disconnect
//  Token encrypted HttpOnly cookie mein (api/_vault.js); kabhi page / JS ko nahi milta.
//
//  Ek baar setup (Vercel > Settings > Environment Variables, phir Redeploy):
//    GitHub : github.com/settings/developers > New OAuth App
//             Homepage: https://rtuhub.in   Callback URL: https://rtuhub.in/api/oauth?p=github
//             -> GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
//    Vercel : vercel.com > Integrations Console > Create (connectable account)
//             Redirect URL: https://rtuhub.in/api/oauth?p=vercel
//             Scopes (Read): Deployments, Projects, Team, User
//             -> VERCEL_CLIENT_ID (oac_…), VERCEL_CLIENT_SECRET, VERCEL_INTEGRATION_SLUG
// =====================================================================
import { seal, open, VAULT, readVaultCookie } from './_vault.js';

export const config = { runtime: 'edge' };

const STATE = 'rh_os';
const DAYS = 30;
const cookie = (name, val, maxAge) => `${name}=${val}; Path=/api; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
const redirect = (to, cookies = []) => { const h = new Headers({ location: to, 'cache-control': 'no-store' }); for (const c of cookies) h.append('set-cookie', c); return new Response(null, { status: 302, headers: h }); };
const json = (data, cookies = []) => { const h = new Headers({ 'content-type': 'application/json', 'cache-control': 'no-store' }); for (const c of cookies) h.append('set-cookie', c); return new Response(JSON.stringify(data), { headers: h }); };
const rand = () => { const a = crypto.getRandomValues(new Uint8Array(24)); return [...a].map(b => b.toString(16).padStart(2, '0')).join(''); };

// popup band karke page ko batao (popup na ho to wapas AI Assistant)
function done(origin, kind, ok, msg = '', cookies = []) {
  const data = JSON.stringify({ rtuhubConnector: kind, ok, msg });
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>RTU Hub · ${kind}</title>
<body style="margin:0;display:grid;place-items:center;height:100vh;background:#080c1a;color:#e6ecff;font:16px system-ui">
<p>${ok ? '✓ Connected. You can close this window.' : '✕ ' + (msg || 'Could not connect').replace(/[<>&]/g, '')}</p>
<script>try{if(window.opener){window.opener.postMessage(${data},${JSON.stringify(origin)});setTimeout(()=>window.close(),400)}else{location.replace('/ai-assistant?connected=${kind}')}}catch(e){location.replace('/ai-assistant')}</script></body>`;
  const h = new Headers({ 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  for (const c of cookies) h.append('set-cookie', c);
  return new Response(html, { headers: h });
}

export default async function handler(request) {
  const env = process.env, url = new URL(request.url), origin = url.origin;
  const cb = p => `${origin}/api/oauth?p=${p}`;
  const ready = { github: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET), vercel: !!(env.VERCEL_CLIENT_ID && env.VERCEL_CLIENT_SECRET && env.VERCEL_INTEGRATION_SLUG) };

  // ---------- haal ----------
  if (url.searchParams.get('status')) {
    const out = { ready };
    for (const [k, c] of Object.entries(VAULT)) { const v = await open(readVaultCookie(request, c)); out[k] = v && v.t ? { name: v.n || k } : null; }
    return json(out);
  }
  // ---------- disconnect ----------
  const bye = url.searchParams.get('logout');
  if (bye && VAULT[bye]) return json({ ok: true }, [cookie(VAULT[bye], '', 0)]);

  // ---------- login shuru ----------
  const start = url.searchParams.get('start');
  if (start === 'github') {
    if (!ready.github) return done(origin, 'github', false, 'GitHub login is not set up on this site yet');
    const state = rand();
    const q = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: cb('github'), scope: 'repo read:user', state, allow_signup: 'true' });
    return redirect('https://github.com/login/oauth/authorize?' + q, [cookie(STATE, state, 600)]);
  }
  if (start === 'vercel') {
    if (!ready.vercel) return done(origin, 'vercel', false, 'Vercel login is not set up on this site yet');
    const state = rand();
    return redirect(`https://vercel.com/integrations/${encodeURIComponent(env.VERCEL_INTEGRATION_SLUG)}/new?state=${state}`, [cookie(STATE, state, 900)]);
  }

  // ---------- callback ----------
  const p = url.searchParams.get('p'), code = url.searchParams.get('code');
  if (p === 'github') {
    if (!code) return done(origin, 'github', false, url.searchParams.get('error_description') || 'Cancelled');
    const want = readVaultCookie(request, STATE);
    if (!want || want !== url.searchParams.get('state')) return done(origin, 'github', false, 'Login expired, try again');
    const r = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: cb('github') }) });
    const j = await r.json().catch(() => ({}));
    if (!j.access_token) return done(origin, 'github', false, j.error_description || 'GitHub did not give a token');
    const me = await fetch('https://api.github.com/user', { headers: { authorization: 'Bearer ' + j.access_token, 'user-agent': 'rtuhub.in-ai', accept: 'application/vnd.github+json' } }).then(x => x.json()).catch(() => ({}));
    return done(origin, 'github', true, '', [cookie(VAULT.github, await seal({ t: j.access_token, n: '@' + (me.login || 'github') }), DAYS * 86400), cookie(STATE, '', 0)]);
  }
  if (p === 'vercel') {
    if (!code) return done(origin, 'vercel', false, 'Cancelled');
    const want = readVaultCookie(request, STATE), got = url.searchParams.get('state');
    if (got && want && got !== want) return done(origin, 'vercel', false, 'Login expired, try again');   // Vercel install se aaye to state hamesha nahi aata
    const r = await fetch('https://api.vercel.com/v2/oauth/access_token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: env.VERCEL_CLIENT_ID, client_secret: env.VERCEL_CLIENT_SECRET, code, redirect_uri: cb('vercel') }) });
    const j = await r.json().catch(() => ({}));
    if (!j.access_token) return done(origin, 'vercel', false, (j.error && (j.error.message || j.error)) || 'Vercel did not give a token');
    const team = j.team_id || url.searchParams.get('teamId') || '';
    let name = 'Vercel';
    try {
      const h = { authorization: 'Bearer ' + j.access_token };
      if (team) { const t = await fetch(`https://api.vercel.com/v2/teams/${team}`, { headers: h }).then(x => x.json()); name = t.slug || t.name || name; }
      else { const u = await fetch('https://api.vercel.com/v2/user', { headers: h }).then(x => x.json()); name = (u.user && (u.user.username || u.user.email)) || name; }
    } catch (e) {}
    const sealed = await seal({ t: j.access_token, n: name, team });
    const next = url.searchParams.get('next');
    // Vercel ke install popup mein "next" par jaana zaroori (install poora hota hai)
    if (next && /^https:\/\/vercel\.com\//.test(next)) return redirect(next, [cookie(VAULT.vercel, sealed, DAYS * 86400), cookie(STATE, '', 0)]);
    return done(origin, 'vercel', true, '', [cookie(VAULT.vercel, sealed, DAYS * 86400), cookie(STATE, '', 0)]);
  }
  return json({ ready });
}
