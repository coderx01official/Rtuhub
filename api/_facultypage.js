// =====================================================================
//  FACULTY PORTAL — dashboard page (login ke baad). api/faculty.js isse serve karta hai.
//  Document library: stats, filter (All / Notice / Time table), search, sort, mahine ke hisaab se groups.
//  Upload ek dialog mein 3 step mein. PDF portal ke andar hi khulti hai (pdf.js, site ka hi copy: /pdfjs.json),
//  isliye phone par bhi "View" chalta hai (Android Chrome naye tab mein PDF nahi dikhata).
// =====================================================================
const sv = (d, w = 18, sw = 2) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICON = {
  up: sv('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>'),
  file: sv('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>', 20, 1.8),
  eye: sv('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', 16),
  dl: sv('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>', 16),
  link: sv('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>', 16),
  edit: sv('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>', 16),
  del: sv('<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>', 16),
  x: sv('<path d="M18 6L6 18M6 6l12 12"/>', 18),
  search: sv('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>', 16),
  out: sv('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>', 16),
  ext: sv('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>', 15),
  bell: sv('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>', 20),
  clock: sv('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', 20),
  layers: sv('<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>', 20),
  cal: sv('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', 20),
  plus: sv('<path d="M12 5v14M5 12h14"/>', 16),
  minus: sv('<path d="M5 12h14"/>', 16),
  user: sv('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', 16),
  check: sv('<path d="M20 6L9 17l-5-5"/>', 22, 2.5)
};

export const dashPage = CSS => String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Faculty Portal · RTU Hub</title>
<link rel="icon" href="/favicon.svg"><style>${CSS}
body{min-height:100vh}
.top{position:sticky;top:0;z-index:30;background:rgba(255,255,255,.94);backdrop-filter:saturate(1.6) blur(8px);border-bottom:1px solid var(--line)}
.bar{max-width:1200px;margin:0 auto;height:64px;padding:0 24px;display:flex;align-items:center;gap:10px}
.brand{display:flex;align-items:center;gap:12px;margin-right:auto;min-width:0}.brand b{display:block;font-size:15.5px;letter-spacing:-.01em}.brand small{display:block;color:var(--mute);font-size:12px;margin-top:-1px}
.me{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 6px 0 4px;border:1px solid var(--line);border-radius:99px;background:#fff;font-size:13px;font-weight:600;color:var(--ink2);max-width:240px}.me .av{width:26px;height:26px;border-radius:50%;background:var(--asoft);color:var(--a);display:grid;place-items:center;font-size:11.5px;font-weight:700;flex:none}.me span.n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.me:hover{border-color:#cbd5e1;background:#f8fafc}.me[hidden]{display:none}.ib[hidden]{display:none}
.who{display:flex;align-items:center;gap:6px;margin-top:6px;color:var(--mute);font-size:12.5px}.who b{color:var(--ink2);font-weight:600}
.nprev{display:flex;align-items:center;gap:10px;margin-top:14px;padding:12px;border:1px solid var(--line);border-radius:10px;background:#fafbfc;font-size:13px;color:var(--mute)}.nprev b{color:var(--ink);font-weight:600}.nprev .fi{width:34px;height:34px}
.vline{width:1px;height:28px;background:var(--line);margin:0 4px}
main{max-width:1200px;margin:0 auto;padding:28px 24px 64px}
.ph{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:22px}.ph div{margin-right:auto}.ph h1{margin:0;font-size:24px;letter-spacing:-.02em}.ph p{margin:4px 0 0;color:var(--mute);font-size:14.5px}
.ph .btn.p{height:42px;padding:0 18px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}
.st{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;display:flex;align-items:center;gap:14px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.st .si{width:42px;height:42px;border-radius:10px;display:grid;place-items:center;flex:none}
.st .si.a{background:#eef2ff;color:#4338ca}.st .si.b{background:var(--asoft);color:var(--a)}.st .si.c{background:#f5f3ff;color:#6d28d9}.st .si.d{background:var(--oksoft);color:var(--ok)}
.st small{display:block;color:var(--mute);font-size:12.5px;font-weight:500}.st b{display:block;font-size:22px;letter-spacing:-.02em;line-height:1.25}.st b.sm{font-size:15px;line-height:1.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st div{min-width:0}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.tool{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:14px 16px;border-bottom:1px solid var(--line)}
.tabs{display:flex;gap:4px;padding:4px;background:#f1f5f9;border-radius:10px}
.tabs button{height:34px;padding:0 13px;border:0;border-radius:7px;background:transparent;font-weight:600;font-size:13.5px;color:var(--mute);display:inline-flex;align-items:center;gap:7px}
.tabs button[aria-selected=true]{background:#fff;color:var(--ink);box-shadow:0 1px 2px rgba(15,23,42,.08)}
.tabs em{font-style:normal;min-width:22px;height:20px;padding:0 6px;border-radius:99px;background:#e2e8f0;color:var(--ink2);font-size:11.5px;display:inline-grid;place-items:center}
.tabs button[aria-selected=true] em{background:var(--asoft);color:var(--a)}
.srch{position:relative;flex:1;min-width:180px;max-width:300px;margin-left:auto}.srch .inp{height:38px;padding-left:36px;font-size:14px}.srch svg{position:absolute;left:12px;top:11px;color:var(--mute)}
select.inp{height:38px;width:auto;font-size:14px;padding:0 32px 0 12px;appearance:none;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 11px center}
.th,.tr{display:grid;grid-template-columns:minmax(0,1fr) 120px 170px 80px 232px;align-items:center;gap:14px;padding:0 18px}
.th{height:40px;background:#fafbfc;border-bottom:1px solid var(--line);font-size:11.5px;font-weight:600;color:var(--mute);text-transform:uppercase;letter-spacing:.05em}
.th span:last-child{text-align:right}
.grp{padding:9px 18px;background:#fafbfc;border-bottom:1px solid var(--line2);font-size:12px;font-weight:700;color:var(--ink2);letter-spacing:.02em}
.tr{min-height:64px;border-bottom:1px solid var(--line2);transition:background .12s}.tr:last-child{border-bottom:0}.tr:hover{background:#fafbfd}
.nm{display:flex;align-items:center;gap:12px;min-width:0}
.fi{width:38px;height:38px;border-radius:9px;background:var(--badsoft);color:var(--bad);display:grid;place-items:center;flex:none}
.nm button{border:0;background:none;padding:0;text-align:left;font-weight:600;font-size:14.5px;color:var(--ink);overflow-wrap:anywhere;line-height:1.35}.nm button:hover{color:var(--a);text-decoration:underline;text-underline-offset:2px}
.nm button:focus-visible{outline:2px solid var(--a);outline-offset:2px;border-radius:4px}
.nm small{display:none;color:var(--mute);font-size:12.5px;margin-top:2px}
.tag{display:inline-flex;align-items:center;height:24px;padding:0 9px;border-radius:99px;font-size:12px;font-weight:600;white-space:nowrap}.tag.notice{background:var(--asoft);color:var(--a)}.tag.timetable{background:#f5f3ff;color:#6d28d9}
.dt{font-size:13.5px;color:var(--ink2)}.dt small{display:block;color:var(--mute);font-size:12px}
.sz{font-size:13.5px;color:var(--mute)}
.acts{display:flex;justify-content:flex-end;gap:4px}
.ib{width:34px;height:34px;border:1px solid transparent;border-radius:8px;background:none;color:var(--mute);display:inline-grid;place-items:center;text-decoration:none;position:relative}
.ib:hover{background:#f1f5f9;color:var(--ink)}.ib.dg:hover{background:var(--badsoft);color:var(--bad)}
.ib[data-tip]:hover::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;font-size:12px;font-weight:500;padding:4px 8px;border-radius:6px;white-space:nowrap;pointer-events:none;z-index:5}
.btn.v{height:34px;padding:0 12px;font-size:13px;margin-right:4px}
.empty{padding:56px 20px;text-align:center;color:var(--mute)}.empty .ei{width:52px;height:52px;margin:0 auto 12px;border-radius:12px;background:#f1f5f9;display:grid;place-items:center;color:var(--mute)}
.empty b{display:block;color:var(--ink);font-size:16px;margin-bottom:4px}.empty p{margin:0 auto 16px;max-width:42ch;font-size:14px}
.sk{height:13px;border-radius:6px;background:linear-gradient(90deg,#f1f5f9,#e2e8f0,#f1f5f9);background-size:200% 100%;animation:sh 1.2s infinite}@keyframes sh{to{background-position:-200% 0}}
.foot{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:space-between;padding:12px 18px;border-top:1px solid var(--line);color:var(--mute);font-size:13px}
.share{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:18px;padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:#fff;font-size:13.5px;color:var(--ink2)}.share code{background:#f1f5f9;padding:3px 8px;border-radius:6px;font-size:13px;color:var(--ink)}.share span{margin-right:auto}
/* dialogs */
.mod{position:fixed;inset:0;z-index:60;background:rgba(15,23,42,.5);display:none;align-items:center;justify-content:center;padding:16px}.mod.on{display:flex}
.box{width:100%;max-width:520px;max-height:calc(100vh - 32px);overflow:auto;background:#fff;border-radius:16px;box-shadow:0 24px 64px rgba(15,23,42,.28)}
.bh{display:flex;align-items:flex-start;gap:12px;padding:20px 22px 0}.bh div{flex:1}.bh h3{margin:0;font-size:18px;letter-spacing:-.01em}.bh p{margin:3px 0 0;color:var(--mute);font-size:13.5px}
.bb{padding:18px 22px}.bf{display:flex;justify-content:flex-end;gap:8px;padding:14px 22px 20px}
.step{margin-bottom:18px}.step:last-child{margin-bottom:0}.sl{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--ink2);margin-bottom:8px}.sl i{font-style:normal;width:20px;height:20px;border-radius:50%;background:var(--a);color:#fff;font-size:11px;display:grid;place-items:center}
.sl .cnt{margin-left:auto;color:var(--mute);font-weight:500;font-size:12px}
.cats{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.cat{display:flex;align-items:flex-start;gap:10px;padding:12px;border:1.5px solid var(--line);border-radius:11px;background:#fff;text-align:left;transition:border-color .15s,background .15s}
.cat:hover{border-color:#cbd5e1}.cat[aria-pressed=true]{border-color:var(--a);background:var(--asoft)}
.cat .ci{width:34px;height:34px;border-radius:8px;display:grid;place-items:center;flex:none;background:#f1f5f9;color:var(--mute)}.cat[aria-pressed=true] .ci{background:var(--a);color:#fff}
.cat b{display:block;font-size:14px}.cat small{display:block;color:var(--mute);font-size:12px;line-height:1.35;margin-top:1px}
.drop{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:4px;min-height:130px;padding:18px;border:1.5px dashed #cbd5e1;border-radius:12px;background:#fafbfc;cursor:pointer;transition:border-color .15s,background .15s}
.drop:hover,.drop.over{border-color:var(--a);background:var(--asoft)}.drop input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%}
.drop .di{width:40px;height:40px;border-radius:10px;background:#fff;border:1px solid var(--line);display:grid;place-items:center;color:var(--a);margin-bottom:4px}
.drop b{font-size:14px}.drop b u{color:var(--a);text-decoration:none}.drop small{color:var(--mute);font-size:12.5px}
.sel{display:none;align-items:center;gap:12px;padding:11px 12px;border:1px solid var(--line);border-radius:12px}.sel.on{display:flex}
.sel .t{flex:1;min-width:0}.sel .t b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sel .t small{color:var(--mute);font-size:12.5px}
.prog{display:none;margin-top:16px}.prog.on{display:block}.pb{height:8px;border-radius:99px;background:#eef2f7;overflow:hidden}.pb i{display:block;height:100%;width:0;background:var(--a);border-radius:99px;transition:width .2s}
.pt{display:flex;justify-content:space-between;font-size:12.5px;color:var(--mute);margin-top:6px}
.msg{display:none;margin-top:14px;padding:10px 12px;border-radius:9px;font-size:13.5px;background:var(--badsoft);color:var(--bad)}.msg.on{display:block}
.done{display:none;text-align:center;padding:26px 22px 8px}.done.on{display:block}.done .ok{width:56px;height:56px;margin:0 auto 14px;border-radius:50%;background:var(--oksoft);color:var(--ok);display:grid;place-items:center}
.done h3{margin:0 0 4px;font-size:18px}.done p{margin:0 0 4px;color:var(--mute);font-size:14px;overflow-wrap:anywhere}
.done .row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:18px}
/* viewer */
.vw{position:fixed;inset:0;z-index:80;background:#eef1f5;display:none;flex-direction:column}.vw.on{display:flex}
.vh{display:flex;align-items:center;gap:10px;height:60px;padding:0 16px;background:#fff;border-bottom:1px solid var(--line);flex:none}
.vh .vt{flex:1;min-width:0}.vh .vt b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vh .vt small{display:flex;align-items:center;gap:8px;color:var(--mute);font-size:12.5px}
.vh .tag{height:20px;font-size:11px;padding:0 8px}
.zm{display:flex;align-items:center;gap:2px;padding:3px;border:1px solid var(--line);border-radius:9px}.zm span{min-width:46px;text-align:center;font-size:12.5px;font-weight:600;color:var(--ink2)}.zm .ib{width:30px;height:30px}
.vb{flex:1;overflow:auto;padding:20px 12px 40px;-webkit-overflow-scrolling:touch}
.pages{margin:0 auto;display:flex;flex-direction:column;gap:14px}
.pg{position:relative;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.12),0 4px 14px rgba(15,23,42,.06);border-radius:4px;overflow:hidden}.pg canvas{display:block;width:100%;height:100%}
.pg .pn{position:absolute;right:8px;bottom:8px;background:rgba(15,23,42,.6);color:#fff;font-size:11px;padding:2px 7px;border-radius:5px}
.vmsg{max-width:420px;margin:12vh auto 0;text-align:center;color:var(--mute);font-size:14px}.vmsg b{display:block;color:var(--ink);font-size:16px;margin-bottom:6px}.vmsg .row{display:flex;gap:8px;justify-content:center;margin-top:16px;flex-wrap:wrap}
.vmsg .bigspin{width:28px;height:28px;border:3px solid #cbd5e1;border-right-color:var(--a);border-radius:50%;animation:sp .8s linear infinite;margin:0 auto 14px}
.vp{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);background:rgba(15,23,42,.78);color:#fff;font-size:12.5px;font-weight:600;padding:6px 12px;border-radius:99px;pointer-events:none}
.toast{position:fixed;left:50%;bottom:24px;z-index:90;transform:translate(-50%,20px);opacity:0;pointer-events:none;background:#0f172a;color:#fff;padding:11px 16px;border-radius:10px;font-size:14px;box-shadow:0 10px 30px rgba(15,23,42,.25);transition:opacity .2s,transform .2s;max-width:calc(100vw - 32px)}.toast.on{opacity:1;transform:translate(-50%,0)}
.dropall{position:fixed;inset:0;z-index:70;background:rgba(29,78,216,.08);border:3px dashed var(--a);display:none;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:var(--a);pointer-events:none}.dropall.on{display:flex}
@media (max-width:1000px){.stats{grid-template-columns:repeat(2,1fr)}.th,.tr{grid-template-columns:minmax(0,1fr) 110px 150px 200px}.th .c-sz,.tr .sz{display:none}}
@media (max-width:760px){
.bar{padding:0 14px;height:58px}main{padding:20px 14px 56px}.vline,.hide-s{display:none}.ph h1{font-size:21px}.ph .btn.p{width:100%}
.stats{gap:10px}.st{padding:12px;gap:10px}.st .si{width:36px;height:36px}.st b{font-size:19px}
.tool{padding:12px}.srch{max-width:none;min-width:0;flex-basis:100%;order:3;margin-left:0}.tool select{margin-left:auto}
.th{display:none}.tr{display:flex;flex-wrap:wrap;gap:10px;padding:14px;align-items:flex-start}.tr .nm{flex-basis:100%}.nm small{display:block}.tr .tg,.tr .dt{display:none}
.acts{width:100%;justify-content:flex-start;padding-left:50px}.btn.v{margin-right:auto}
.cats{grid-template-columns:1fr}.vh{padding:0 8px;gap:6px}.zm span{min-width:38px}.vh .hide-v{display:none}
.mod{padding:0;align-items:flex-end}.box{max-width:none;border-radius:16px 16px 0 0;max-height:94vh}
}
</style></head><body>
<header class="top"><div class="bar">
<div class="brand"><div class="logo">R</div><div><b>RTU Hub</b><small>Faculty Portal</small></div></div>
<button class="me" id="me" type="button" title="Change your name" hidden><span class="av" id="meAv"></span><span class="n" id="meN"></span>${ICON.edit}</button>
<a class="btn sm hide-s" href="/notices" target="_blank" rel="noopener">${ICON.ext} Student page</a>
<span class="vline"></span>
<button class="btn sm ghost" id="out" title="Sign out">${ICON.out}<span class="hide-s">Sign out</span></button>
</div></header>

<main>
<div class="ph"><div><h1>Documents</h1><p>Notices and time tables published for students on rtuhub.in/notices</p></div>
<button class="btn p" id="openUp">${ICON.up} Upload PDF</button></div>

<div class="stats">
<div class="st"><span class="si a">${ICON.layers}</span><div><small>Total documents</small><b id="sAll">–</b></div></div>
<div class="st"><span class="si b">${ICON.bell}</span><div><small>Notices</small><b id="sN">–</b></div></div>
<div class="st"><span class="si c">${ICON.clock}</span><div><small>Time tables</small><b id="sT">–</b></div></div>
<div class="st"><span class="si d">${ICON.cal}</span><div><small>Last upload</small><b class="sm" id="sL">–</b></div></div>
</div>

<section class="card" aria-label="Documents">
<div class="tool">
<div class="tabs" role="tablist" aria-label="Filter"><button role="tab" data-f="all" aria-selected="true">All <em id="cA">0</em></button><button role="tab" data-f="notice" aria-selected="false">Notice <em id="cN">0</em></button><button role="tab" data-f="timetable" aria-selected="false">Time table <em id="cT">0</em></button></div>
<div class="srch">${ICON.search}<input class="inp" id="q" type="search" placeholder="Search documents" aria-label="Search documents"></div>
<select class="inp" id="sort" aria-label="Sort"><option value="new">Newest first</option><option value="old">Oldest first</option><option value="name">Name A–Z</option></select>
</div>
<div class="th"><span>Name</span><span>Category</span><span>Uploaded</span><span class="c-sz">Size</span><span>Actions</span></div>
<div id="list"><div class="tr"><div class="nm"><span class="fi"></span><div style="flex:1"><div class="sk" style="width:55%"></div></div></div></div><div class="tr"><div class="nm"><span class="fi"></span><div style="flex:1"><div class="sk" style="width:40%"></div></div></div></div></div>
<div class="foot" id="foot" hidden><span id="fcount"></span><span>Tap a name to open the PDF</span></div>
</section>

<div class="share"><span>Students find everything at <code>rtuhub.in/notices</code></span><a class="btn sm" href="/notices" target="_blank" rel="noopener">${ICON.ext} Open</a><button class="btn sm" id="copyMain">${ICON.link} Copy link</button></div>
</main>

<!-- name -->
<div class="mod" id="mName" role="dialog" aria-modal="true" aria-labelledby="mnh"><form class="box" id="fName" style="max-width:460px" novalidate>
<div class="bh"><div><h3 id="mnh">Set your name</h3><p id="mnp">Your name will appear with every document you publish, so students know who issued it.</p></div><button type="button" class="ib" data-close id="nClose" aria-label="Close">${ICON.x}</button></div>
<div class="bb"><label class="l" for="nIn">Full name</label><input class="inp" id="nIn" maxlength="60" autocomplete="name" placeholder="e.g. Dr. Anil Sharma">
<div class="nprev"><span class="fi">${ICON.file}</span><span>Students will see: <b>Uploaded by <span id="nPrev">your name</span></b></span></div>
<div class="msg" id="nMsg" role="alert"></div></div>
<div class="bf"><button type="submit" class="btn p" id="nSave">Save and continue</button></div></form></div>

<!-- upload -->
<div class="mod" id="mUp" role="dialog" aria-modal="true" aria-labelledby="uph"><div class="box">
<div id="upForm"><div class="bh"><div><h3 id="uph">Upload PDF</h3><p>It will be visible to students right after publishing.</p><div class="who">${ICON.user}<span>Publishing as <b id="upWho"></b></span></div></div><button class="ib" data-close aria-label="Close">${ICON.x}</button></div>
<form class="bb" id="form" novalidate>
<div class="step"><div class="sl"><i>1</i>Category</div><div class="cats" id="cat">
<button type="button" class="cat" data-v="notice" aria-pressed="true"><span class="ci">${ICON.bell}</span><span><b>Notice</b><small>Circulars, announcements, exam notices</small></span></button>
<button type="button" class="cat" data-v="timetable" aria-pressed="false"><span class="ci">${ICON.clock}</span><span><b>Time table</b><small>Class, lab or exam time tables</small></span></button></div></div>
<div class="step"><label class="sl" for="title"><i>2</i>Name shown to students<span class="cnt" id="cnt">0/150</span></label><input class="inp" id="title" maxlength="150" placeholder="e.g. Mid-term exam schedule, 3rd semester" autocomplete="off"></div>
<div class="step"><div class="sl"><i>3</i>PDF file</div>
<label class="drop" id="drop"><input type="file" id="file" accept="application/pdf,.pdf"><span class="di">${ICON.up}</span><b><u>Choose a PDF</u> or drag it here</b><small>PDF only, up to 50 MB</small></label>
<div class="sel" id="sel"><span class="fi">${ICON.file}</span><span class="t"><b id="fn"></b><small id="fs"></small></span><button type="button" class="ib" id="clr" aria-label="Remove file">${ICON.x}</button></div></div>
<div class="prog" id="prog"><div class="pb"><i id="pbi"></i></div><div class="pt"><span id="pst">Uploading</span><span id="ppc">0%</span></div></div>
<div class="msg" id="msg" role="alert"></div>
</form>
<div class="bf"><button type="button" class="btn" data-close id="upCancel">Cancel</button><button type="submit" form="form" class="btn p" id="pub">${ICON.up} Publish</button></div></div>
<div class="done" id="upDone"><div class="ok">${ICON.check}</div><h3>Published</h3><p id="dTitle"></p><p id="dCat" style="font-size:13px"></p>
<div class="row"><button class="btn" id="dView">${ICON.eye} View</button><button class="btn" id="dCopy">${ICON.link} Copy student link</button></div>
<div class="row" style="margin-top:8px;padding-bottom:16px"><button class="btn ghost" id="dAgain">${ICON.plus} Upload another</button><button class="btn p" data-close>Done</button></div></div>
</div></div>

<!-- edit -->
<div class="mod" id="mEdit" role="dialog" aria-modal="true" aria-labelledby="meh"><form class="box" id="fEdit">
<div class="bh"><div><h3 id="meh">Edit details</h3><p>Change the name or category. The PDF stays the same.</p></div><button type="button" class="ib" data-close aria-label="Close">${ICON.x}</button></div>
<div class="bb"><div class="step"><div class="sl">Category</div><div class="cats" id="ecat">
<button type="button" class="cat" data-v="notice" aria-pressed="true"><span class="ci">${ICON.bell}</span><span><b>Notice</b><small>Circulars, announcements</small></span></button>
<button type="button" class="cat" data-v="timetable" aria-pressed="false"><span class="ci">${ICON.clock}</span><span><b>Time table</b><small>Class, lab or exam</small></span></button></div></div>
<div class="step"><label class="sl" for="etitle">Name shown to students</label><input class="inp" id="etitle" maxlength="150" autocomplete="off"></div></div>
<div class="bf"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn p" id="esave">Save changes</button></div></form></div>

<!-- delete -->
<div class="mod" id="mDel" role="dialog" aria-modal="true" aria-labelledby="mdh"><div class="box" style="max-width:440px">
<div class="bh"><div><h3 id="mdh">Delete this PDF?</h3><p id="dname"></p></div></div>
<div class="bf"><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn d" id="dok">${ICON.del} Delete</button></div></div></div>

<!-- viewer -->
<div class="vw" id="vw" role="dialog" aria-modal="true" aria-labelledby="vtt">
<div class="vh"><button class="ib" id="vClose" aria-label="Close">${ICON.x}</button>
<div class="vt"><b id="vtt"></b><small><span class="tag" id="vtag"></span><span id="vmeta"></span></small></div>
<div class="zm hide-v"><button class="ib" id="zOut" aria-label="Zoom out">${ICON.minus}</button><span id="zLvl">100%</span><button class="ib" id="zIn" aria-label="Zoom in">${ICON.plus}</button></div>
<a class="ib" id="vDl" data-tip="Download" aria-label="Download">${ICON.dl}</a>
<a class="ib hide-v" id="vNew" target="_blank" rel="noopener" data-tip="Open in new tab" aria-label="Open in new tab">${ICON.ext}</a></div>
<div class="vb" id="vb"></div><div class="vp" id="vp" hidden></div></div>

<div class="dropall" id="dropall">Drop the PDF to upload</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>

<script>
(function(){
var $=function(id){return document.getElementById(id)};
var TYPES={notice:'Notice',timetable:'Time table'},MAX=50*1024*1024;
var IC={eye:'${ICON.eye}',dl:'${ICON.dl}',link:'${ICON.link}',edit:'${ICON.edit}',del:'${ICON.del}',file:'${ICON.file}',up:'${ICON.up}'};
var me='',afterName=null,items=[],filter='all',sortBy='new',cat='notice',file=null,busy=false,editing=null,deleting=null,ecat='notice',lastItem=null,loaded=false;
var kb=function(n){return !n?'':n<1048576?Math.max(1,Math.round(n/1024))+' KB':(n/1048576).toFixed(n<10485760?1:0)+' MB'};
var dOpt={day:'numeric',month:'short',year:'numeric'},tOpt={hour:'numeric',minute:'2-digit'};
var fdate=function(t){return new Date(t).toLocaleDateString('en-IN',dOpt)},ftime=function(t){return new Date(t).toLocaleTimeString('en-IN',tOpt)};
var month=function(t){return new Date(t).toLocaleDateString('en-IN',{month:'long',year:'numeric'})};
function ago(t){var s=(Date.now()-t)/1000;if(s<60)return 'Just now';if(s<3600)return Math.floor(s/60)+' min ago';if(s<86400)return Math.floor(s/3600)+' hr ago';var d=Math.floor(s/86400);return d===1?'Yesterday':d<7?d+' days ago':fdate(t)}
var tt;function toast(s){var t=$('toast');t.textContent=s;t.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('on')},2800)}
function api(a,data){return fetch('/api/faculty?a='+a,{method:data?'POST':'GET',credentials:'same-origin',headers:data?{'content-type':'application/json'}:{},body:data?JSON.stringify(data):undefined})
.catch(function(){throw new Error('No internet connection. Please check and try again.')})
.then(function(r){return r.json().catch(function(){return {}}).then(function(j){if(r.status===401){location.reload();throw new Error('Your session has ended.')}if(!r.ok||j.ok===false)throw new Error(j.error||(r.status===504||r.status===502?'The server took too long to respond. Please try again.':'Something went wrong (error '+r.status+'). Please try again.'));return j})})}
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
var fileUrl=function(id){return '/api/faculty?f='+id},studentUrl=function(id){return location.origin+'/notices/'+id};
function copy(text,done){var ok=function(){toast(done||'Link copied')};
if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(text).then(ok,function(){fallback()});else fallback();
function fallback(){var i=el('textarea');i.value=text;i.style.position='fixed';i.style.opacity='0';document.body.append(i);i.select();try{document.execCommand('copy');ok()}catch(e){prompt('Copy this link',text)}i.remove()}}
function cats(box,onPick){box.querySelectorAll('.cat').forEach(function(b){b.onclick=function(){setCat(box,b.dataset.v);onPick(b.dataset.v)}})}
function setCat(box,v){box.querySelectorAll('.cat').forEach(function(x){x.setAttribute('aria-pressed',x.dataset.v===v)})}

/* ---------- list ---------- */
function render(){
var n=items.filter(function(x){return x.type==='notice'}).length,t=items.length-n;
$('sAll').textContent=items.length;$('sN').textContent=n;$('sT').textContent=t;$('sL').textContent=items.length?ago(Math.max.apply(null,items.map(function(x){return x.ts}))):'No uploads yet';
$('cA').textContent=items.length;$('cN').textContent=n;$('cT').textContent=t;
document.querySelectorAll('.tabs button').forEach(function(b){b.setAttribute('aria-selected',b.dataset.f===filter)});
var w=$('q').value.toLowerCase().split(/\s+/).filter(Boolean);
var list=items.filter(function(x){return (filter==='all'||x.type===filter)&&w.every(function(k){return x.title.toLowerCase().indexOf(k)>=0})});
list.sort(sortBy==='name'?function(a,b){return a.title.localeCompare(b.title,'en',{numeric:true,sensitivity:'base'})}:sortBy==='old'?function(a,b){return a.ts-b.ts}:function(a,b){return b.ts-a.ts});
var box=$('list');box.textContent='';
$('foot').hidden=!list.length;$('fcount').textContent=list.length+(list.length===1?' document':' documents')+(w.length||filter!=='all'?' shown of '+items.length:'');
if(!list.length){var e=el('div','empty');var ei=el('div','ei');ei.innerHTML=IC.file;e.append(ei);
if(w.length){e.append(el('b',null,'No matching documents'),el('p',null,'Try a different word, or clear the search.'))}
else{e.append(el('b',null,filter==='all'?'No documents yet':'No '+TYPES[filter].toLowerCase()+' yet'),el('p',null,'Upload a PDF and pick a category. Students will see it on rtuhub.in/notices.'));
var b=el('button','btn p');b.innerHTML=IC.up+' Upload PDF';b.onclick=function(){openUpload(null,filter==='all'?null:filter)};e.append(b)}
box.append(e);return}
var g='';
list.forEach(function(x){
if(sortBy!=='name'){var m=month(x.ts);if(m!==g){g=m;box.append(el('div','grp',m))}}
var r=el('div','tr');
var nm=el('div','nm');var fi=el('span','fi');fi.innerHTML=IC.file;var tw=el('div');tw.style.minWidth='0';
var tb=el('button',null,x.title);tb.type='button';tb.title='Open PDF';tb.onclick=function(){openViewer(x)};
tw.append(tb,el('small',null,TYPES[x.type]+' · '+fdate(x.ts)+', '+ftime(x.ts)+(x.by?' · by '+x.by:'')+(x.size?' · '+kb(x.size):'')));nm.append(fi,tw);
var tg=el('div','tg');tg.append(el('span','tag '+x.type,TYPES[x.type]));
var dt=el('div','dt',fdate(x.ts));dt.append(el('small',null,ftime(x.ts)+(x.by?' · '+x.by:'')));
var sz=el('div','sz',kb(x.size));
var a=el('div','acts');
var v=el('button','btn sm v');v.type='button';v.innerHTML=IC.eye+' View';v.onclick=function(){openViewer(x)};
var dl=el('a','ib');dl.href=fileUrl(x.id)+'&dl=1';dl.setAttribute('download',x.title+'.pdf');dl.setAttribute('data-tip','Download');dl.setAttribute('aria-label','Download');dl.innerHTML=IC.dl;
var cp=el('button','ib');cp.type='button';cp.setAttribute('data-tip','Copy student link');cp.setAttribute('aria-label','Copy student link');cp.innerHTML=IC.link;cp.onclick=function(){copy(studentUrl(x.id))};
var ed=el('button','ib');ed.type='button';ed.setAttribute('data-tip','Edit');ed.setAttribute('aria-label','Edit');ed.innerHTML=IC.edit;ed.onclick=function(){openEdit(x)};
var de=el('button','ib dg');de.type='button';de.setAttribute('data-tip','Delete');de.setAttribute('aria-label','Delete');de.innerHTML=IC.del;de.onclick=function(){openDel(x)};
a.append(v,dl,cp,ed,de);r.append(nm,tg,dt,sz,a);box.append(r)})}
function load(){api('list').then(function(j){items=j.items;loaded=true;setMe(j.me||'');render();if(!me)askName()}).catch(function(e){var box=$('list');box.textContent='';var em=el('div','empty');em.append(el('b',null,'Could not load documents'),el('p',null,e.message));var b=el('button','btn','Try again');b.onclick=load;em.append(b);box.append(em)})}
document.querySelectorAll('.tabs button').forEach(function(b){b.onclick=function(){filter=b.dataset.f;render()}});
$('q').oninput=render;$('sort').onchange=function(){sortBy=this.value;render()};
$('copyMain').onclick=function(){copy(location.origin+'/notices')};

/* ---------- dialogs ---------- */
var openMod=function(m){m.classList.add('on');document.body.style.overflow='hidden'};
var closeMod=function(m){if(m.id==='mUp'&&busy)return;m.classList.remove('on');if(!document.querySelector('.mod.on')&&!$('vw').classList.contains('on'))document.body.style.overflow=''};
document.querySelectorAll('.mod').forEach(function(m){m.addEventListener('click',function(e){if(e.target===m||e.target.closest('[data-close]'))closeMod(m)})});
document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;if($('vw').classList.contains('on')){closeViewer();return}document.querySelectorAll('.mod.on').forEach(function(m){if(m.id==='mName'&&!me)return;closeMod(m)})});

/* ---------- upload ---------- */
cats($('cat'),function(v){cat=v});
var msg=function(s){var m=$('msg');m.textContent=s||'';m.classList.toggle('on',!!s)};
var count=function(){$('cnt').textContent=$('title').value.length+'/150'};
$('title').oninput=function(){count();msg('')};
function resetUpload(){file=null;$('file').value='';$('sel').classList.remove('on');$('drop').style.display='';$('title').value='';count();msg('');$('prog').classList.remove('on');$('upForm').style.display='';$('upDone').classList.remove('on')}
function openUpload(f,c){if(busy){openMod($('mUp'));return}if(!me){askName(function(){openUpload(f,c)});return}$('upWho').textContent=me;resetUpload();if(c){cat=c}setCat($('cat'),cat);openMod($('mUp'));if(f)pick(f);setTimeout(function(){(f?$('title'):$('title')).focus()},50)}
$('openUp').onclick=function(){openUpload()};
function pick(f){msg('');if(!f)return;
if(!(f.type==='application/pdf'||/\.pdf$/i.test(f.name))){msg('Please choose a PDF file. "'+f.name+'" is not a PDF.');return}
if(f.size>MAX){msg('This PDF is '+kb(f.size)+'. The limit is 50 MB.');return}
if(!f.size){msg('This file is empty.');return}
file=f;$('fn').textContent=f.name;$('fs').textContent=kb(f.size);$('drop').style.display='none';$('sel').classList.add('on');
var t=$('title');if(!t.value.trim()){t.value=f.name.replace(/\.pdf$/i,'').replace(/[_]+/g,' ').replace(/\s+/g,' ').trim().slice(0,150);count()}}
$('file').onchange=function(e){pick(e.target.files[0])};$('clr').onclick=function(){file=null;$('file').value='';$('sel').classList.remove('on');$('drop').style.display=''};
var drop=$('drop');['dragenter','dragover'].forEach(function(n){drop.addEventListener(n,function(e){e.preventDefault();e.stopPropagation();drop.classList.add('over')})});
['dragleave','drop'].forEach(function(n){drop.addEventListener(n,function(e){e.preventDefault();drop.classList.remove('over')})});
drop.addEventListener('drop',function(e){e.stopPropagation();$('dropall').classList.remove('on');pick(e.dataTransfer.files[0])});
/* drop anywhere on the page */
var dc=0;window.addEventListener('dragenter',function(e){if(e.dataTransfer&&Array.prototype.indexOf.call(e.dataTransfer.types,'Files')>=0&&!$('mUp').classList.contains('on')){dc++;$('dropall').classList.add('on')}});
window.addEventListener('dragleave',function(){if(--dc<=0){dc=0;$('dropall').classList.remove('on')}});
window.addEventListener('dragover',function(e){e.preventDefault()});
window.addEventListener('drop',function(e){e.preventDefault();dc=0;$('dropall').classList.remove('on');var f=e.dataTransfer&&e.dataTransfer.files[0];if(f&&!$('mUp').classList.contains('on'))openUpload(f)});
function prog(p,s){$('prog').classList.add('on');$('pbi').style.width=Math.round(p*100)+'%';$('ppc').textContent=Math.round(p*100)+'%';if(s)$('pst').textContent=s}
function put(url,f,onp,headers){return new Promise(function(res,rej){var x=new XMLHttpRequest();x.open('PUT',url);for(var k in headers||{})x.setRequestHeader(k,headers[k]);
x.upload.onprogress=function(e){if(e.lengthComputable)onp(e.loaded/e.total)};x.onload=function(){x.status>=200&&x.status<300?res():rej({status:x.status})};
x.onerror=function(){rej({status:0})};x.ontimeout=x.onerror;x.timeout=15*60*1000;x.send(f)})}
function lock(on){busy=on;['title','file','clr','upCancel'].forEach(function(i){$(i).disabled=on});$('cat').querySelectorAll('.cat').forEach(function(b){b.disabled=on});
$('pub').disabled=on;$('pub').innerHTML=on?'<span class="spin"></span> Publishing':IC.up+' Publish'}
$('form').onsubmit=function(e){e.preventDefault();if(busy)return;msg('');
var title=$('title').value.replace(/\s+/g,' ').trim();
if(!title){msg('Please enter a name for this PDF.');$('title').focus();return}
if(!file){msg('Please choose a PDF to upload.');return}
lock(true);prog(0,'Uploading');window.onbeforeunload=function(){return true};var s;
api('sign',{type:cat,title:title,size:file.size}).then(function(r){s=r;
var direct=s.direct?put(s.url,file,function(p){prog(p*.96,'Uploading')},{'content-type':'application/pdf'}).then(function(){return true},function(err){if(err.status&&err.status!==403)throw new Error('Upload failed. Please try again.');return false}):Promise.resolve(false);
return direct}).then(function(sent){if(sent)return;
if(file.size>s.proxyMax)throw new Error('Upload could not reach storage. Please try again in a minute.');
return put('/api/faculty?a=put&id='+s.id,file,function(p){prog(p*.96,'Uploading')},{'content-type':'application/pdf'}).catch(function(){throw new Error('Upload failed. Please check your internet and try again.')})})
.then(function(){prog(.98,'Checking file');return api('commit',{id:s.id,type:cat,title:title})})
.then(function(c){prog(1,'Published');items=[c.item].concat(items.filter(function(x){return x.id!==c.item.id}));lastItem=c.item;render();
$('dTitle').textContent=c.item.title;$('dCat').textContent='Published under '+TYPES[c.item.type]+(c.item.by?' · by '+c.item.by:'')+' · '+kb(c.item.size);$('upForm').style.display='none';$('upDone').classList.add('on');toast(TYPES[c.item.type]+' published')})
.catch(function(err){msg(err.message);$('prog').classList.remove('on');if(/set your name/.test(err.message)){setMe('');askName()}})
.then(function(){lock(false);window.onbeforeunload=null})};
$('dView').onclick=function(){closeMod($('mUp'));if(lastItem)openViewer(lastItem)};
$('dCopy').onclick=function(){if(lastItem)copy(studentUrl(lastItem.id))};
$('dAgain').onclick=function(){var c=cat;resetUpload();cat=c;setCat($('cat'),c);$('title').focus()};

/* ---------- teacher ka naam ---------- */
function initials(n){return n.replace(/^(dr|prof|mr|mrs|ms|er)\.?\s+/i,'').split(/\s+/).filter(Boolean).slice(0,2).map(function(w){return w[0]}).join('').toUpperCase()}
function setMe(n){me=n;$('me').hidden=!n;$('meN').textContent=n;$('meAv').textContent=n?initials(n):''}
var nmsg=function(s){var m=$('nMsg');m.textContent=s||'';m.classList.toggle('on',!!s)};
function askName(then){afterName=then||null;var first=!me;$('mnh').textContent=first?'Welcome! Please set your name':'Change your name';
$('nClose').hidden=first;$('nIn').value=me;$('nPrev').textContent=me||'your name';nmsg('');$('nSave').textContent=first?'Save and continue':'Save';
openMod($('mName'));setTimeout(function(){$('nIn').focus()},50)}
$('nIn').oninput=function(){nmsg('');$('nPrev').textContent=this.value.replace(/\s+/g,' ').trim()||'your name'};
$('mName').addEventListener('click',function(e){if(!me&&(e.target===this))e.stopImmediatePropagation()},true);
$('fName').onsubmit=function(e){e.preventDefault();var n=$('nIn').value.replace(/\s+/g,' ').trim();
if(n.length<3){nmsg('Please enter your full name.');$('nIn').focus();return}
var b=$('nSave');b.disabled=true;b.innerHTML='<span class="spin"></span> Saving';
api('name',{name:n}).then(function(j){setMe(j.me);closeMod($('mName'));toast('Signed in as '+j.me);var f=afterName;afterName=null;if(f)f()})
.catch(function(err){nmsg(err.message)}).then(function(){b.disabled=false;b.textContent='Save'})};
$('me').onclick=function(){askName()};

/* ---------- edit / delete ---------- */
cats($('ecat'),function(v){ecat=v});
function openEdit(x){editing=x;ecat=x.type;setCat($('ecat'),x.type);$('etitle').value=x.title;openMod($('mEdit'));setTimeout(function(){$('etitle').focus()},50)}
$('fEdit').onsubmit=function(e){e.preventDefault();var title=$('etitle').value.replace(/\s+/g,' ').trim();if(!title){$('etitle').focus();return}
var b=$('esave');b.disabled=true;b.innerHTML='<span class="spin"></span> Saving';
api('edit',{id:editing.id,type:ecat,title:title}).then(function(j){items=items.map(function(x){return x.id===j.item.id?j.item:x});closeMod($('mEdit'));render();toast('Changes saved')})
.catch(function(err){toast(err.message)}).then(function(){b.disabled=false;b.textContent='Save changes'})};
function openDel(x){deleting=x;$('dname').textContent='"'+x.title+'" will be removed from rtuhub.in. Students will no longer see it. This cannot be undone.';openMod($('mDel'))}
$('dok').onclick=function(){var b=$('dok');b.disabled=true;b.innerHTML='<span class="spin"></span> Deleting';
api('delete',{id:deleting.id}).then(function(){items=items.filter(function(x){return x.id!==deleting.id});closeMod($('mDel'));render();toast('PDF deleted')})
.catch(function(err){toast(err.message)}).then(function(){b.disabled=false;b.innerHTML=IC.del+' Delete'})};
$('out').onclick=function(){api('logout',{}).catch(function(){}).then(function(){location.reload()})};

/* ---------- PDF viewer (pdf.js, site ka hi copy) ---------- */
var libP=null,base='',vdoc=null,vtask=null,obs=null,zoom=1,ZS=[.75,1,1.25,1.5,2],vgen=0,vItem=null;
function pdfLib(){if(!libP)libP=fetch('/pdfjs.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(j){base=j.base;return import(base+'pdf.min.mjs')}).then(function(m){m.GlobalWorkerOptions.workerSrc=base+'pdf.worker.min.mjs';return m});
libP.catch(function(){libP=null});return libP}
function vmsg(title,text,spin,actions){var b=$('vb');b.textContent='';var d=el('div','vmsg');if(spin)d.append(el('div','bigspin'));d.append(el('b',null,title));if(text)d.append(el('span',null,text));if(actions)d.append(actions);b.append(d);return d}
function openViewer(x){vItem=x;var g=++vgen;$('vtt').textContent=x.title;var tg=$('vtag');tg.className='tag '+x.type;tg.textContent=TYPES[x.type];$('vmeta').textContent=fdate(x.ts)+(x.size?' · '+kb(x.size):'');
$('vDl').href=fileUrl(x.id)+'&dl=1';$('vDl').setAttribute('download',x.title+'.pdf');$('vNew').href=fileUrl(x.id);$('vp').hidden=true;
$('vw').classList.add('on');document.body.style.overflow='hidden';if(!history.state||!history.state.v)history.pushState({v:1},'');
var sp=vmsg('Opening PDF','',true);
pdfLib().then(function(pdfjs){if(g!==vgen)return;
vtask=pdfjs.getDocument({url:fileUrl(x.id),withCredentials:true,disableRange:true,disableAutoFetch:true,wasmUrl:base+'wasm/',standardFontDataUrl:base+'standard_fonts/',iccUrl:base+'iccs/',verbosity:0});
vtask.onProgress=function(p){if(g===vgen&&p.total)sp.querySelector('b').textContent='Opening PDF '+Math.round(Math.min(p.loaded/p.total,1)*100)+'%'};
return vtask.promise.then(function(doc){if(g!==vgen){doc.destroy();return}vdoc=doc;return doc.getPage(1).then(function(p1){if(g!==vgen)return;var v=p1.getViewport({scale:1});layout(v.height/v.width)})})})
.catch(function(){if(g!==vgen)return;var row=el('div','row');var a=el('a','btn p');a.href=fileUrl(x.id)+'&dl=1';a.setAttribute('download',x.title+'.pdf');a.innerHTML=IC.dl+' Download PDF';
var o=el('a','btn','Open in new tab');o.href=fileUrl(x.id);o.target='_blank';o.rel='noopener';row.append(a,o);
vmsg('Could not show this PDF here','Check your internet and try again, or download it.',false,row)})}
function pageWidth(){return Math.min(880,$('vb').clientWidth-24)*zoom}
function layout(ratio){var b=$('vb');b.textContent='';var wrap=el('div','pages');wrap.id='pages';var W=pageWidth();wrap.style.width=W+'px';
if(obs)obs.disconnect();obs=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)draw(e.target)})},{root:b,rootMargin:'600px 0px'});
for(var i=1;i<=vdoc.numPages;i++){var p=el('div','pg');p.dataset.n=i;p.style.height=Math.round(W*ratio)+'px';var pn=el('span','pn',i+' / '+vdoc.numPages);p.append(pn);wrap.append(p);obs.observe(p)}
b.append(wrap);$('zLvl').textContent=Math.round(zoom*100)+'%';$('zOut').disabled=zoom<=ZS[0];$('zIn').disabled=zoom>=ZS[ZS.length-1];showPage()}
function draw(p){if(p.dataset.done===String(zoom)||!vdoc)return;p.dataset.done=String(zoom);var g=vgen,z=zoom;
vdoc.getPage(+p.dataset.n).then(function(page){if(g!==vgen||z!==zoom)return;var v1=page.getViewport({scale:1}),W=pageWidth(),dpr=Math.min(window.devicePixelRatio||1,2);
var vp=page.getViewport({scale:W/v1.width*dpr});p.style.height=Math.round(W*v1.height/v1.width)+'px';
var c=document.createElement('canvas');c.width=Math.floor(vp.width);c.height=Math.floor(vp.height);
return page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise.then(function(){if(g!==vgen||z!==zoom)return;var old=p.querySelector('canvas');if(old)old.remove();p.prepend(c)})}).catch(function(){p.dataset.done=''})}
function setZoom(dir){var i=ZS.indexOf(zoom)+dir;if(i<0||i>=ZS.length||!vdoc)return;var b=$('vb'),f=b.scrollTop/(b.scrollHeight||1);zoom=ZS[i];
vdoc.getPage(1).then(function(p1){var v=p1.getViewport({scale:1});layout(v.height/v.width);b.scrollTop=f*b.scrollHeight})}
$('zIn').onclick=function(){setZoom(1)};$('zOut').onclick=function(){setZoom(-1)};
var pt;function showPage(){var b=$('vb'),ps=b.querySelectorAll('.pg');if(!ps.length)return;var mid=b.scrollTop+b.clientHeight/2,n=1;
for(var i=0;i<ps.length;i++){if(ps[i].offsetTop+ps[i].offsetHeight>mid){n=i+1;break}}var vp=$('vp');vp.textContent='Page '+n+' of '+ps.length;vp.hidden=false;clearTimeout(pt);pt=setTimeout(function(){vp.hidden=true},1400)}
$('vb').addEventListener('scroll',showPage,{passive:true});
var rt;window.addEventListener('resize',function(){if(!vdoc||!$('vw').classList.contains('on'))return;clearTimeout(rt);rt=setTimeout(function(){vdoc.getPage(1).then(function(p1){var v=p1.getViewport({scale:1});layout(v.height/v.width)})},200)});
function closeViewer(fromPop){if(!$('vw').classList.contains('on'))return;vgen++;$('vw').classList.remove('on');if(obs)obs.disconnect();
if(vtask){vtask.destroy();vtask=null}vdoc=null;zoom=1;$('vb').textContent='';if(!document.querySelector('.mod.on'))document.body.style.overflow='';
if(!fromPop&&history.state&&history.state.v)history.back()}
$('vClose').onclick=function(){closeViewer()};window.addEventListener('popstate',function(){closeViewer(true)});

setInterval(function(){if(loaded&&!busy)render()},60000);
load();
})();
</script></body></html>`;
