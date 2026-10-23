// =====================================================================
//  FAST PDF VIEWER — paper seedha site ke andar draw hota hai (pdf.js).
//  Pehla page aate hi dikh jata hai, baaki pages scroll karne par bante hain.
//  Neeche AI chatbot (src/chat.jsx) usi page ko padh kar jawab deta hai.
// =====================================================================
import { useEffect, useRef, useState } from 'react';
import { paperUrl, paperApiUrl, PUBLIC_FALLBACK } from './data.js';
import { Chat, useTyped } from './chat.jsx';

/* global __PDFJS__ */   // build.mjs yahan pdf.js ka folder bharta hai, jaise /assets/pdfjs-6.2.108/
let lib = null;
export function loadPdfLib() {
  return lib || (lib = import(__PDFJS__ + 'pdf.min.mjs').then(m => {
    m.GlobalWorkerOptions.workerSrc = __PDFJS__ + 'pdf.worker.min.mjs';
    return m;
  }).catch(e => { lib = null; throw e; }));
}

// ---------- DOMAIN LOCK: site khulte hi server se cookie (dekho api/session.js) ----------
let session = null, sessionAt = 0;
export function ensureSession() {
  if (session && Date.now() - sessionAt < 5 * 3600 * 1000) return session;
  sessionAt = Date.now();
  return (session = fetch('/api/session', { cache: 'no-store', credentials: 'same-origin' }).then(r => r.ok, () => false));
}

// ---------- khule hue papers yaad rakhna (dobara kholne par turant) ----------
const docs = new Map();
let gatewayOk = true;

// src diya ho (jaise syllabus: /api/syllabus?p=...) to seedha wahi, warna PYQ paper
function openDoc(subj, file, src) {
  const key = src || paperUrl(subj, file);
  if (docs.has(key)) return docs.get(key);
  const entry = { progress: 0, listeners: new Set(), users: 0 };
  entry.promise = (async () => {
    const pdfjs = await loadPdfLib();
    const open = (url, big) => {
      // notes / syllabus PDF badi hoti hain: 1 MB ke tukde (64 KB ke tukde = bahut saare round trip, slow)
      const task = pdfjs.getDocument({ url, verbosity: 0, wasmUrl: __PDFJS__ + 'wasm/', standardFontDataUrl: __PDFJS__ + 'standard_fonts/', iccUrl: __PDFJS__ + 'iccs/',
        ...(big ? { rangeChunkSize: 1 << 20 } : {}) });
      const t = { task, last: Date.now() };
      task.onProgress = ({ loaded, total }) => {
        t.last = Date.now();
        entry.progress = total ? Math.min(loaded / total, 1) : 0;
        entry.listeners.forEach(fn => fn(entry.progress));
      };
      return t;
    };
    // 9 second tak ek byte bhi na aaye (cold start, slow R2) to wahi download naye sire se (2 baar tak)
    const load = (url, big = false) => new Promise((resolve, reject) => {
      let tries = 0, t = open(url, big), done = false;
      const watch = () => {
        const cur = t;
        cur.task.promise.then(d => { if (cur === t && !done) { done = true; clearInterval(tick); resolve(d); } },
          e => { if (cur === t && !done) { done = true; clearInterval(tick); reject(e); } });
      };
      const tick = setInterval(() => {
        if (done || Date.now() - t.last < 9000 || tries >= 2) return;
        tries++;
        const old = t;
        t = open(url, big);
        watch();
        old.task.destroy().catch(() => {});
      }, 1000);
      watch();
    });
    if (src) { await ensureSession(); return load(src, true); }
    if (gatewayOk || !PUBLIC_FALLBACK) {
      await ensureSession();
      try { return await load(paperApiUrl(subj, file)); } catch (e) { if (!PUBLIC_FALLBACK) throw e; gatewayOk = false; }
    }
    return load(key);
  })();
  entry.promise.catch(() => docs.delete(key));
  docs.set(key, entry);
  for (const [k, old] of docs) {   // sirf 4 papers memory mein
    if (docs.size <= 4) break;
    if (old.users || old === entry) continue;
    docs.delete(k);
    old.promise.then(d => d.destroy()).catch(() => {});
  }
  return entry;
}
// AI Assistant ke liye: koi bhi paper / syllabus PDF khol kar pdf.js document do (wahi domain-lock wala raasta)
export function loadDoc(subj, file, src) { return openDoc(subj, file, src).promise; }
// ungli lagte hi load shuru — viewer khulne tak aadha kaam ho chuka hota hai
export function warmPdf(subj, file, src) { try { openDoc(subj, file, src); } catch (e) {} }

// ---------- ek page ----------
// Screen ke paas wale pages hi bane rehte hain; door wale memory se hata diye jate hain.
function Page({ doc, n, zoom, ratio, stage }) {
  const box = useRef(null), canvas = useRef(null), last = useRef(Promise.resolve());
  const [near, setNear] = useState(n <= 2);
  const [done, setDone] = useState(false);
  const [r, setR] = useState(ratio);

  useEffect(() => {
    const io = new IntersectionObserver(es => setNear(es[es.length - 1].isIntersecting), { root: stage.current, rootMargin: '1400px 0px' });
    io.observe(box.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!near) { c.width = c.height = 0; setDone(false); return; }
    let dead = false, task;
    last.current = last.current.then(async () => {
      if (dead) return;
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      if (dead) return;
      setR(base.height / base.width);
      // SHARP: phone ki poori pixel density par banao (pehle 2x par ruk jata tha, isliye dhundhla tha)
      const px = Math.min(box.current.clientWidth * Math.min(window.devicePixelRatio || 1, 3), 2800);
      const viewport = page.getViewport({ scale: px / base.width });
      c.width = Math.floor(viewport.width); c.height = Math.floor(viewport.height);
      task = page.render({ canvas: c, viewport });
      await task.promise;
      if (!dead) setDone(true);
    }).catch(() => {});
    return () => { dead = true; if (task) task.cancel(); };
  }, [near, zoom]);

  return (
    <div ref={box} className={'pdf-page' + (done ? ' done' : '')} data-page={n} style={{ aspectRatio: '1 / ' + r }}>
      <canvas ref={canvas} aria-label={'Page ' + n}></canvas>
    </div>
  );
}

// ---------- load hote waqt: horizontal HUD bar + percentage ----------
export function Loader({ progress, label = 'Loading paper', last = 'Drawing pages' }) {
  const [fake, setFake] = useState(0.02);
  useEffect(() => {   // asli size na pata ho to bhi number badhta rahe
    const t = setInterval(() => setFake(f => f + (0.92 - f) * 0.07), 110);
    return () => clearInterval(t);
  }, []);
  const p = Math.max(progress * 0.98, fake), pct = Math.round(p * 100);
  const stage = pct < 18 ? 'Connecting' : pct < 72 ? 'Downloading' : last;
  return (
    <div className="pdf-stage pdf-loading" role="status" aria-label={label + ' ' + pct + '%'}>
      <div className="hud">
        <div className="hud-top"><span>{label}</span><b id="pdfPercent">{pct}<small>%</small></b></div>
        <div className="hud-bar"><i style={{ transform: `scaleX(${p})` }}></i><u style={{ left: `calc(${pct}% - 3px)` }}></u></div>
        <div className="hud-meta"><span>rtuhub.in secure link</span><span>{stage}</span></div>
      </div>
    </div>
  );
}

// ---------- poora paper ----------
const ZOOMS = [0.75, 1, 1.35, 1.8, 2.5];
const AI_HINTS = ['Q8 ka answer do', 'Explain Q3 in simple words', 'Is page ke important topics', 'Part C Q2 solve karo', '10 marks ka answer likho'];
const NOTE_HINTS = ['Is page ko simple words mein samjhao', 'Is unit ka short summary do', 'Is topic ke exam questions', 'Ye diagram explain karo', 'Is page se 5 MCQ banao'];
// notes list par "AI" dabaya: viewer khulte hi chat bhi khule
let aiNext = false;
export const openAiNext = () => { aiNext = true; };

export function PdfPages({ subj, file, title, src, what = 'paper' }) {
  const [doc, setDoc] = useState(null);
  const [ratio, setRatio] = useState(1.414);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [zi, setZi] = useState(1);
  const [cur, setCur] = useState(1);
  const [chat, setChat] = useState(false);
  const [startChat, setStartChat] = useState('');   // history se aaye: ?chat=<id> wali chat seedha khulti hai
  const [barOff, setBarOff] = useState(true);    // "Ask AI" patti; ek baar band ki to dobara nahi aati
  const stage = useRef(null);
  const hint = useTyped(what === 'notes' ? NOTE_HINTS : AI_HINTS, !chat && !barOff);

  useEffect(() => {
    try { setBarOff(localStorage.getItem('rtuhub_ai_bar') === 'off'); } catch (e) { setBarOff(false); }
    const want = new URLSearchParams(location.search).get('chat');
    if (want) { setStartChat(want); setChat(true); history.replaceState(history.state, '', location.pathname); }
    else if (aiNext || new URLSearchParams(location.search).get('ai')) { setChat(true); if (location.search) history.replaceState(history.state, '', location.pathname); }
    aiNext = false;
    let alive = true;
    const entry = openDoc(subj, file, src);
    entry.users++;
    const onProgress = p => { if (alive) setProgress(p); };
    entry.listeners.add(onProgress);
    setProgress(entry.progress);
    entry.promise.then(async d => {
      const first = (await d.getPage(1)).getViewport({ scale: 1 });
      if (alive) { setRatio(first.height / first.width); setDoc(d); }
    }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; entry.listeners.delete(onProgress); entry.users--; };
  }, []);

  const onScroll = () => {
    const el = stage.current, mid = el.scrollTop + el.clientHeight / 2;
    for (const p of el.querySelectorAll('.pdf-page')) if (p.offsetTop + p.offsetHeight > mid) { setCur(+p.dataset.page); break; }
  };
  const hideBar = () => { setBarOff(true); try { localStorage.setItem('rtuhub_ai_bar', 'off'); } catch (e) {} };

  // AI ko dikhane ke liye abhi wale page ki photo (chhoti JPEG)
  const pageImage = () => {
    try {
      const c = stage.current.querySelector(`[data-page="${cur}"] canvas`);
      if (!c || !c.width) return '';
      const w = Math.min(c.width, 1300), out = document.createElement('canvas');
      out.width = w; out.height = Math.round(c.height * w / c.width);
      const g = out.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, out.width, out.height);
      g.drawImage(c, 0, 0, out.width, out.height);
      return out.toDataURL('image/jpeg', 0.8);
    } catch (e) { return ''; }
  };

  if (failed) {
    // bucket public ho to aakhri raasta: Google viewer. Warna saaf message.
    if (PUBLIC_FALLBACK && !src) return (
      <iframe id="pdfViewerFrame" title={title} allowFullScreen
        src={'https://docs.google.com/gview?url=' + encodeURIComponent(paperUrl(subj, file)) + '&embedded=true'}></iframe>
    );
    return (
      <div className="pdf-stage pdf-loading" role="alert">
        <b>This {what} could not be opened</b>
        <p style={{ color: 'var(--muted)', maxWidth: '34ch', textAlign: 'center' }}>Check your internet and reload the page. Files open only on rtuhub.in.</p>
        <button className="btn" onClick={() => location.reload()}>Reload</button>
      </div>
    );
  }
  if (!doc) return <Loader progress={progress} label={'Loading ' + what} />;

  const bar = !barOff && !chat;
  return (
    <>
      <div className="pdf-stage" id="pdfStage" ref={stage} onScroll={onScroll}>
        <div className="pdf-pages" style={{ '--zoom': ZOOMS[zi] }}>
          {Array.from({ length: doc.numPages }, (_, i) => <Page key={i + 1} doc={doc} n={i + 1} zoom={zi} ratio={ratio} stage={stage} />)}
        </div>
      </div>
      {!chat && (
        <div className={'pdf-tools' + (bar ? ' up' : '')}>
          <button aria-label="Zoom out" disabled={zi === 0} onClick={() => setZi(zi - 1)}><i className="fas fa-minus" aria-hidden="true"></i></button>
          <span id="pdfPageInfo">{cur} / {doc.numPages}</span>
          <button aria-label="Zoom in" disabled={zi === ZOOMS.length - 1} onClick={() => setZi(zi + 1)}><i className="fas fa-plus" aria-hidden="true"></i></button>
          <button className="ai-fab" id="aiOpen" aria-label={'Ask AI about this ' + what} onClick={() => setChat(true)}><i className="fas fa-magic" aria-hidden="true"></i><em>AI</em></button>
        </div>
      )}
      {bar && (
        <div className="ai-bar" id="aiBar">
          <button className="ai-bar-open" onClick={() => setChat(true)}>
            <i className="fas fa-magic" aria-hidden="true"></i>
            <span><b>Ask AI</b> {hint}<u>▌</u></span>
          </button>
          <button className="ai-bar-x" aria-label="Hide this bar" title="Hide. You can still open AI from the button above." onClick={hideBar}><i className="fas fa-times" aria-hidden="true"></i></button>
        </div>
      )}
      {chat && <Chat doc={doc} what={what} paper={title} page={cur} pages={doc.numPages} getImage={pageImage} startId={startChat} close={() => setChat(false)} />}
    </>
  );
}
