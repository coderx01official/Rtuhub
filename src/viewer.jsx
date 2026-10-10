// =====================================================================
//  FAST PDF VIEWER — paper seedha site ke andar draw hota hai (pdf.js).
//  Google viewer se bahut tez: pehla page aate hi dikh jata hai, baaki
//  pages scroll karne par bante hain.
// =====================================================================
import { useEffect, useRef, useState } from 'react';
import { paperUrl, paperApiUrl, PUBLIC_FALLBACK } from './data.js';

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

function openDoc(subj, file) {
  const key = paperUrl(subj, file);
  if (docs.has(key)) return docs.get(key);
  const entry = { progress: 0, listeners: new Set(), users: 0 };
  entry.promise = (async () => {
    const pdfjs = await loadPdfLib();
    const load = url => {
      const task = pdfjs.getDocument({ url, verbosity: 0, wasmUrl: __PDFJS__ + 'wasm/', standardFontDataUrl: __PDFJS__ + 'standard_fonts/', iccUrl: __PDFJS__ + 'iccs/' });
      task.onProgress = ({ loaded, total }) => {
        entry.progress = total ? Math.min(loaded / total, 1) : 0;
        entry.listeners.forEach(fn => fn(entry.progress));
      };
      return task.promise;
    };
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
// ungli lagte hi load shuru — viewer khulne tak aadha kaam ho chuka hota hai
export function warmPdf(subj, file) { try { openDoc(subj, file); } catch (e) {} }

// ---------- ek page ----------
function Page({ doc, n, zoom, ratio, stage }) {
  const box = useRef(null), canvas = useRef(null), last = useRef(Promise.resolve());
  const [near, setNear] = useState(n <= 2);
  const [done, setDone] = useState(false);
  const [r, setR] = useState(ratio);

  useEffect(() => {
    if (near) return;
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { root: stage.current, rootMargin: '900px 0px' });   // thoda pehle se bana lo, scroll par khaali na dikhe
    io.observe(box.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near) return;
    let dead = false, task;
    last.current = last.current.then(async () => {
      if (dead) return;
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      if (dead) return;
      setR(base.height / base.width);
      const px = Math.min(box.current.clientWidth * Math.min(window.devicePixelRatio || 1, 2), 2200);
      const viewport = page.getViewport({ scale: px / base.width });
      const c = canvas.current;
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

// ---------- poora paper ----------
const ZOOMS = [0.75, 1, 1.35, 1.8, 2.5];

export function PdfPages({ subj, file, title }) {
  const [doc, setDoc] = useState(null);
  const [ratio, setRatio] = useState(1.414);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [zi, setZi] = useState(1);
  const [cur, setCur] = useState(1);
  const stage = useRef(null);

  useEffect(() => {
    let alive = true;
    const entry = openDoc(subj, file);
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

  if (failed) {
    // bucket public ho to aakhri raasta: Google viewer. Warna saaf message.
    if (PUBLIC_FALLBACK) return (
      <iframe id="pdfViewerFrame" title={title} allowFullScreen
        src={'https://docs.google.com/gview?url=' + encodeURIComponent(paperUrl(subj, file)) + '&embedded=true'}></iframe>
    );
    return (
      <div className="pdf-stage pdf-loading" role="alert">
        <b>This paper could not be opened</b>
        <p style={{ color: 'var(--muted)', maxWidth: '34ch', textAlign: 'center' }}>Check your internet and reload the page. Papers open only on rtuhub.in.</p>
        <button className="btn" onClick={() => location.reload()}>Reload</button>
      </div>
    );
  }

  if (!doc) {
    const pct = Math.round(progress * 100);
    return (
      <div className="pdf-stage pdf-loading" role="status">
        <div className="pdf-ghost"><i></i><i></i><i></i><i></i><i></i></div>
        <b>{pct > 0 ? pct + '%' : 'Opening paper'}</b>
        <div className="pdf-bar"><span style={{ transform: `scaleX(${Math.max(progress, 0.04)})` }}></span></div>
      </div>
    );
  }

  return (
    <>
      <div className="pdf-stage" id="pdfStage" ref={stage} onScroll={onScroll}>
        <div className="pdf-pages" style={{ '--zoom': ZOOMS[zi] }}>
          {Array.from({ length: doc.numPages }, (_, i) => <Page key={i + 1} doc={doc} n={i + 1} zoom={zi} ratio={ratio} stage={stage} />)}
        </div>
      </div>
      <div className="pdf-tools">
        <button aria-label="Zoom out" disabled={zi === 0} onClick={() => setZi(zi - 1)}><i className="fas fa-minus" aria-hidden="true"></i></button>
        <span id="pdfPageInfo">{cur} / {doc.numPages}</span>
        <button aria-label="Zoom in" disabled={zi === ZOOMS.length - 1} onClick={() => setZi(zi + 1)}><i className="fas fa-plus" aria-hidden="true"></i></button>
      </div>
    </>
  );
}
