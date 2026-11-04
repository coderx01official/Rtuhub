// =====================================================================
//  ADMIN PORTAL  —  rtuhub.in/admin   (sirf password se; ek baar sahi password dene par us browser mein 1 saal yaad rehta hai)
//  Vercel env:  ADMIN_PASSWORD (zaroori),  D1_TOKEN + D1_ACCOUNT_ID + D1_DATABASE_ID (data ke liye, dekho _d1.js)
//  Password badalte hi purane saare login band ho jaate hain. Page search engines mein nahi aata, aur koi link nahi hai.
// =====================================================================
import { d1, d1On, d1Missing, dayOf } from './_d1.js';

export const config = { runtime: 'edge' };

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const PASS = () => process.env.ADMIN_PASSWORD || '';
async function hmac(message) {
  const key = await crypto.subtle.importKey('raw', enc.encode((process.env.RTUHUB_SECRET || 'rtuhub') + '|admin|' + PASS()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const YEAR = 365 * 86400;
async function mint() { const exp = Date.now() + YEAR * 1000; return exp + '.' + await hmac('admin.v1.' + exp); }
async function authed(request) {
  const m = (request.headers.get('cookie') || '').match(/(?:^|;\s*)rh_admin=([^;]+)/);
  const [exp, sig] = String(m ? m[1] : '').split('.');
  if (!PASS() || !/^\d+$/.test(exp || '') || !sig || +exp < Date.now()) return false;
  return same(await hmac('admin.v1.' + exp), sig);
}

const fails = new Map();
const failed = ip => { const now = Date.now(); return (fails.get(ip) || []).filter(t => now - t < 900000); };

const HEAD = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'x-frame-options': 'DENY' };
const page = (html, status = 200, extra = {}) => new Response(html, { status, headers: { ...HEAD, ...extra } });
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });

const CSS = `
:root{--bg:#f4f6fa;--card:#fff;--ink:#14213d;--mute:#6b7690;--line:#e3e8f1;--a:#2563eb;--b:#10b981;--c:#f59e0b;--bad:#ef4444}
@media(prefers-color-scheme:dark){:root{--bg:#0b1020;--card:#131a2e;--ink:#e8edf8;--mute:#8d99b5;--line:#232c47;--a:#60a5fa;--b:#34d399;--c:#fbbf24;--bad:#f87171}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
button,input{font:inherit}a{color:var(--a)}
`;

const loginPage = (msg = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Admin</title>
<style>${CSS}
.w{min-height:100vh;display:grid;place-items:center;padding:16px}.c{width:100%;max-width:360px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:28px;box-shadow:0 10px 40px rgba(0,0,0,.12)}
h1{margin:0 0 4px;font-size:20px}p{margin:0 0 18px;color:var(--mute);font-size:13px}input{width:100%;padding:12px 14px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);margin-bottom:12px}
button{width:100%;padding:12px;border:0;border-radius:10px;background:var(--a);color:#fff;font-weight:600;cursor:pointer}.e{color:var(--bad);font-size:13px;margin:-2px 0 10px}</style></head>
<body><div class="w"><form class="c" method="post" action="/admin"><h1>RTU Hub Admin</h1><p>Enter the admin password. This browser will stay signed in.</p>
${msg ? '<div class="e">' + msg + '</div>' : ''}<input type="password" name="pw" placeholder="Password" autocomplete="current-password" autofocus required><button type="submit">Sign in</button></form></div></body></html>`;

const DASH = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>RTU Hub Admin</title>
<style>${CSS}
header{position:sticky;top:0;z-index:5;background:var(--card);border-bottom:1px solid var(--line);display:flex;gap:10px;align-items:center;padding:12px 16px;flex-wrap:wrap}
header b{font-size:17px;margin-right:auto}header input,header button{padding:8px 12px;border-radius:9px;border:1px solid var(--line);background:var(--bg);color:var(--ink);cursor:pointer}
main{max-width:1180px;margin:0 auto;padding:16px}.grid{display:grid;gap:12px}.kpis{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;min-width:0}.k small{display:block;color:var(--mute);font-size:12px;text-transform:uppercase;letter-spacing:.04em}
.k b{font-size:28px;line-height:1.2;display:block;margin-top:4px}.k span{font-size:12px;color:var(--mute)}.live b::before{content:"";display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--b);margin-right:8px;box-shadow:0 0 0 4px rgba(16,185,129,.2);vertical-align:middle}
h2{font-size:14px;margin:0 0 10px;color:var(--mute);text-transform:uppercase;letter-spacing:.05em}.two{grid-template-columns:repeat(auto-fit,minmax(340px,1fr))}.mt{margin-top:12px}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:7px 6px;border-bottom:1px solid var(--line);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px}th{color:var(--mute);font-weight:600;font-size:12px}td.n,th.n{text-align:right}.sc{overflow-x:auto}
svg{width:100%;height:auto;display:block}.lg{display:flex;gap:14px;font-size:12px;color:var(--mute);margin-bottom:6px;flex-wrap:wrap}.lg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px}
.ok{color:var(--b)}.no{color:var(--bad)}.warn{background:rgba(245,158,11,.12);border:1px solid var(--c);border-radius:12px;padding:14px;margin-bottom:12px}.warn code{background:var(--bg);padding:2px 6px;border-radius:5px}
.bar{height:6px;background:var(--line);border-radius:4px;overflow:hidden;min-width:60px}.bar>i{display:block;height:100%;background:var(--a)}
</style></head><body>
<header><b>RTU Hub &middot; Admin</b><input type="month" id="m"><button id="r">Refresh</button><button id="o">Sign out</button></header>
<main><div id="setup"></div><div class="grid kpis" id="kpis"></div>
<div class="grid two mt"><div class="card"><h2 id="t1">Daily</h2><div class="lg"><span><i style="background:var(--a)"></i>Visitors</span><span><i style="background:var(--b)"></i>AI users</span><span><i style="background:var(--c)"></i>AI requests</span></div><div id="c1"></div></div>
<div class="card"><h2>Last 12 months</h2><div class="lg"><span><i style="background:var(--a)"></i>Visitors</span><span><i style="background:var(--b)"></i>AI users (unique IPs)</span></div><div id="c2"></div></div></div>
<div class="grid two mt"><div class="card"><h2>AI models used</h2><div class="sc" id="tm"></div></div><div class="card"><h2>AI users by IP (this month)</h2><div class="sc" id="tu"></div></div></div>
<div class="grid two mt"><div class="card"><h2>Countries</h2><div id="tc"></div></div><div class="card"><h2>Devices</h2><div id="td"></div></div><div class="card"><h2>Top pages</h2><div id="tp"></div></div></div>
<div class="card mt"><h2>Recent AI activity</h2><div class="sc" id="tr"></div></div>
<p style="color:var(--mute);font-size:12px;text-align:center">Real IPs are never stored: only a short hash. Times are IST. Bots are not counted.</p></main>
<script>
var $=function(i){return document.getElementById(i)};
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function num(n){return Number(n||0).toLocaleString('en-IN')}
function pct(a,b){return b?Math.round(100*a/b)+'%':'-'}
function ago(ts){var s=Math.max(0,Math.round((Date.now()-ts)/1000));return s<60?s+'s ago':s<3600?Math.round(s/60)+'m ago':s<86400?Math.round(s/3600)+'h ago':Math.round(s/86400)+'d ago'}
function kpi(l,v,sub,cls){return '<div class="card k '+(cls||'')+'"><small>'+l+'</small><b>'+v+'</b><span>'+(sub||'&nbsp;')+'</span></div>'}
function table(head,rows,right){if(!rows.length)return '<p style="color:var(--mute);font-size:13px">No data yet.</p>';return '<table><tr>'+head.map(function(h,i){return '<th class="'+(right.indexOf(i)>-1?'n':'')+'">'+h+'</th>'}).join('')+'</tr>'+rows.map(function(r){return '<tr>'+r.map(function(c,i){return '<td class="'+(right.indexOf(i)>-1?'n':'')+'">'+c+'</td>'}).join('')+'</tr>'}).join('')+'</table>'}
function shares(rows){var mx=Math.max(1,Math.max.apply(null,rows.map(function(r){return r[1]})));return table(['',  'Visitors',''],rows.map(function(r){return [esc(r[0]||'Unknown'),num(r[1]),'<div class="bar"><i style="width:'+Math.round(100*r[1]/mx)+'%"></i></div>']}),[1])}
function line(el,labels,series){
  var W=640,H=230,L=40,R=8,T=10,B=26,mx=1;series.forEach(function(s){s.d.forEach(function(v){if(v>mx)mx=v})});
  mx=Math.ceil(mx*1.1);var n=labels.length,sx=function(i){return L+(n<2?0:(W-L-R)*i/(n-1))},sy=function(v){return T+(H-T-B)*(1-v/mx)},o='';
  for(var g=0;g<=4;g++){var y=T+(H-T-B)*g/4;o+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/><text x="'+(L-6)+'" y="'+(y+4)+'" text-anchor="end" font-size="10" fill="var(--mute)">'+Math.round(mx*(1-g/4))+'</text>'}
  labels.forEach(function(l,i){if(n<=16||i%Math.ceil(n/12)===0)o+='<text x="'+sx(i)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10" fill="var(--mute)">'+l+'</text>'});
  series.forEach(function(s){var p=s.d.map(function(v,i){return (i?'L':'M')+sx(i).toFixed(1)+' '+sy(v).toFixed(1)}).join(' ');o+='<path d="'+p+'" fill="none" stroke="'+s.c+'" stroke-width="2.2" stroke-linejoin="round"/>';s.d.forEach(function(v,i){o+='<circle cx="'+sx(i).toFixed(1)+'" cy="'+sy(v).toFixed(1)+'" r="3" fill="'+s.c+'"><title>'+labels[i]+': '+v+'</title></circle>'})});
  el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'">'+o+'</svg>'}
function bars(el,labels,series){
  var W=640,H=230,L=40,R=8,T=10,B=26,mx=1;series.forEach(function(s){s.d.forEach(function(v){if(v>mx)mx=v})});mx=Math.ceil(mx*1.1);
  var n=labels.length,gw=(W-L-R)/n,bw=Math.min(18,gw/(series.length+1)),o='';
  for(var g=0;g<=4;g++){var y=T+(H-T-B)*g/4;o+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/><text x="'+(L-6)+'" y="'+(y+4)+'" text-anchor="end" font-size="10" fill="var(--mute)">'+Math.round(mx*(1-g/4))+'</text>'}
  labels.forEach(function(l,i){var x0=L+gw*i+(gw-bw*series.length)/2;o+='<text x="'+(L+gw*i+gw/2)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10" fill="var(--mute)">'+l+'</text>';series.forEach(function(s,k){var h=(H-T-B)*s.d[i]/mx;o+='<rect x="'+(x0+bw*k).toFixed(1)+'" y="'+(H-B-h).toFixed(1)+'" width="'+(bw-2)+'" height="'+h.toFixed(1)+'" rx="3" fill="'+s.c+'"><title>'+l+' '+s.n+': '+s.d[i]+'</title></rect>'})});
  el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'">'+o+'</svg>'}
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function load(){
  var m=$('m').value;
  fetch('/admin?api=stats&m='+encodeURIComponent(m),{credentials:'same-origin',cache:'no-store'}).then(function(r){if(r.status===401){location.reload();return null}return r.json()}).then(function(d){
    if(!d)return;
    if(d.setup){$('setup').innerHTML='<div class="warn"><b>Database not connected yet.</b><br>Add these in Vercel &rarr; Settings &rarr; Environment Variables, then redeploy: '+d.setup.map(function(x){return '<code>'+x+'</code>'}).join(' ')+'</div>';$('kpis').innerHTML='';return}
    if(d.error){$('setup').innerHTML='<div class="warn"><b>Could not read data.</b> '+esc(d.error)+'</div>';return}
    $('setup').innerHTML='';
    var aiM=d.aiMonth,aiT=d.aiToday;
    $('kpis').innerHTML=kpi('Active now',num(d.now),'last 5 minutes','live')+kpi('Visitors today',num(d.today.v),num(d.today.views)+' page views')+kpi('Visitors this month',num(d.month.v),num(d.month.ips)+' unique IPs')+kpi('New this month',num(d.newMonth),'first-time visitors')+kpi('All-time visitors',num(d.total),num(d.last24)+' in last 24h')
     +kpi('AI users today',num(aiT.ips),num(aiT.req)+' requests')+kpi('AI users this month',num(aiM.ips),num(aiM.req)+' requests')+kpi('AI success rate',pct(aiM.ok,aiM.req),num(aiM.req-aiM.ok)+' failed this month');
    var dm={},da={};d.dailyV.forEach(function(r){dm[r.day]=r});d.dailyA.forEach(function(r){da[r.day]=r});
    var y=+m.slice(0,4),mo=+m.slice(5,7),dim=new Date(y,mo,0).getDate(),lab=[],v=[],au=[],ar=[],today=d.todayDay;
    for(var i=1;i<=dim;i++){var key=m+'-'+(i<10?'0':'')+i;if(key>today)break;lab.push(i);v.push(dm[key]?dm[key].v:0);au.push(da[key]?da[key].ips:0);ar.push(da[key]?da[key].req:0)}
    $('t1').textContent='Daily - '+MON[mo-1]+' '+y;
    line($('c1'),lab,[{c:'var(--a)',d:v},{c:'var(--b)',d:au},{c:'var(--c)',d:ar}]);
    var mv={},ma={};d.monthlyV.forEach(function(r){mv[r.m]=r});d.monthlyA.forEach(function(r){ma[r.m]=r});
    var ml=[],a1=[],a2=[];d.months.forEach(function(k){ml.push(MON[+k.slice(5,7)-1]);a1.push(mv[k]?mv[k].v:0);a2.push(ma[k]?ma[k].ips:0)});
    bars($('c2'),ml,[{c:'var(--a)',d:a1,n:'visitors'},{c:'var(--b)',d:a2,n:'AI users'}]);
    $('tm').innerHTML=table(['Provider','Model','Requests','Success'],d.models.map(function(r){return [esc(r.prov||'-'),esc(r.model||'-'),num(r.n),'<span class="'+(r.ok===r.n?'ok':r.ok?'':'no')+'">'+pct(r.ok,r.n)+'</span>']}),[2,3]);
    $('tu').innerHTML=table(['User (IP hash)','Country','Requests','Last seen'],d.aiUsers.map(function(r){return ['<code>'+esc(r.u)+'</code>',esc(r.c||'-'),num(r.n),ago(r.last)]}),[2]);
    $('tc').innerHTML=shares(d.countries.map(function(r){return [r.c,r.n]}));$('td').innerHTML=shares(d.devices.map(function(r){return [r.d,r.n]}));
    $('tp').innerHTML=table(['Page','Views'],d.paths.map(function(r){return [esc(r.p||'/'),num(r.n)]}),[1]);
    $('tr').innerHTML=table(['When','User','Country','Provider','Model','Result'],d.recent.map(function(r){return [ago(r.ts),'<code>'+esc(r.u)+'</code>',esc(r.country||'-'),esc(r.prov||'-'),esc(r.model||'-'),r.ok?'<span class="ok">ok'+(r.status&&r.status!=='ok'?' ('+esc(r.status)+')':'')+'</span>':'<span class="no">failed</span>']}),[]);
  }).catch(function(e){$('setup').innerHTML='<div class="warn">Could not load: '+esc(e.message)+'</div>'})}
var now=new Date(Date.now()+19800000).toISOString().slice(0,7);$('m').value=now;$('m').max=now;$('m').onchange=load;$('r').onclick=load;
$('o').onclick=function(){fetch('/admin?logout=1',{method:'POST',credentials:'same-origin'}).then(function(){location.reload()})};
load();setInterval(function(){if(document.visibilityState==='visible')load()},30000);
</script></body></html>`;

async function stats(m) {
  const now = Date.now(), today = dayOf(now), like = m + '%';
  const [y, mo] = m.split('-').map(Number);
  const t0 = Date.parse(`${m}-01T00:00:00+05:30`), t1 = Date.parse(`${mo === 12 ? y + 1 : y}-${String(mo === 12 ? 1 : mo + 1).padStart(2, '0')}-01T00:00:00+05:30`);
  const cur = dayOf(now).slice(0, 7), [cy, cm] = cur.split('-').map(Number);
  const months = []; for (let i = 11; i >= 0; i--) { const t = new Date(Date.UTC(cy, cm - 1 - i, 1)); months.push(t.toISOString().slice(0, 7)); }
  const from = months[0] + '-01';
  const Q = (sql, params = []) => ({ sql, params });
  const R = await d1([
    Q('SELECT COUNT(*) c FROM visitors WHERE last_ts > ?', [now - 300000]),
    Q('SELECT COUNT(*) c FROM visitors WHERE last_ts > ?', [now - 86400000]),
    Q('SELECT COUNT(*) c FROM visitors'),
    Q("SELECT COUNT(DISTINCT vid) v, COUNT(DISTINCT ip) ips, COUNT(*) views FROM events WHERE kind='view' AND day = ?", [today]),
    Q("SELECT COUNT(DISTINCT vid) v, COUNT(DISTINCT ip) ips, COUNT(*) views FROM events WHERE kind='view' AND day LIKE ?", [like]),
    Q("SELECT COUNT(*) req, COUNT(DISTINCT ip) ips, COALESCE(SUM(ok),0) ok FROM events WHERE kind='ai' AND day = ?", [today]),
    Q("SELECT COUNT(*) req, COUNT(DISTINCT ip) ips, COALESCE(SUM(ok),0) ok FROM events WHERE kind='ai' AND day LIKE ?", [like]),
    Q("SELECT day, COUNT(DISTINCT vid) v, COUNT(*) views FROM events WHERE kind='view' AND day LIKE ? GROUP BY day", [like]),
    Q("SELECT day, COUNT(*) req, COUNT(DISTINCT ip) ips FROM events WHERE kind='ai' AND day LIKE ? GROUP BY day", [like]),
    Q("SELECT substr(day,1,7) m, COUNT(DISTINCT vid) v, COUNT(DISTINCT ip) ips FROM events WHERE kind='view' AND day >= ? GROUP BY m", [from]),
    Q("SELECT substr(day,1,7) m, COUNT(*) req, COUNT(DISTINCT ip) ips FROM events WHERE kind='ai' AND day >= ? GROUP BY m", [from]),
    Q("SELECT prov, model, COUNT(*) n, COALESCE(SUM(ok),0) ok FROM events WHERE kind='ai' AND day LIKE ? GROUP BY prov, model ORDER BY n DESC LIMIT 25", [like]),
    Q("SELECT country c, COUNT(DISTINCT vid) n FROM events WHERE kind='view' AND day LIKE ? GROUP BY country ORDER BY n DESC LIMIT 10", [like]),
    Q("SELECT device d, COUNT(DISTINCT vid) n FROM events WHERE kind='view' AND day LIKE ? GROUP BY device ORDER BY n DESC LIMIT 6", [like]),
    Q("SELECT path p, COUNT(*) n FROM events WHERE kind='view' AND day LIKE ? GROUP BY path ORDER BY n DESC LIMIT 12", [like]),
    Q("SELECT substr(ip,1,8) u, MAX(country) c, COUNT(*) n, MAX(ts) last FROM events WHERE kind='ai' AND day LIKE ? GROUP BY ip ORDER BY n DESC LIMIT 15", [like]),
    Q("SELECT ts, substr(ip,1,8) u, country, prov, model, ok, status FROM events WHERE kind='ai' ORDER BY ts DESC LIMIT 20"),
    Q('SELECT COUNT(*) c FROM visitors WHERE first_ts >= ? AND first_ts < ?', [t0, t1])
  ]);
  const rows = i => (R[i] && R[i].results) || [], one = i => rows(i)[0] || {};
  return { todayDay: today, months, now: one(0).c || 0, last24: one(1).c || 0, total: one(2).c || 0, today: one(3), month: one(4), aiToday: one(5), aiMonth: one(6),
    dailyV: rows(7), dailyA: rows(8), monthlyV: rows(9), monthlyA: rows(10), models: rows(11), countries: rows(12), devices: rows(13), paths: rows(14), aiUsers: rows(15), recent: rows(16), newMonth: one(17).c || 0 };
}

export default async function handler(request) {
  const url = new URL(request.url), ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'x';
  if (!PASS()) return page('<!doctype html><meta name="robots" content="noindex"><body style="font:16px system-ui;padding:40px"><h2>Admin is not set up</h2><p>Add <code>ADMIN_PASSWORD</code> in Vercel &rarr; Settings &rarr; Environment Variables and redeploy.</p>', 503);

  if (request.method === 'POST') {
    if (url.searchParams.get('logout')) return new Response(null, { status: 204, headers: { 'set-cookie': 'rh_admin=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict', 'cache-control': 'no-store' } });
    const recent = failed(ip);
    if (recent.length >= 6) return page(loginPage('Too many wrong attempts. Try again in 15 minutes.'), 429);
    let pw = '';
    try { pw = String((await request.formData()).get('pw') || ''); } catch (e) {}
    if (pw && same(await sha(pw), await sha(PASS()))) {
      return new Response(null, { status: 303, headers: { location: '/admin', 'cache-control': 'no-store', 'set-cookie': `rh_admin=${await mint()}; Path=/; Max-Age=${YEAR}; HttpOnly; Secure; SameSite=Strict` } });
    }
    recent.push(Date.now()); fails.set(ip, recent); if (fails.size > 2000) fails.clear();
    await new Promise(done => setTimeout(done, 800));
    return page(loginPage('Wrong password.'), 401);
  }

  if (url.searchParams.get('health') === '1') {   // sirf haan / na: database juda hai ya nahi (koi data nahi)
    if (!d1On()) return json({ d1: 'setup', missing: d1Missing() });
    try { await d1([{ sql: 'SELECT COUNT(*) c FROM visitors' }]); return json({ d1: 'ok' }); } catch (e) { return json({ d1: 'error', why: String(e.message || e).replace(/[A-Za-z0-9_\-]{30,}/g, '***').slice(0, 120) }); }
  }
  const ok = await authed(request);
  if (url.searchParams.get('api') === 'stats') {
    if (!ok) return json({ error: 'auth' }, 401);
    if (!d1On()) return json({ setup: d1Missing() });
    const m = /^\d{4}-(0[1-9]|1[0-2])$/.test(url.searchParams.get('m') || '') ? url.searchParams.get('m') : dayOf().slice(0, 7);
    try { return json(await stats(m)); } catch (e) { return json({ error: String(e.message || e).slice(0, 200) }); }
  }
  return ok ? page(DASH) : page(loginPage());
}
