// =====================================================================
//  ADMIN PORTAL  —  rtuhub.in/admin   (sirf password se; ek baar sahi password dene par us browser mein 1 saal yaad rehta hai)
//  Vercel env:  ADMIN_PASSWORD (zaroori),  D1_TOKEN + D1_ACCOUNT_ID + D1_DATABASE_ID (data ke liye, dekho _d1.js)
//  Password badalte hi purane saare login band ho jaate hain. Page search engines mein nahi aata, aur koi link nahi hai.
// =====================================================================
import { d1, d1On, d1Missing, dayOf } from './_d1.js';

export const config = { runtime: 'edge' };

import { PASS, sha, same, YEAR, mint, authed } from './_adminauth.js';

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
:root[data-theme=light]{--bg:#f4f6fa;--card:#fff;--ink:#14213d;--mute:#6b7690;--line:#e3e8f1;--a:#2563eb;--b:#10b981;--c:#f59e0b;--bad:#ef4444}
:root[data-theme=dark]{--bg:#0b1020;--card:#131a2e;--ink:#e8edf8;--mute:#8d99b5;--line:#232c47;--a:#60a5fa;--b:#34d399;--c:#fbbf24;--bad:#f87171}
.top{position:sticky;top:0;z-index:20;background:var(--card);border-bottom:1px solid var(--line)}
.bar{max-width:1240px;margin:0 auto;display:flex;align-items:center;gap:8px;padding:10px 16px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:16px;margin-right:auto}.brand small{display:block;font-weight:500;color:var(--mute);font-size:11px;margin-top:-2px}
.logo{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,var(--a),#8b5cf6);display:grid;place-items:center;color:#fff;font-weight:800;font-size:14px}
.tabs{max-width:1240px;margin:0 auto;display:flex;gap:2px;padding:0 10px;overflow-x:auto;scrollbar-width:none}.tabs::-webkit-scrollbar{display:none}
.tab{padding:11px 14px;border:0;background:none;color:var(--mute);font-weight:600;font-size:14px;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap}.tab.on{color:var(--ink);border-bottom-color:var(--a)}
.btn{padding:8px 13px;border-radius:9px;border:1px solid var(--line);background:var(--bg);color:var(--ink);cursor:pointer;font-weight:600;font-size:13px;white-space:nowrap}.btn.p{background:var(--a);border-color:var(--a);color:#fff}.btn:disabled{opacity:.55;cursor:default}.btn.sm{padding:5px 10px;font-size:12px}
.inp{padding:8px 12px;border-radius:9px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:13px;min-width:0}
main{max-width:1240px;margin:0 auto;padding:14px 16px 40px}.sec{display:none}.sec.on{display:block}
.h{display:flex;align-items:baseline;gap:10px;margin:22px 0 10px;flex-wrap:wrap}.h:first-child{margin-top:6px}.h h3{margin:0;font-size:15px}.h span{color:var(--mute);font-size:12px}.h .sp{margin-left:auto;display:flex;gap:8px;align-items:center}
.grid{display:grid;gap:12px}.kpis{grid-template-columns:repeat(auto-fit,minmax(165px,1fr))}.two{grid-template-columns:repeat(auto-fit,minmax(330px,1fr))}.three{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;min-width:0}.card h2{font-size:12px;margin:0 0 10px;color:var(--mute);text-transform:uppercase;letter-spacing:.05em}
.k small{display:block;color:var(--mute);font-size:11px;text-transform:uppercase;letter-spacing:.05em}.k b{font-size:26px;line-height:1.2;display:block;margin-top:4px}.k span{font-size:12px;color:var(--mute)}
.live b::before{content:"";display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--b);margin-right:8px;box-shadow:0 0 0 4px rgba(16,185,129,.2);vertical-align:middle}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:8px 8px;border-bottom:1px solid var(--line);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px}th{color:var(--mute);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.04em;position:sticky;top:0;background:var(--card)}
td.n,th.n{text-align:right}tr:last-child td{border-bottom:0}.sc{overflow-x:auto;max-height:520px;overflow-y:auto}
svg{width:100%;height:auto;display:block}.lg{display:flex;gap:14px;font-size:12px;color:var(--mute);margin-bottom:6px;flex-wrap:wrap}.lg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px}
.ok{color:var(--b)}.no{color:var(--bad)}.mu{color:var(--mute)}.warn{background:rgba(245,158,11,.12);border:1px solid var(--c);border-radius:12px;padding:14px;margin-bottom:12px}.warn code{background:var(--bg);padding:2px 6px;border-radius:5px}
.bar2{height:6px;background:var(--line);border-radius:4px;overflow:hidden;min-width:70px}.bar2>i{display:block;height:100%;background:var(--a)}.bar2.g>i{background:var(--b)}
.badge{display:inline-block;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700}.badge.g{background:rgba(16,185,129,.15);color:var(--b)}.badge.r{background:rgba(239,68,68,.15);color:var(--bad)}.badge.y{background:rgba(245,158,11,.18);color:var(--c)}.badge.m{background:var(--line);color:var(--mute)}
.empty{color:var(--mute);font-size:13px;padding:6px 0}.toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:10px 16px;border-radius:10px;font-size:13px;z-index:50;display:none;max-width:90vw}
.prog{margin-top:10px}.prog .bar2{height:8px}.stat{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px}.stat:last-child{border-bottom:0}
@media(max-width:640px){.k b{font-size:22px}.bar{padding:8px 12px}.hide-s{display:none}}
</style></head><body>
<div class="top"><div class="bar"><div class="brand"><div class="logo">R</div><div>RTU Hub<small>Admin console</small></div></div>
<input type="month" id="m" class="inp"><button class="btn" id="th" title="Theme">Theme</button><button class="btn" id="r">Refresh</button><button class="btn" id="o">Sign out</button></div>
<div class="tabs" id="tabs"><button class="tab" data-t="overview">Overview</button><button class="tab" data-t="visitors">Visitors</button><button class="tab" data-t="ai">AI usage</button><button class="tab" data-t="models">Models</button><button class="tab" data-t="system">System</button></div></div>
<main><div id="setup"></div>

<section class="sec" id="s-overview">
<div class="h"><h3>Traffic</h3><span id="upd"></span></div><div class="grid kpis" id="k-traffic"></div>
<div class="h"><h3>AI</h3></div><div class="grid kpis" id="k-ai"></div>
<div class="h"><h3>Trends</h3></div>
<div class="grid two"><div class="card"><h2 id="t1">Daily</h2><div class="lg"><span><i style="background:var(--a)"></i>Visitors</span><span><i style="background:var(--b)"></i>AI users</span><span><i style="background:var(--c)"></i>AI requests</span></div><div id="c1"></div></div>
<div class="card"><h2>Last 12 months</h2><div class="lg"><span><i style="background:var(--a)"></i>Visitors</span><span><i style="background:var(--b)"></i>AI users</span></div><div id="c2"></div></div></div>
<div class="h"><h3>Audience</h3><span>this month</span></div>
<div class="grid three"><div class="card"><h2>Countries</h2><div id="tc"></div></div><div class="card"><h2>Devices</h2><div id="td"></div></div><div class="card"><h2>Browsers</h2><div id="tb"></div></div><div class="card"><h2>Operating systems</h2><div id="to"></div></div><div class="card"><h2>Came from</h2><div id="tf"></div></div><div class="card"><h2>Top pages</h2><div id="tp"></div></div></div>
</section>

<section class="sec" id="s-visitors">
<div class="h"><h3>Visitors</h3><span id="vcount"></span><div class="sp"><input class="inp" id="vq" placeholder="Search city, device, browser..."><button class="btn" id="vcsv">Export CSV</button></div></div>
<div class="card"><div class="sc" id="tv"></div></div>
<p class="mu" style="font-size:12px">Each row is one browser (random id). "Unique devices" on Overview also merges the same phone/laptop after cookies are cleared.</p>
</section>

<section class="sec" id="s-ai">
<div class="h"><h3>AI usage</h3><span id="aimonth"></span></div><div class="grid kpis" id="k-ai2"></div>
<div class="h"><h3>Providers</h3></div><div class="card"><div class="sc" id="tpv"></div></div>
<div class="grid two" style="margin-top:12px"><div class="card"><h2>Peak hours (IST)</h2><div id="c3"></div></div><div class="card"><h2>Failure reasons</h2><div id="tfail"></div></div></div>
<div class="h"><h3>Models used</h3></div><div class="card"><div class="sc" id="tm"></div></div>
<div class="h"><h3>AI users</h3><span>by masked IP, this month</span></div><div class="card"><div class="sc" id="tu"></div></div>
<div class="h"><h3>Recent activity</h3></div><div class="card"><div class="sc" id="tr"></div></div>
</section>

<section class="sec" id="s-models">
<div class="h"><h3>Model testing</h3><div class="sp"><span id="rfm"></span><button class="btn p" id="rf">Refresh all models</button></div></div>
<div class="card"><p class="mu" style="margin:0;font-size:13px">Sends one tiny real message to every model and saves the result. Students only read the saved working list, so opening the picker never tests anything. Run this when a model seems to have stopped or started working.</p><div class="stat" style="margin-top:12px"><span>Automatic refresh <span class="mu">(every 2 days, around 3 AM IST)</span></span><span id="cronst"></span><button class="btn sm" id="cronnow">Run now</button></div><div class="prog" id="prog" style="display:none"><div class="bar2 g"><i id="progbar" style="width:0"></i></div></div></div>
<div class="h"><h3>Summary</h3></div><div class="grid kpis" id="k-models"></div>
<div class="h"><h3>Provider summary</h3></div><div class="card"><div class="sc" id="tsum"></div></div>
<div class="h"><h3>Providers</h3><span>keys and models, tested separately</span></div><div class="grid two" id="pcards"></div>
<div class="h"><h3>Photo reading (vision)</h3><span>models that can read an image</span><div class="sp"><span id="rvm"></span><button class="btn" id="rv">Test vision models</button></div></div>
<div class="grid kpis" id="k-vision"></div>
<div class="card" style="margin-top:12px"><div class="sc" id="tvis"></div></div>
<p class="mu" style="font-size:12px">If no vision model works, the site reads the photo on the student's own phone (OCR) and sends the text to any model, so nothing breaks.</p>
<div class="h"><h3>All tested models</h3><div class="sp"><input class="inp" id="mq" placeholder="Filter..."><select class="inp" id="mf"><option value="1">Working only</option><option value="">All tested</option><option value="0">Not working</option></select></div></div>
<div class="card"><div class="sc" id="tml"></div></div>
</section>

<section class="sec" id="s-system">
<div class="h"><h3>System health</h3></div>
<div class="grid two"><div class="card"><h2>Services</h2><div id="sys"></div></div><div class="card"><h2>AI providers</h2><div id="sysp"></div></div></div>
<p class="mu" style="font-size:12px;margin-top:14px">Full IP addresses are never stored: only a masked form (last part hidden) and a hash. Times are IST. Bots are not counted.</p>
</section>
</main><div class="toast" id="toast"></div>
<script>
var $=function(i){return document.getElementById(i)};
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function num(n){return Number(n||0).toLocaleString('en-IN')}
function pct(a,b){return b?Math.round(100*a/b)+'%':'-'}
function ago(ts){if(!ts)return '-';var s=Math.max(0,Math.round((Date.now()-ts)/1000));return s<60?s+'s ago':s<3600?Math.round(s/60)+'m ago':s<86400?Math.round(s/3600)+'h ago':Math.round(s/86400)+'d ago'}
function toast(t){var e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(function(){e.style.display='none'},3500)}
function kpi(l,v,sub,cls){return '<div class="card k '+(cls||'')+'"><small>'+l+'</small><b>'+v+'</b><span>'+(sub||'&nbsp;')+'</span></div>'}
function table(head,rows,right,empty){if(!rows.length)return '<div class="empty">'+(empty||'No data yet.')+'</div>';return '<table><tr>'+head.map(function(h,i){return '<th class="'+(right.indexOf(i)>-1?'n':'')+'">'+h+'</th>'}).join('')+'</tr>'+rows.map(function(r){return '<tr>'+r.map(function(c,i){return '<td class="'+(right.indexOf(i)>-1?'n':'')+'">'+c+'</td>'}).join('')+'</tr>'}).join('')+'</table>'}
function shares(rows){if(!rows.length)return '<div class="empty">No data yet.</div>';var mx=Math.max(1,Math.max.apply(null,rows.map(function(r){return r[1]})));return table(['','',''],rows.map(function(r){return [esc(r[0]||'Unknown'),num(r[1]),'<div class="bar2"><i style="width:'+Math.round(100*r[1]/mx)+'%"></i></div>']}),[1])}
function line(el,labels,series){
  var W=640,H=230,L=40,R=8,T=10,B=26,mx=1;series.forEach(function(s){s.d.forEach(function(v){if(v>mx)mx=v})});
  mx=Math.ceil(mx*1.1);var n=labels.length,sx=function(i){return L+(n<2?(W-L-R)/2:(W-L-R)*i/(n-1))},sy=function(v){return T+(H-T-B)*(1-v/mx)},o='';
  for(var g=0;g<=4;g++){var y=T+(H-T-B)*g/4;o+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/><text x="'+(L-6)+'" y="'+(y+4)+'" text-anchor="end" font-size="10" fill="var(--mute)">'+Math.round(mx*(1-g/4))+'</text>'}
  labels.forEach(function(l,i){if(n<=16||i%Math.ceil(n/12)===0)o+='<text x="'+sx(i)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10" fill="var(--mute)">'+l+'</text>'});
  series.forEach(function(s){var p=s.d.map(function(v,i){return (i?'L':'M')+sx(i).toFixed(1)+' '+sy(v).toFixed(1)}).join(' ');o+='<path d="'+p+'" fill="none" stroke="'+s.c+'" stroke-width="2.2" stroke-linejoin="round"/>';s.d.forEach(function(v,i){o+='<circle cx="'+sx(i).toFixed(1)+'" cy="'+sy(v).toFixed(1)+'" r="3" fill="'+s.c+'"><title>'+labels[i]+': '+v+'</title></circle>'})});
  el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'">'+o+'</svg>'}
function bars(el,labels,series){
  var W=640,H=230,L=40,R=8,T=10,B=26,mx=1;series.forEach(function(s){s.d.forEach(function(v){if(v>mx)mx=v})});mx=Math.ceil(mx*1.1);
  var n=labels.length,gw=(W-L-R)/n,bw=Math.min(18,gw/(series.length+1)),o='';
  for(var g=0;g<=4;g++){var y=T+(H-T-B)*g/4;o+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/><text x="'+(L-6)+'" y="'+(y+4)+'" text-anchor="end" font-size="10" fill="var(--mute)">'+Math.round(mx*(1-g/4))+'</text>'}
  labels.forEach(function(l,i){var x0=L+gw*i+(gw-bw*series.length)/2;if(n<=14||i%2===0)o+='<text x="'+(L+gw*i+gw/2)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10" fill="var(--mute)">'+l+'</text>';series.forEach(function(s,k){var h=(H-T-B)*s.d[i]/mx;o+='<rect x="'+(x0+bw*k).toFixed(1)+'" y="'+(H-B-h).toFixed(1)+'" width="'+(bw-2)+'" height="'+h.toFixed(1)+'" rx="3" fill="'+s.c+'"><title>'+l+' '+(s.n||'')+': '+s.d[i]+'</title></rect>'})});
  el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'">'+o+'</svg>'}
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],D=null,CAPS=null,tab='overview';
function show(t){tab=t;try{history.replaceState(null,'','#'+t)}catch(e){}
  document.querySelectorAll('.sec').forEach(function(s){s.classList.toggle('on',s.id==='s-'+t)});
  document.querySelectorAll('.tab').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-t')===t)});
  if(t==='system')loadSystem()}
function provName(id){var p=CAPS&&(CAPS.providers||[]).filter(function(x){return x.id===id})[0];return p?p.name:id}
function visitorRows(){var q=($('vq').value||'').toLowerCase();return (D?D.visitors:[]).filter(function(r){return !q||[r.city,r.country,r.dev,r.browser,r.os,r.lang,r.ref,r.ipm].join(' ').toLowerCase().indexOf(q)>-1})}
function drawVisitors(){var rows=visitorRows();$('vcount').textContent=rows.length+' shown';
  $('tv').innerHTML=table(['Last seen','Visitor','IP (masked)','Location','Device','Browser / OS','Screen','Lang','Visits','Came from'],rows.map(function(r){return [ago(r.last_ts),'<code>'+esc((r.vid||'').slice(0,8))+'</code>',esc(r.ipm||'-'),esc((r.city?r.city+', ':'')+(r.country||'-')),esc(r.dev||'-'),esc((r.browser||'-')+' / '+(r.os||'-')),esc(r.screen||'-'),esc(r.lang||'-'),num(r.hits),esc(r.ref||'direct')]}),[8],'No visitors match.')}
function drawModels(){
  var st={};(D?D.mstat:[]).forEach(function(r){st[r.prov]=r});var bl={};(D?D.mblocked:[]).forEach(function(r){bl[r.k.slice(8)]=r.v});
  var ks={};(D?D.keys:[]).forEach(function(r){(ks[r.prov]=ks[r.prov]||[]).push(r)});
  var ids=((CAPS&&CAPS.providers)||[]).map(function(p){return p.id});(D?D.mstat:[]).forEach(function(r){if(ids.indexOf(r.prov)<0)ids.push(r.prov)});
  ids.sort(function(a,b){var o=['gemini','cloudflare'];var x=o.indexOf(a),y=o.indexOf(b);return (x<0?9:x)-(y<0?9:y)});
  $('pcards').innerHTML=ids.length?ids.map(function(id){var r=st[id],p=CAPS&&(CAPS.providers||[]).filter(function(x){return x.id===id})[0],kl=ks[id]||[],kn=p?p.keys:kl.length,kok=kl.filter(function(k){return k.ok}).length;
    var s=!r?'<span class="badge m">Not tested</span>':r.ok?'<span class="badge g">Working</span>':bl[id]?'<span class="badge r">'+(bl[id]==='402'?'No credits':'Key blocked')+'</span>':'<span class="badge y">None working</span>';
    var chips=kl.length?kl.map(function(k){return '<span class="badge '+(k.ok?'g':'r')+'" title="'+esc(k.ok?'replied':(k.status+' '+k.note))+'">...'+esc(k.kid)+' '+(k.ok?'ok':esc(k.status))+'</span>'}).join(' '):'<span class="mu" style="font-size:12px">Keys not tested yet</span>';
    return '<div class="card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><b style="font-size:16px">'+esc(provName(id))+'</b>'+s+'<button class="btn sm" style="margin-left:auto" data-p="'+esc(id)+'">Test</button></div>'
     +'<div class="grid" style="grid-template-columns:1fr 1fr;gap:10px"><div><small class="mu">KEYS WORKING</small><div style="font-size:22px;font-weight:700"><span class="'+(kl.length?(kok?'ok':'no'):'mu')+'">'+(kl.length?kok:'-')+'</span> / '+num(kn)+'</div></div>'
     +'<div><small class="mu">MODELS WORKING</small><div style="font-size:22px;font-weight:700"><span class="'+(r&&r.ok?'ok':'no')+'">'+(r?num(r.ok):'-')+'</span> / '+(r?num(r.n):'-')+'</div></div></div>'
     +'<div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap">'+chips+'</div><div class="mu" style="font-size:11px;margin-top:10px">Last tested '+(r?ago(r.ts):'never')+'</div></div>'}).join(''):'<div class="empty">Loading...</div>';
  var tk=0,tkok=0,tm=0,tmok=0,pw=0,rowsS=ids.map(function(id){var r=st[id],p=CAPS&&(CAPS.providers||[]).filter(function(x){return x.id===id})[0],kl=ks[id]||[],kn=p?p.keys:kl.length,kok=kl.filter(function(k){return k.ok}).length;
    tk+=kn;tkok+=kok;if(r){tm+=r.n;tmok+=r.ok;if(r.ok)pw++}
    var s=!r?'<span class="badge m">Not tested</span>':r.ok?'<span class="badge g">Working</span>':bl[id]?'<span class="badge r">'+(bl[id]==='402'?'No credits':'Key blocked')+'</span>':'<span class="badge y">None working</span>';
    return ['<b>'+esc(provName(id))+'</b>',kl.length?'<b class="'+(kok?'ok':'no')+'">'+kok+'</b> / '+num(kn):'- / '+num(kn),r?'<b class="'+(r.ok?'ok':'no')+'">'+num(r.ok)+'</b> / '+num(r.n):'-',r?pct(r.ok,r.n):'-',s,r?ago(r.ts):'never']});
  rowsS.push(['<b>Total</b>','<b>'+tkok+'</b> / '+num(tk),'<b>'+num(tmok)+'</b> / '+num(tm),tm?pct(tmok,tm):'-','',''] );
  $('tsum').innerHTML=table(['Provider','Keys working','Models working','Success','Status','Last tested'],rowsS,[1,2,3],'Loading...');
  $('k-models').innerHTML=kpi('Keys working',tkok+' / '+num(tk),'across all providers')+kpi('Models working',num(tmok),'of '+num(tm)+' tested')+kpi('Providers working',pw+' / '+ids.length,'at least one model replies');
  document.querySelectorAll('#pcards button[data-p]').forEach(function(b){b.onclick=function(){refreshAll(b.getAttribute('data-p'))}});
  var q=($('mq').value||'').toLowerCase(),f=$('mf').value;
  $('tml').innerHTML=table(['Provider','Model','Result','Detail'],(D?D.mlist:[]).filter(function(r){return (!q||(r.prov+' '+r.model).toLowerCase().indexOf(q)>-1)&&(f===''||String(r.ok)===f)}).map(function(r){return [esc(provName(r.prov)),esc(r.model),r.ok?'<span class="badge g">works</span>':'<span class="badge r">'+esc(r.status)+'</span>',esc(r.ok?'':r.note)]}),[],'Nothing tested yet. Press Refresh all models.')}
function drawCron(){
  var m={};(D?D.cron:[]).forEach(function(r){m[r.k]=r.v});var st=null;try{st=m['cron:state']?JSON.parse(m['cron:state']):null}catch(e){}
  var last=+m['cron:last']||0,el=$('cronst');if(!el)return;
  el.innerHTML=st&&!st.done?'<span class="badge y">Running ('+num(st.queue.length)+' steps left)</span>':last?'<span class="badge g">Last full run '+ago(last)+'</span>':'<span class="badge m">Not run yet</span>'}
function drawVision(){
  var v=D?D.vision:[],ents={},okM=0;
  v.forEach(function(r){var k=r.prov+'|'+r.kid;ents[k]=ents[k]||0;if(r.ok){ents[k]=1;okM++}});
  var ne=Object.keys(ents).length,ke=Object.keys(ents).filter(function(k){return ents[k]}).length,last=v.reduce(function(m,r){return Math.max(m,r.ts)},0),provs={};
  v.forEach(function(r){if(r.ok)provs[r.prov]=1});
  $('k-vision').innerHTML=v.length?kpi('Vision models working',num(okM)+' / '+num(v.length),'of tests that read the test photo')+kpi('Keys that can see',ke+' / '+ne,'at least one model reads photos')+kpi('Providers',Object.keys(provs).length,'with working photo reading')+kpi('Last tested',ago(last),ke?'Photos are read by AI':'Photos are read by phone OCR'):kpi('Vision','Not tested','Press Test vision models');
  $('tvis').innerHTML=table(['Provider','Key','Model','Result','Detail','Tested'],v.map(function(r){return [esc(provName(r.prov)),'<code>...'+esc(r.kid)+'</code>',esc(r.model),r.ok?'<span class="badge g">reads photo</span>':'<span class="badge r">'+esc(r.status)+'</span>',esc(r.ok?'':r.note),ago(r.ts)]}),[],'Not tested yet.')}
function runVision(){
  var msg=$('rvm'),from=0;
  function step(){return fetch('/api/ai?visiontest=1&from='+from,{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.json()}).then(function(j){
    if(j.error)throw new Error(j.error);from+=6;msg.textContent='Vision '+Math.min(from,j.total)+'/'+j.total;if(from<j.total)return step()})}
  return step().then(function(){msg.textContent='Vision test done'})}
function render(){
  var d=D;if(!d)return;var aiM=d.aiMonth,aiT=d.aiToday;
  $('upd').textContent='Updated '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  $('k-traffic').innerHTML=kpi('Active now',num(d.now),'last 5 minutes','live')+kpi('Visitors today',num(d.today.v),num(d.today.views)+' page views')+kpi('Visitors this month',num(d.month.v),num(d.month.ips)+' unique IPs')+kpi('New this month',num(d.newMonth),'first-time visitors')+kpi('Returning',num(d.returning),'came back this month')+kpi('Unique devices',num(d.devMonth),num(d.devTotal)+' all-time')+kpi('All-time visitors',num(d.total),num(d.last24)+' in last 24h');
  $('k-ai').innerHTML=kpi('AI users today',num(aiT.ips),num(aiT.req)+' requests')+kpi('AI users this month',num(aiM.ips),num(aiM.req)+' requests')+kpi('Success rate',pct(aiM.ok,aiM.req),num(aiM.req-aiM.ok)+' failed this month');
  $('k-ai2').innerHTML=kpi('Requests today',num(aiT.req),num(aiT.ips)+' users')+kpi('Requests this month',num(aiM.req),num(aiM.ips)+' users')+kpi('Success rate',pct(aiM.ok,aiM.req),num(aiM.ok)+' answered')+kpi('Failed',num(aiM.req-aiM.ok),'all models busy / error');
  var m=$('m').value,dm={},da={};d.dailyV.forEach(function(r){dm[r.day]=r});d.dailyA.forEach(function(r){da[r.day]=r});
  var y=+m.slice(0,4),mo=+m.slice(5,7),dim=new Date(y,mo,0).getDate(),lab=[],v=[],au=[],ar=[];
  for(var i=1;i<=dim;i++){var key=m+'-'+(i<10?'0':'')+i;if(key>d.todayDay)break;lab.push(i);v.push(dm[key]?dm[key].v:0);au.push(da[key]?da[key].ips:0);ar.push(da[key]?da[key].req:0)}
  $('t1').textContent='Daily - '+MON[mo-1]+' '+y;$('aimonth').textContent=MON[mo-1]+' '+y;
  line($('c1'),lab,[{c:'var(--a)',d:v},{c:'var(--b)',d:au},{c:'var(--c)',d:ar}]);
  var mv={},ma={};d.monthlyV.forEach(function(r){mv[r.m]=r});d.monthlyA.forEach(function(r){ma[r.m]=r});
  var ml=[],a1=[],a2=[];d.months.forEach(function(k){ml.push(MON[+k.slice(5,7)-1]);a1.push(mv[k]?mv[k].v:0);a2.push(ma[k]?ma[k].ips:0)});
  bars($('c2'),ml,[{c:'var(--a)',d:a1,n:'visitors'},{c:'var(--b)',d:a2,n:'AI users'}]);
  $('tc').innerHTML=shares(d.countries.map(function(r){return [r.c,r.n]}));$('td').innerHTML=shares(d.devices.map(function(r){return [r.d,r.n]}));
  $('tb').innerHTML=shares(d.browsers.map(function(r){return [r.b,r.n]}));$('to').innerHTML=shares(d.oses.map(function(r){return [r.o,r.n]}));$('tf').innerHTML=shares(d.refs.map(function(r){return [r.r,r.n]}));
  $('tp').innerHTML=table(['Page','Views'],d.paths.map(function(r){return [esc(r.p||'/'),num(r.n)]}),[1]);
  $('tpv').innerHTML=table(['Provider','Requests','Success','Users',''],d.provs.map(function(r){return [esc(r.prov==='cache'?'Saved answers (cache)':provName(r.prov)||'-'),num(r.n),pct(r.ok,r.n),num(r.ips),'<div class="bar2 g"><i style="width:'+(r.n?Math.round(100*r.ok/r.n):0)+'%"></i></div>']}),[1,2,3]);
  var hh=[];for(var h=0;h<24;h++)hh.push(0);d.hours.forEach(function(r){hh[r.h]=r.n});bars($('c3'),hh.map(function(_,i){return i}),[{c:'var(--c)',d:hh,n:'requests'}]);
  $('tfail').innerHTML=table(['Reason','Count'],d.fails.map(function(r){return [esc(r.status||'unknown'),num(r.n)]}),[1],'No failures this month.');
  $('tm').innerHTML=table(['Provider','Model','Requests','Success'],d.models.map(function(r){return [esc(r.prov==='cache'?'cache':provName(r.prov)||'-'),esc(r.model||'-'),num(r.n),'<span class="'+(r.ok===r.n?'ok':r.ok?'':'no')+'">'+pct(r.ok,r.n)+'</span>']}),[2,3]);
  $('tu').innerHTML=table(['User (masked IP)','Country','Requests','Last seen'],d.aiUsers.map(function(r){return ['<code>'+esc(r.u)+'</code>',esc(r.c||'-'),num(r.n),ago(r.last)]}),[2]);
  $('tr').innerHTML=table(['When','User','Country','Device','Provider','Model','Result'],d.recent.map(function(r){return [ago(r.ts),'<code>'+esc(r.u)+'</code>',esc(r.country||'-'),esc(r.dev||'-'),esc(r.prov==='cache'?'cache':provName(r.prov)||'-'),esc(r.model||'-'),r.ok?'<span class="badge g">ok'+(r.status&&r.status!=='ok'?' / '+esc(r.status):'')+'</span>':'<span class="badge r">failed</span>']}),[]);
  drawVisitors();drawModels();drawVision();drawCron()}
function load(){
  var m=$('m').value;
  fetch('/admin?api=stats&m='+encodeURIComponent(m),{credentials:'same-origin',cache:'no-store'}).then(function(r){if(r.status===401){location.reload();return null}return r.json()}).then(function(d){
    if(!d)return;
    if(d.setup){$('setup').innerHTML='<div class="warn"><b>Database not connected yet.</b><br>Add these in Vercel &rarr; Settings &rarr; Environment Variables, then redeploy: '+d.setup.map(function(x){return '<code>'+x+'</code>'}).join(' ')+'</div>';return}
    if(d.error){$('setup').innerHTML='<div class="warn"><b>Could not read data.</b> '+esc(d.error)+'</div>';return}
    $('setup').innerHTML='';D=d;render()}).catch(function(e){$('setup').innerHTML='<div class="warn">Could not load: '+esc(e.message)+'</div>'})}
function loadCaps(){return fetch('/api/ai?caps=1',{cache:'no-store'}).then(function(r){return r.json()}).then(function(c){CAPS=c;if(D)drawModels();return c}).catch(function(){return null})}
function loadSystem(){
  var row=function(a,b){return '<div class="stat"><span>'+a+'</span><span>'+b+'</span></div>'};
  $('sys').innerHTML=row('Database (D1)','<span class="mu">checking...</span>');
  fetch('/admin?health=1',{cache:'no-store'}).then(function(r){return r.json()}).then(function(h){
    $('sys').innerHTML=row('Database (D1)',h.d1==='ok'?'<span class="badge g">Connected</span>':'<span class="badge r">'+esc(h.d1==='setup'?'Not set up':h.why||'Error')+'</span>')+row('Admin login','<span class="badge g">Password + 1-year cookie</span>')+row('Visitor tracking','<span class="badge g">On</span>')+row('Model list','<span class="badge '+(D&&D.mstat.length?'g':'y')+'">'+(D&&D.mstat.length?'Saved in database':'Not tested yet')+'</span>')+row('Server time (IST)',new Date(Date.now()+19800000).toISOString().slice(0,16).replace('T',' '))});
  loadCaps().then(function(c){if(!c){$('sysp').innerHTML='<div class="empty">Could not load providers.</div>';return}
    $('sysp').innerHTML=(c.providers||[]).map(function(p){var s=(c.models||{})[p.id]||{};return row(esc(p.name)+' <span class="mu">&middot; '+p.keys+' key'+(p.keys===1?'':'s')+'</span>',s.down?'<span class="badge r">Down</span>':s.busy?'<span class="badge y">Busy</span>':'<span class="badge g">Ready</span>')}).join('')||'<div class="empty">No providers.</div>'})}
var busy=false;
function refreshAll(only){
  if(busy)return;busy=true;var btn=$('rf'),msg=$('rfm'),pg=$('prog'),pb=$('progbar');btn.disabled=true;msg.textContent='Starting...';pg.style.display='block';pb.style.width='2%';
  (CAPS?Promise.resolve(CAPS):loadCaps()).then(function(c){
    var ps=(c.providers||[]).map(function(p){return p.id}).filter(function(id){return !only||id===only}),i=0;
    function nextProv(){
      if(i>=ps.length)return Promise.resolve();
      var id=ps[i++],base=(i-1)/ps.length;
      msg.textContent=provName(id)+' keys...';return fetch('/api/ai?keytest='+id,{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.json()}).catch(function(){return null}).then(function(){return fetch('/api/ai?refresh='+id+'&from=0',{credentials:'same-origin',cache:'no-store'})}).then(function(r){return r.json()}).then(function(j){
        if(j.error)throw new Error(provName(id)+': '+j.error);
        var total=j.total||0,starts=[],k=0,done=Math.min(10,total);
        for(var f=10;f<total;f+=10)starts.push(f);
        function say(){msg.textContent=provName(id)+' '+done+'/'+total+'  ('+i+'/'+ps.length+')';pb.style.width=Math.round(100*(base+(total?done/total:1)/ps.length))+'%'}
        say();
        function worker(){
          if(k>=starts.length)return Promise.resolve();
          var from=starts[k++];
          return fetch('/api/ai?refresh='+id+'&from='+from,{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.json()}).catch(function(){return null}).then(function(){done=Math.min(total,done+10);say();return worker()});
        }
        return Promise.all([worker(),worker()]);
      }).then(nextProv);
    }
    return nextProv();
  }).then(function(){msg.textContent='Testing photo reading...';return runVision().catch(function(){})}).then(function(){msg.textContent='Done. Students now see only the working models.';pb.style.width='100%';toast('Models refreshed');load()}).catch(function(e){msg.textContent='Error: '+e.message}).then(function(){busy=false;btn.disabled=false;setTimeout(function(){pg.style.display='none'},2500)});
}
function csv(){var rows=visitorRows(),h=['last_seen','visitor','ip_masked','city','country','device','browser','os','screen','lang','timezone','came_from','visits','first_seen'];
  var q=function(v){return '"'+String(v==null?'':v).replace(/"/g,'""')+'"'};
  var t=[h.join(',')].concat(rows.map(function(r){return [new Date(r.last_ts).toISOString(),r.vid,r.ipm,r.city,r.country,r.dev,r.browser,r.os,r.screen,r.lang,r.tz,r.ref,r.hits,new Date(r.first_ts).toISOString()].map(q).join(',')})).join('\\n');
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv'}));a.download='rtuhub-visitors.csv';a.click()}
var nowM=new Date(Date.now()+19800000).toISOString().slice(0,7);$('m').value=nowM;$('m').max=nowM;$('m').onchange=load;$('r').onclick=function(){load();loadCaps()};
$('rf').onclick=function(){refreshAll()};$('cronnow').onclick=function(){fetch('/api/cron?force=1',{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.json()}).then(function(j){toast(j.error?'Could not start: '+j.error:'Automatic refresh started. It keeps running in the background (about 10-20 minutes).');setTimeout(load,4000)}).catch(function(){toast('Could not start')})};$('rv').onclick=function(){var b=$('rv');b.disabled=true;runVision().then(load).catch(function(e){$('rvm').textContent='Error: '+e.message}).then(function(){b.disabled=false})};$('vq').oninput=drawVisitors;$('vcsv').onclick=csv;$('mq').oninput=drawModels;$('mf').onchange=drawModels;
$('o').onclick=function(){fetch('/admin?logout=1',{method:'POST',credentials:'same-origin'}).then(function(){location.reload()})};
$('th').onclick=function(){var cur=document.documentElement.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'),nx=cur==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',nx);try{localStorage.setItem('rh_admin_theme',nx)}catch(e){}};
try{var tt=localStorage.getItem('rh_admin_theme');if(tt)document.documentElement.setAttribute('data-theme',tt)}catch(e){}
document.querySelectorAll('.tab').forEach(function(b){b.onclick=function(){show(b.getAttribute('data-t'))}});
show((location.hash||'').slice(1).replace(/[^a-z]/g,'')&&document.getElementById('s-'+(location.hash||'').slice(1))?(location.hash||'').slice(1):'overview');
loadCaps();load();setInterval(function(){if(document.visibilityState==='visible'&&!busy)load()},30000);
</script></body></html>
`;

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
    Q("SELECT e.ts ts, COALESCE(v.ipm, substr(e.ip,1,8)) u, e.country country, v.dev dev, v.browser browser, e.prov prov, e.model model, e.ok ok, e.status status FROM events e LEFT JOIN visitors v ON v.vid = e.vid WHERE e.kind='ai' ORDER BY e.ts DESC LIMIT 25"),
    Q('SELECT COUNT(*) c FROM visitors WHERE first_ts >= ? AND first_ts < ?', [t0, t1]),
    Q('SELECT COUNT(DISTINCT sig) c FROM visitors WHERE last_ts >= ? AND last_ts < ?', [t0, t1]),
    Q('SELECT COUNT(DISTINCT sig) c FROM visitors'),
    Q('SELECT vid, ipm, city, country, dev, os, browser, screen, lang, tz, ref, hits, first_ts, last_ts FROM visitors ORDER BY last_ts DESC LIMIT 100'),
    Q('SELECT browser b, COUNT(*) n FROM visitors WHERE last_ts >= ? AND last_ts < ? GROUP BY browser ORDER BY n DESC LIMIT 8', [t0, t1]),
    Q('SELECT os o, COUNT(*) n FROM visitors WHERE last_ts >= ? AND last_ts < ? GROUP BY os ORDER BY n DESC LIMIT 8', [t0, t1]),
    Q("SELECT ref r, COUNT(*) n FROM visitors WHERE first_ts >= ? AND first_ts < ? AND ref <> '' GROUP BY ref ORDER BY n DESC LIMIT 8", [t0, t1]),
    Q('SELECT prov, COALESCE(SUM(ok),0) ok, COUNT(*) n, MAX(ts) ts FROM model_status GROUP BY prov ORDER BY prov'),
    Q("SELECT k, v FROM model_meta WHERE k LIKE 'blocked:%'"),
    Q('SELECT prov, model, ok, status, note FROM model_status ORDER BY prov, ok DESC, model'),
    Q("SELECT CAST(strftime('%H', ts/1000 + 19800, 'unixepoch') AS INTEGER) h, COUNT(*) n FROM events WHERE kind='ai' AND day LIKE ? GROUP BY h", [like]),
    Q('SELECT COUNT(*) c FROM visitors WHERE first_ts < ? AND last_ts >= ? AND last_ts < ?', [t0, t0, t1]),
    Q("SELECT prov, COUNT(*) n, COALESCE(SUM(ok),0) ok, COUNT(DISTINCT ip) ips FROM events WHERE kind='ai' AND day LIKE ? GROUP BY prov ORDER BY n DESC", [like]),
    Q("SELECT status, COUNT(*) n FROM events WHERE kind='ai' AND ok = 0 AND day LIKE ? GROUP BY status ORDER BY n DESC LIMIT 6", [like]),
    Q('SELECT prov, kid, ok, status, note, ts FROM key_status ORDER BY prov, kid'),
    Q('SELECT prov, kid, model, ok, status, note, ts FROM vision_status ORDER BY prov, ok DESC, kid, model'),
    Q("SELECT k, v FROM model_meta WHERE k LIKE 'cron:%'")
  ]);
  const rows = i => (R[i] && R[i].results) || [], one = i => rows(i)[0] || {};
  return { todayDay: today, months, now: one(0).c || 0, last24: one(1).c || 0, total: one(2).c || 0, today: one(3), month: one(4), aiToday: one(5), aiMonth: one(6),
    dailyV: rows(7), dailyA: rows(8), monthlyV: rows(9), monthlyA: rows(10), models: rows(11), countries: rows(12), devices: rows(13), paths: rows(14), aiUsers: rows(15), recent: rows(16), newMonth: one(17).c || 0, devMonth: one(18).c || 0, devTotal: one(19).c || 0, visitors: rows(20), browsers: rows(21), oses: rows(22), refs: rows(23), mstat: rows(24), mblocked: rows(25), mlist: rows(26), hours: rows(27), returning: one(28).c || 0, provs: rows(29), fails: rows(30), keys: rows(31), vision: rows(32), cron: rows(33) };
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
