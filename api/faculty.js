// =====================================================================
//  FACULTY PORTAL — rtuhub.in/facultyportalx  (vercel.json yahan rewrite karta hai)
//  Teacher password se login karke PDF (Notice / Time table) naam ke saath upload karte hain.
//  Students ko rtuhub.in/notices par dikhta hai.
//  Storage aur env: dekho api/_faculty.js.   Password: Vercel env FACULTY_PASSWORD (repo mein nahi).
//
//  API (sab /api/faculty par):
//    GET  (koi param nahi)        -> portal ka page (login ya dashboard)
//    POST ?a=login {pw}           -> cookie        POST ?a=logout
//    GET  ?a=list                 -> saari files (faculty)
//    POST ?a=sign {type,title,size}      -> seedha R2 par upload ka 15 min ka link
//    PUT  ?a=put&id=..            -> (fallback) chhoti file server ke through
//    POST ?a=commit {id,type,title}      -> file jaanch kar list mein jodna
//    POST ?a=edit {id,type,title}        POST ?a=delete {id}
//    GET  ?a=public               -> students ke liye list
//    GET  ?f=<id>[&dl=1]          -> PDF (sirf rtuhub.in ke andar)
// =====================================================================
import { COOKIE, checkToken, fromThisSite, readCookie, deny } from './_auth.js';
import { dashPage } from './_facultypage.js';
import { ENV, configured, creds, setup, setupState, s3, presignPut, readIndex, updateIndex } from './_faculty.js';

export const config = { runtime: 'edge' };

const TYPES = { notice: 'Notice', timetable: 'Time table' };
const MAX = 50 * 1024 * 1024, MAX_PROXY = 4 * 1024 * 1024;
const ID = /^[0-9a-f]{16}$/;
const keyOf = id => `files/${id}.pdf`;

// ---------- login cookie ----------
const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const same = (a, b) => { a = String(a); b = String(b); if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
async function sig(msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode((process.env.RTUHUB_SECRET || 'rtuhub') + '|faculty|' + ENV().pass), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
const FAC = 'rh_fac', DAYS = 7;
async function mint() { const exp = Date.now() + DAYS * 86400e3; return exp + '.' + await sig('fac.v1.' + exp); }
async function isFaculty(request) {
  if (!ENV().pass) return false;
  const [exp, s] = readCookie(request, FAC).split('.');
  if (!/^\d+$/.test(exp || '') || !s || +exp < Date.now()) return false;
  return same(await sig('fac.v1.' + exp), s);
}
const passOk = async pw => { const p = ENV().pass; return !!p && same(await sig('pw|' + pw), await sig('pw|' + p)); };

const fails = new Map();
const ipOf = r => (r.headers.get('x-real-ip') || r.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'x';
const recent = ip => (fails.get(ip) || []).filter(t => Date.now() - t < 900000);

// ---------- helpers ----------
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', ...extra } });
const bad = (msg, status = 400) => json({ ok: false, error: msg }, status);
const cleanTitle = t => String(t || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
const pub = x => ({ id: x.id, type: x.type, title: x.title, size: x.size, ts: x.ts, edited: x.edited || 0 });
const body = async r => { try { return await r.json(); } catch (e) { return {}; } };
const newId = () => hex(crypto.getRandomValues(new Uint8Array(8)));
const fail = e => { console.log('faculty error', String(e && e.message || e)); return bad('Storage is not reachable right now. Please try again in a minute.', 502); };

export default async function handler(request) {
  const url = new URL(request.url), a = url.searchParams.get('a') || '', m = request.method;

  // ---------- student side ----------
  if (url.searchParams.has('f')) return file(request, url);
  if (a === 'public') {
    if (!fromThisSite(request)) return deny(403, 'Opens only on rtuhub.in');
    if (!configured()) return json({ ready: false, items: [] });
    try {
      const { items } = await readIndex(url.searchParams.has('fresh'));
      return json({ ready: true, items: items.map(pub).sort((x, y) => y.ts - x.ts) }, 200, { 'cache-control': 'private, max-age=20' });
    } catch (e) { console.log('faculty public', e.message); return json({ ready: false, items: [], error: 'unavailable' }, 502); }
  }

  // ---------- portal page ----------
  if (m === 'GET' && !a) {
    const head = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'x-frame-options': 'DENY', 'referrer-policy': 'same-origin' };
    return new Response(await isFaculty(request) ? DASH : LOGIN, { headers: head });
  }

  // har badalne wali request sirf isi site ke page se (doosri site se form bhej kar kuch nahi ho sakta)
  if (m !== 'GET' && !fromThisSite(request)) return bad('Open rtuhub.in/facultyportalx to do this.', 403);

  if (a === 'login' && m === 'POST') {
    if (!ENV().pass) return bad('Faculty portal is not set up yet (password missing on the server).', 503);
    const ip = ipOf(request), f = recent(ip);
    if (f.length >= 8) return bad('Too many wrong attempts. Please wait 15 minutes and try again.', 429);
    const { pw } = await body(request);
    if (!(await passOk(String(pw || '')))) {
      fails.set(ip, [...f, Date.now()]);
      await new Promise(r => setTimeout(r, 400));
      return bad('Incorrect password. Please try again.', 401);
    }
    fails.delete(ip);
    return json({ ok: true }, 200, { 'set-cookie': `${FAC}=${await mint()}; Path=/; Max-Age=${DAYS * 86400}; HttpOnly; Secure; SameSite=Strict` });
  }
  if (a === 'logout') return json({ ok: true }, 200, { 'set-cookie': `${FAC}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict` });

  if (!(await isFaculty(request))) return bad('Your session has ended. Please sign in again.', 401);
  if (!configured()) return bad('Storage is not set up on the server yet.', 503);
  const origin = request.headers.get('origin') || url.origin;

  try {
    if (a === 'list') {
      setup(origin);
      const { items } = await readIndex(true);
      return json({ ok: true, items: items.map(pub).sort((x, y) => y.ts - x.ts) });
    }

    if (a === 'diag') {
      let s3ok = 'unknown';
      try { await creds(); const r = await s3('GET', 'index.json'); s3ok = r.ok || r.status === 404 ? 'ok' : 'status ' + r.status; } catch (e) { s3ok = 'error: ' + e.message; }
      return json({ ok: true, storage: s3ok, ...(await setup(origin)) });
    }

    if (a === 'sign' && m === 'POST') {
      const b = await body(request), size = +b.size || 0;
      if (!TYPES[b.type]) return bad('Pick a category: Notice or Time table.');
      if (!cleanTitle(b.title)) return bad('Please enter a name for this PDF.');
      if (!(size > 0) || size > MAX) return bad('The PDF must be smaller than 50 MB.');
      const st = await setup(origin);
      const id = newId();
      return json({ ok: true, id, url: await presignPut(keyOf(id)), direct: !/^failed|^error/.test(st.cors || ''), proxyMax: MAX_PROXY });
    }

    if (a === 'put' && m === 'PUT') {   // fallback jab browser seedha R2 tak na pahunch sake
      const id = url.searchParams.get('id') || '';
      if (!ID.test(id)) return bad('Bad upload id.');
      const len = +request.headers.get('content-length') || 0;
      if (len > MAX_PROXY) return bad('This file is too large for the backup upload route.', 413);
      const buf = await request.arrayBuffer();
      if (!buf.byteLength || buf.byteLength > MAX_PROXY) return bad('This file is too large for the backup upload route.', 413);
      const r = await s3('PUT', keyOf(id), { body: buf, headers: { 'content-type': 'application/pdf' } });
      if (!r.ok) throw new Error('proxy put ' + r.status);
      return json({ ok: true });
    }

    if (a === 'commit' && m === 'POST') {
      const b = await body(request), id = String(b.id || ''), title = cleanTitle(b.title);
      if (!ID.test(id) || !TYPES[b.type] || !title) return bad('Missing details. Please upload again.');
      const r = await s3('GET', keyOf(id), { range: 'bytes=0-1023' });
      if (r.status === 404) return bad('The file did not reach storage. Please upload again.', 409);
      if (!r.ok) throw new Error('verify ' + r.status);
      const head = new Uint8Array(await r.arrayBuffer());
      const total = +((r.headers.get('content-range') || '').split('/')[1]) || +r.headers.get('content-length') || head.length;
      if (!String.fromCharCode(...head).includes('%PDF-') || total > MAX) {
        await s3('DELETE', keyOf(id)).catch(() => {});
        return bad(total > MAX ? 'The PDF must be smaller than 50 MB.' : 'This file is not a valid PDF.', 415);
      }
      const item = { id, type: b.type, title, size: total, ts: Date.now() };
      await updateIndex(items => [item, ...items.filter(x => x.id !== id)]);
      return json({ ok: true, item: pub(item) });
    }

    if (a === 'edit' && m === 'POST') {
      const b = await body(request), id = String(b.id || ''), title = cleanTitle(b.title);
      if (!ID.test(id) || !TYPES[b.type] || !title) return bad('Please enter a name and pick a category.');
      let found = null;
      await updateIndex(items => items.map(x => x.id === id ? (found = { ...x, title, type: b.type, edited: Date.now() }) : x));
      return found ? json({ ok: true, item: pub(found) }) : bad('This PDF was already removed.', 404);
    }

    if (a === 'delete' && m === 'POST') {
      const id = String((await body(request)).id || '');
      if (!ID.test(id)) return bad('Bad id.');
      await updateIndex(items => items.filter(x => x.id !== id));
      const r = await s3('DELETE', keyOf(id));
      if (!r.ok && r.status !== 404 && r.status !== 204) console.log('faculty delete file', r.status);
      return json({ ok: true });
    }
  } catch (e) { return fail(e); }

  return bad('Unknown request.', 404);
}

// ---------- PDF dena (student: site ki cookie; faculty: portal cookie) ----------
async function file(request, url) {
  const id = url.searchParams.get('f') || '';
  if (!ID.test(id)) return deny(400, 'Bad file');
  if (!fromThisSite(request)) return deny(403, 'This file opens only on rtuhub.in');
  if (!(await checkToken(readCookie(request, COOKIE))) && !(await isFaculty(request))) return deny(401, 'Session expired. Reload rtuhub.in');
  if (!configured()) return deny(503, 'Not available');
  let item;
  try { item = (await readIndex()).items.find(x => x.id === id) || (await readIndex(true)).items.find(x => x.id === id); }
  catch (e) { return deny(502, 'Storage not reachable'); }
  if (!item) return deny(404, 'This PDF was removed by the faculty.');
  let up;
  try { up = await s3('GET', keyOf(id), { range: request.headers.get('range') || undefined }); } catch (e) { return deny(502, 'Storage not reachable'); }
  if (!up.ok) return deny(up.status === 404 ? 404 : 502, 'File not found');
  const name = item.title.replace(/[^\w .()&,-]/g, '_').slice(0, 120).trim() || 'rtuhub';
  const headers = new Headers({ 'content-type': 'application/pdf', 'cache-control': 'private, max-age=3600', 'x-content-type-options': 'nosniff', 'x-robots-tag': 'noindex',
    'content-disposition': `${url.searchParams.get('dl') ? 'attachment' : 'inline'}; filename="${name}.pdf"` });
  for (const h of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) { const v = up.headers.get(h); if (v) headers.set(h, v); }
  return new Response(up.body, { status: up.status, headers });
}

// =====================================================================
//  PAGES (white, professional)
// =====================================================================
const CSS = `
:root{--bg:#f6f7f9;--card:#fff;--ink:#0f172a;--ink2:#334155;--mute:#64748b;--line:#e5e7eb;--line2:#eef0f3;--a:#1d4ed8;--a2:#1e40af;--asoft:#eff4ff;--ok:#047857;--oksoft:#ecfdf5;--bad:#b91c1c;--badsoft:#fef2f2;--r:12px;color-scheme:light}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
button,input,select{font:inherit;color:inherit}button{cursor:pointer}a{color:var(--a)}
svg{flex:none}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:40px;padding:0 16px;border-radius:9px;border:1px solid var(--line);background:#fff;font-weight:600;font-size:14px;color:var(--ink2);transition:background .15s,border-color .15s,box-shadow .15s;white-space:nowrap;text-decoration:none}
.btn:hover{background:#f8fafc;border-color:#d1d5db}.btn:focus-visible,.inp:focus-visible,.seg button:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(29,78,216,.25)}
.btn.p{background:var(--a);border-color:var(--a);color:#fff}.btn.p:hover{background:var(--a2);border-color:var(--a2)}.btn.d{background:var(--bad);border-color:var(--bad);color:#fff}.btn.d:hover{background:#991b1b}
.btn:disabled{opacity:.55;cursor:not-allowed}.btn.sm{height:32px;padding:0 11px;font-size:13px;border-radius:8px}.btn.ghost{border-color:transparent;background:transparent}.btn.ghost:hover{background:#f1f5f9}
.inp{width:100%;height:44px;padding:0 13px;border:1px solid #d1d5db;border-radius:9px;background:#fff;font-size:15px;transition:border-color .15s,box-shadow .15s}.inp:focus{border-color:var(--a)}
label.l{display:block;font-size:13px;font-weight:600;color:var(--ink2);margin:0 0 6px}
.spin{width:16px;height:16px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:sp .7s linear infinite}@keyframes sp{to{transform:rotate(360deg)}}
.logo{width:36px;height:36px;border-radius:9px;background:var(--a);color:#fff;display:grid;place-items:center;font-weight:800;font-size:16px;letter-spacing:-.02em}
`;

const LOGIN = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Faculty Portal · RTU Hub</title>
<link rel="icon" href="/favicon.svg"><style>${CSS}
.w{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 16px}
.c{width:100%;max-width:400px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:32px 28px;box-shadow:0 1px 2px rgba(15,23,42,.04),0 12px 32px rgba(15,23,42,.06)}
.b{display:flex;align-items:center;gap:12px;margin-bottom:26px}.b b{display:block;font-size:16px;letter-spacing:-.01em}.b small{display:block;color:var(--mute);font-size:12.5px;margin-top:1px}
h1{font-size:22px;letter-spacing:-.02em;margin:0 0 6px}p.s{margin:0 0 22px;color:var(--mute);font-size:14px}
.pw{position:relative}.pw .inp{padding-right:46px}.eye{position:absolute;right:4px;top:4px;width:36px;height:36px;border:0;background:none;border-radius:7px;color:var(--mute);display:grid;place-items:center}.eye:hover{background:#f1f5f9;color:var(--ink)}
.e{display:none;align-items:flex-start;gap:8px;margin-top:12px;padding:10px 12px;border-radius:9px;background:var(--badsoft);color:var(--bad);font-size:13.5px}.e.on{display:flex}
.go{width:100%;margin-top:16px;height:44px;font-size:15px}.f{margin-top:22px;color:var(--mute);font-size:12.5px;text-align:center}
</style></head><body><div class="w"><form class="c" id="f" novalidate>
<div class="b"><div class="logo">R</div><div><b>RTU Hub</b><small>Faculty Portal</small></div></div>
<h1>Sign in</h1><p class="s">Enter the faculty password to upload notices and time tables.</p>
<label class="l" for="pw">Password</label>
<div class="pw"><input class="inp" type="password" id="pw" name="pw" autocomplete="current-password" autofocus required>
<button class="eye" type="button" id="eye" aria-label="Show password"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button></div>
<div class="e" id="e" role="alert"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-top:2px"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><span id="et"></span></div>
<button class="btn p go" id="go" type="submit">Sign in</button>
<div class="f">For RTU Hub faculty only. Students can see notices at <a href="/notices">rtuhub.in/notices</a></div>
</form></div>
<script>
const f=document.getElementById('f'),pw=document.getElementById('pw'),go=document.getElementById('go'),e=document.getElementById('e'),et=document.getElementById('et');
document.getElementById('eye').onclick=function(){const s=pw.type==='password';pw.type=s?'text':'password';this.setAttribute('aria-label',s?'Hide password':'Show password');pw.focus()};
pw.oninput=()=>e.classList.remove('on');
f.onsubmit=async ev=>{ev.preventDefault();if(!pw.value){et.textContent='Please enter the password.';e.classList.add('on');pw.focus();return}
go.disabled=true;go.innerHTML='<span class="spin"></span> Signing in';
try{const r=await fetch('/api/faculty?a=login',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({pw:pw.value})});const j=await r.json().catch(()=>({}));
if(r.ok&&j.ok){location.reload();return}et.textContent=j.error||'Could not sign in. Please try again.'}catch(x){et.textContent='No internet connection. Please check and try again.'}
e.classList.add('on');go.disabled=false;go.textContent='Sign in';pw.select()};
</script></body></html>`;

const DASH = dashPage(CSS);
