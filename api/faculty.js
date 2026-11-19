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

const I = {
  up: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>',
  pdf: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
  out: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>'
};

const DASH = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Faculty Portal · RTU Hub</title>
<link rel="icon" href="/favicon.svg"><style>${CSS}
.top{position:sticky;top:0;z-index:30;background:rgba(255,255,255,.92);backdrop-filter:saturate(1.6) blur(8px);border-bottom:1px solid var(--line)}
.bar{max-width:1160px;margin:0 auto;height:64px;padding:0 20px;display:flex;align-items:center;gap:12px}
.brand{display:flex;align-items:center;gap:12px;margin-right:auto;min-width:0}.brand b{display:block;font-size:15.5px;letter-spacing:-.01em}.brand small{display:block;color:var(--mute);font-size:12px;margin-top:-1px}
.pill{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:99px;background:var(--oksoft);color:var(--ok);font-size:12px;font-weight:600}.pill i{width:7px;height:7px;border-radius:50%;background:currentColor}
main{max-width:1160px;margin:0 auto;padding:28px 20px 60px}
.hd{margin-bottom:22px}.hd h1{margin:0;font-size:24px;letter-spacing:-.02em}.hd p{margin:4px 0 0;color:var(--mute);font-size:14.5px}
.g{display:grid;grid-template-columns:380px 1fr;gap:22px;align-items:start}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.ch{padding:18px 20px 0}.ch h2{margin:0;font-size:16px;letter-spacing:-.01em}.ch p{margin:3px 0 0;color:var(--mute);font-size:13px}
.cb{padding:18px 20px 20px}.up{position:sticky;top:84px}
.fld{margin-bottom:16px}
.seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;background:#f1f5f9;border-radius:10px}
.seg button{height:36px;border:0;border-radius:7px;background:transparent;font-weight:600;font-size:14px;color:var(--mute);transition:background .15s,color .15s}
.seg button[aria-pressed=true]{background:#fff;color:var(--ink);box-shadow:0 1px 2px rgba(15,23,42,.08),0 1px 1px rgba(15,23,42,.04)}
.cnt{float:right;color:var(--mute);font-weight:500;font-size:12px}
.drop{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6px;min-height:150px;padding:20px;border:1.5px dashed #cbd5e1;border-radius:12px;background:#fafbfc;cursor:pointer;transition:border-color .15s,background .15s}
.drop:hover,.drop.over{border-color:var(--a);background:var(--asoft)}.drop input{position:absolute;inset:0;opacity:0;cursor:pointer}
.drop .ic{width:42px;height:42px;border-radius:10px;background:#fff;border:1px solid var(--line);display:grid;place-items:center;color:var(--a);margin-bottom:4px}
.drop b{font-size:14px}.drop b u{color:var(--a);text-decoration:none}.drop small{color:var(--mute);font-size:12.5px}
.sel{display:none;align-items:center;gap:12px;padding:12px;border:1px solid var(--line);border-radius:12px;background:#fff}.sel.on{display:flex}
.sel .ic{width:40px;height:40px;border-radius:9px;background:var(--badsoft);color:var(--bad);display:grid;place-items:center}
.sel .t{flex:1;min-width:0}.sel .t b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sel .t small{color:var(--mute);font-size:12.5px}
.x{width:32px;height:32px;border:0;border-radius:8px;background:none;color:var(--mute);display:grid;place-items:center;font-size:18px}.x:hover{background:#f1f5f9;color:var(--ink)}
.prog{display:none;margin-top:14px}.prog.on{display:block}.pb{height:8px;border-radius:99px;background:#eef2f7;overflow:hidden}.pb i{display:block;height:100%;width:0;background:var(--a);border-radius:99px;transition:width .2s}
.pt{display:flex;justify-content:space-between;font-size:12.5px;color:var(--mute);margin-top:6px}
.msg{display:none;margin-top:14px;padding:10px 12px;border-radius:9px;font-size:13.5px}.msg.on{display:block}.msg.err{background:var(--badsoft);color:var(--bad)}.msg.ok{background:var(--oksoft);color:var(--ok)}
.pub{width:100%;height:44px;margin-top:18px;font-size:15px}
.hint{margin:12px 0 0;color:var(--mute);font-size:12.5px;text-align:center}
.lh{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:16px 20px;border-bottom:1px solid var(--line)}
.tabs{display:flex;gap:4px;padding:4px;background:#f1f5f9;border-radius:10px}
.tabs button{height:34px;padding:0 14px;border:0;border-radius:7px;background:transparent;font-weight:600;font-size:13.5px;color:var(--mute);display:inline-flex;align-items:center;gap:7px}
.tabs button[aria-selected=true]{background:#fff;color:var(--ink);box-shadow:0 1px 2px rgba(15,23,42,.08)}
.tabs em{font-style:normal;min-width:22px;height:20px;padding:0 6px;border-radius:99px;background:#e2e8f0;color:var(--ink2);font-size:11.5px;display:inline-grid;place-items:center}
.tabs button[aria-selected=true] em{background:var(--asoft);color:var(--a)}
.srch{margin-left:auto;position:relative;flex:1;max-width:260px;min-width:160px}.srch .inp{height:38px;padding-left:36px;font-size:14px}.srch svg{position:absolute;left:11px;top:11px;color:var(--mute)}
.row{display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid var(--line2)}.row:last-child{border-bottom:0}.row:hover{background:#fafbfc}
.row .ic{width:40px;height:40px;border-radius:9px;background:var(--badsoft);color:var(--bad);display:grid;place-items:center}
.row .t{flex:1;min-width:0}.row .t b{display:block;font-size:14.5px;font-weight:600;overflow-wrap:anywhere}.row .t small{display:block;color:var(--mute);font-size:12.5px;margin-top:2px}
.tag{display:inline-block;padding:1px 8px;border-radius:99px;font-size:11.5px;font-weight:600;margin-right:6px;vertical-align:1px}.tag.notice{background:var(--asoft);color:var(--a)}.tag.timetable{background:#f5f3ff;color:#6d28d9}
.acts{display:flex;gap:6px}.acts .del{color:var(--bad)}.acts .del:hover{background:var(--badsoft)}
.empty{padding:48px 20px;text-align:center;color:var(--mute)}.empty b{display:block;color:var(--ink);font-size:15px;margin-bottom:4px}
.sk{height:14px;border-radius:6px;background:linear-gradient(90deg,#f1f5f9,#e2e8f0,#f1f5f9);background-size:200% 100%;animation:sh 1.2s infinite}@keyframes sh{to{background-position:-200% 0}}
.mod{position:fixed;inset:0;z-index:60;background:rgba(15,23,42,.45);display:none;align-items:center;justify-content:center;padding:16px}.mod.on{display:flex}
.box{width:100%;max-width:440px;background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(15,23,42,.25);padding:22px}.box h3{margin:0 0 6px;font-size:17px}.box p{margin:0 0 16px;color:var(--mute);font-size:14px;overflow-wrap:anywhere}
.box .ft{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}
.toast{position:fixed;left:50%;bottom:24px;z-index:70;transform:translate(-50%,20px);opacity:0;pointer-events:none;background:#0f172a;color:#fff;padding:11px 16px;border-radius:10px;font-size:14px;box-shadow:0 10px 30px rgba(15,23,42,.25);transition:opacity .2s,transform .2s;max-width:calc(100vw - 32px)}.toast.on{opacity:1;transform:translate(-50%,0)}
@media (max-width:900px){.g{grid-template-columns:1fr}.up{position:static}}
@media (max-width:560px){.bar{padding:0 14px;height:58px}main{padding:20px 14px 48px}.pill{display:none}.hd h1{font-size:20px}.lh{padding:14px}.srch{max-width:none;margin-left:0;flex-basis:100%}.row{padding:12px 14px;align-items:flex-start;flex-wrap:wrap}.row .t{flex-basis:calc(100% - 56px)}.acts{width:100%;padding-left:54px}.btn.so span{display:none}}
</style></head><body>
<header class="top"><div class="bar">
<div class="brand"><div class="logo">R</div><div><b>RTU Hub</b><small>Faculty Portal</small></div></div>
<span class="pill"><i></i>Signed in</span>
<a class="btn sm" href="/notices" target="_blank" rel="noopener">Student view</a>
<button class="btn sm so" id="out" title="Sign out">${I.out}<span>Sign out</span></button>
</div></header>
<main>
<div class="hd"><h1>Notices &amp; time tables</h1><p>Upload a PDF with a clear name. Students see it right away on rtuhub.in/notices.</p></div>
<div class="g">
<section class="card up" aria-labelledby="uph"><div class="ch"><h2 id="uph">Upload PDF</h2><p>Published under the category you pick.</p></div>
<form class="cb" id="form" novalidate>
<div class="fld"><label class="l">Category</label><div class="seg" id="cat" role="group" aria-label="Category"><button type="button" data-v="notice" aria-pressed="true">Notice</button><button type="button" data-v="timetable" aria-pressed="false">Time table</button></div></div>
<div class="fld"><label class="l" for="title">Name shown to students <span class="cnt" id="cnt">0/150</span></label><input class="inp" id="title" maxlength="150" placeholder="e.g. Mid-term exam schedule, 3rd semester" autocomplete="off"></div>
<div class="fld" style="margin-bottom:0"><label class="l">PDF file</label>
<label class="drop" id="drop"><input type="file" id="file" accept="application/pdf,.pdf"><span class="ic">${I.up}</span><b><u>Choose a PDF</u> or drag it here</b><small>PDF only, up to 50 MB</small></label>
<div class="sel" id="sel"><span class="ic">${I.pdf}</span><span class="t"><b id="fn"></b><small id="fs"></small></span><button type="button" class="x" id="clr" aria-label="Remove file">&times;</button></div></div>
<div class="prog" id="prog"><div class="pb"><i id="pbi"></i></div><div class="pt"><span id="pst">Uploading</span><span id="ppc">0%</span></div></div>
<div class="msg" id="msg" role="status"></div>
<button class="btn p pub" id="pub" type="submit">${I.up} Publish</button>
<p class="hint">Visible to all students immediately after publishing.</p>
</form></section>
<section class="card" aria-labelledby="lsh"><h2 id="lsh" class="sr">Published PDFs</h2>
<div class="lh"><div class="tabs" role="tablist"><button role="tab" data-t="notice" aria-selected="true">Notice <em id="cn">0</em></button><button role="tab" data-t="timetable" aria-selected="false">Time table <em id="ct">0</em></button></div>
<div class="srch"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input class="inp" id="q" placeholder="Search by name" aria-label="Search"></div></div>
<div id="list"><div class="row"><div class="ic"></div><div class="t"><div class="sk" style="width:60%"></div><div class="sk" style="width:35%;margin-top:8px"></div></div></div><div class="row"><div class="ic"></div><div class="t"><div class="sk" style="width:50%"></div><div class="sk" style="width:30%;margin-top:8px"></div></div></div></div>
</section></div></main>

<div class="mod" id="mEdit" role="dialog" aria-modal="true" aria-labelledby="meh"><form class="box" id="fEdit"><h3 id="meh">Edit details</h3><p>Change the name or category. The PDF stays the same.</p>
<div class="fld"><label class="l">Category</label><div class="seg" id="ecat"><button type="button" data-v="notice" aria-pressed="true">Notice</button><button type="button" data-v="timetable" aria-pressed="false">Time table</button></div></div>
<div class="fld" style="margin:0"><label class="l" for="etitle">Name shown to students</label><input class="inp" id="etitle" maxlength="150" autocomplete="off"></div>
<div class="ft"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn p" id="esave">Save changes</button></div></form></div>
<div class="mod" id="mDel" role="dialog" aria-modal="true" aria-labelledby="mdh"><div class="box"><h3 id="mdh">Delete this PDF?</h3><p id="dname"></p>
<div class="ft"><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn d" id="dok">Delete</button></div></div></div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>

<script>
(function(){
const $=id=>document.getElementById(id);
const TYPES={notice:'Notice',timetable:'Time table'},MAX=50*1024*1024;
let items=[],tab='notice',cat='notice',file=null,busy=false,editing=null,deleting=null;
const kb=n=>n<1024*1024?Math.max(1,Math.round(n/1024))+' KB':(n/1048576).toFixed(n<10485760?1:0)+' MB';
const when=t=>new Date(t).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});
let tt;const toast=s=>{const t=$('toast');t.textContent=s;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2800)};
const api=async(a,data,method)=>{let r;try{r=await fetch('/api/faculty?a='+a,{method:method||(data?'POST':'GET'),credentials:'same-origin',headers:data?{'content-type':'application/json'}:{},body:data?JSON.stringify(data):undefined})}catch(e){throw new Error('No internet connection. Please check and try again.')}
const j=await r.json().catch(()=>({}));if(r.status===401){location.reload();throw new Error('Session ended')}if(!r.ok||j.ok===false)throw new Error(j.error||'Something went wrong. Please try again.');return j};
function seg(el,onPick){el.querySelectorAll('button').forEach(b=>b.onclick=()=>{el.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));onPick(b.dataset.v)})}
const setSeg=(el,v)=>el.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.v===v));
seg($('cat'),v=>cat=v);
// ---------- file ----------
const msg=(s,kind)=>{const m=$('msg');m.textContent=s||'';m.className='msg'+(s?' on '+kind:'')};
function pick(f){msg('');if(!f)return;
if(!(f.type==='application/pdf'||/\\.pdf$/i.test(f.name))){msg('Please choose a PDF file.','err');return}
if(f.size>MAX){msg('This PDF is '+kb(f.size)+'. The limit is 50 MB.','err');return}
if(!f.size){msg('This file is empty.','err');return}
file=f;$('fn').textContent=f.name;$('fs').textContent=kb(f.size);$('drop').style.display='none';$('sel').classList.add('on');
const t=$('title');if(!t.value.trim()){t.value=f.name.replace(/\\.pdf$/i,'').replace(/[_]+/g,' ').replace(/\\s+/g,' ').trim().slice(0,150);count()}}
function clearFile(){file=null;$('file').value='';$('sel').classList.remove('on');$('drop').style.display=''}
$('file').onchange=e=>pick(e.target.files[0]);$('clr').onclick=clearFile;
const drop=$('drop');['dragenter','dragover'].forEach(n=>drop.addEventListener(n,e=>{e.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(n=>drop.addEventListener(n,e=>{e.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',e=>pick(e.dataTransfer.files[0]));
window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('drop',e=>e.preventDefault());
const count=()=>$('cnt').textContent=$('title').value.length+'/150';$('title').oninput=()=>{count();msg('')};
// ---------- upload ----------
const prog=(p,s)=>{$('prog').classList.add('on');$('pbi').style.width=Math.round(p*100)+'%';$('ppc').textContent=Math.round(p*100)+'%';if(s)$('pst').textContent=s};
function put(url,f,onp,headers){return new Promise((res,rej)=>{const x=new XMLHttpRequest();x.open('PUT',url);for(const k in headers||{})x.setRequestHeader(k,headers[k]);
x.upload.onprogress=e=>e.lengthComputable&&onp(e.loaded/e.total);x.onload=()=>x.status>=200&&x.status<300?res():rej(Object.assign(new Error('status '+x.status),{status:x.status}));
x.onerror=()=>rej(Object.assign(new Error('network'),{status:0}));x.ontimeout=x.onerror;x.timeout=15*60*1000;x.send(f)})}
function lock(on){busy=on;['pub','title','file','clr'].forEach(i=>$(i).disabled=on);$('cat').querySelectorAll('button').forEach(b=>b.disabled=on);
$('pub').innerHTML=on?'<span class="spin"></span> Publishing':'${I.up.replace(/'/g, "\\'")} Publish'}
$('form').onsubmit=async e=>{e.preventDefault();if(busy)return;msg('');
const title=$('title').value.replace(/\\s+/g,' ').trim();
if(!file){msg('Please choose a PDF to upload.','err');return}if(!title){msg('Please enter a name for this PDF.','err');$('title').focus();return}
lock(true);prog(0,'Uploading');window.onbeforeunload=()=>true;
try{const s=await api('sign',{type:cat,title,size:file.size});
let sent=false;
if(s.direct){try{await put(s.url,file,p=>prog(p*.96,'Uploading'),{'content-type':'application/pdf'});sent=true}catch(err){if(err.status&&err.status!==403)throw new Error('Upload failed. Please try again.')}}
if(!sent){if(file.size>s.proxyMax)throw new Error('Upload could not reach storage. Please try again in a minute.');
await put('/api/faculty?a=put&id='+s.id,file,p=>prog(p*.96,'Uploading'),{'content-type':'application/pdf'}).catch(()=>{throw new Error('Upload failed. Please check your internet and try again.')})}
prog(.98,'Checking file');const c=await api('commit',{id:s.id,type:cat,title});
items=[c.item,...items.filter(x=>x.id!==c.item.id)];prog(1,'Published');
msg('Published: '+c.item.title,'ok');toast(TYPES[c.item.type]+' published');tab=c.item.type;$('title').value='';count();clearFile();render();
setTimeout(()=>$('prog').classList.remove('on'),1200)}
catch(err){msg(err.message,'err');$('prog').classList.remove('on')}
finally{lock(false);window.onbeforeunload=null}};
// ---------- list ----------
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;render()});
$('q').oninput=render;
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
function render(){
document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.t===tab));
$('cn').textContent=items.filter(x=>x.type==='notice').length;$('ct').textContent=items.filter(x=>x.type==='timetable').length;
const w=$('q').value.toLowerCase().split(/\\s+/).filter(Boolean);
const list=items.filter(x=>x.type===tab&&w.every(k=>x.title.toLowerCase().includes(k)));
const box=$('list');box.textContent='';
if(!list.length){const e=el('div','empty');e.append(el('b',null,w.length?'No match':'Nothing here yet'),el('span',null,w.length?'Try a different name.':'Upload a PDF and choose "'+TYPES[tab]+'" to show it here.'));box.append(e);return}
for(const x of list){const r=el('div','row');const ic=el('span','ic');ic.innerHTML='${I.pdf}';
const t=el('div','t');t.append(el('b',null,x.title));const sm=el('small');sm.append(el('span','tag '+x.type,TYPES[x.type]),document.createTextNode(when(x.ts)+' · '+kb(x.size)));t.append(sm);
const a=el('div','acts');const v=el('a','btn sm','View');v.href='/api/faculty?f='+x.id;v.target='_blank';v.rel='noopener';
const ed=el('button','btn sm ghost','Edit');ed.onclick=()=>openEdit(x);const d=el('button','btn sm ghost del','Delete');d.onclick=()=>openDel(x);
a.append(v,ed,d);r.append(ic,t,a);box.append(r)}}
async function load(){try{const j=await api('list');items=j.items;render()}catch(e){const box=$('list');box.textContent='';const em=el('div','empty');em.append(el('b',null,'Could not load the list'),el('span',null,e.message+' '));const b=el('button','btn sm','Retry');b.onclick=load;em.append(b);box.append(em)}}
// ---------- modals ----------
const open=m=>{m.classList.add('on');const i=m.querySelector('input,button.d');i&&setTimeout(()=>i.focus(),30)},close=m=>m.classList.remove('on');
document.querySelectorAll('.mod').forEach(m=>{m.addEventListener('click',e=>{if(e.target===m||e.target.hasAttribute('data-close'))close(m)})});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.mod.on').forEach(close)});
let ecat='notice';seg($('ecat'),v=>ecat=v);
function openEdit(x){editing=x;ecat=x.type;setSeg($('ecat'),x.type);$('etitle').value=x.title;open($('mEdit'))}
$('fEdit').onsubmit=async e=>{e.preventDefault();const title=$('etitle').value.replace(/\\s+/g,' ').trim();if(!title){$('etitle').focus();return}
const b=$('esave');b.disabled=true;b.innerHTML='<span class="spin"></span> Saving';
try{const j=await api('edit',{id:editing.id,type:ecat,title});items=items.map(x=>x.id===j.item.id?j.item:x);close($('mEdit'));render();toast('Changes saved')}catch(err){toast(err.message)}finally{b.disabled=false;b.textContent='Save changes'}};
function openDel(x){deleting=x;$('dname').textContent='"'+x.title+'" will be removed from rtuhub.in. Students will no longer see it.';open($('mDel'))}
$('dok').onclick=async()=>{const b=$('dok');b.disabled=true;b.innerHTML='<span class="spin"></span> Deleting';
try{await api('delete',{id:deleting.id});items=items.filter(x=>x.id!==deleting.id);close($('mDel'));render();toast('PDF deleted')}catch(err){toast(err.message)}finally{b.disabled=false;b.textContent='Delete'}};
$('out').onclick=async()=>{try{await api('logout',{})}catch(e){}location.reload()};
load();
})();
</script></body></html>`;
