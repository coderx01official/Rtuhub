// =====================================================================
//  RTU HUB AI — paper viewer ke neeche khulne wala chatbot.
//  Sirf zaroori page padha jata hai, uska text /api/ai ko jata hai; jawab shabd-shabd aata hai.
//  Scan (photo wala) paper: page padhne (OCR) mein time nahi lagate — page ki photo + sawaal seedha AI ko,
//  wo ek hi baar mein padh kar jawab deta hai (Part A -> page 1-2, Part C -> aakhri 2 page).
//  Har paper ki chat yaad rehti hai. Jawab copy, branded PDF, share, text bada-chhota.
//  Chat history (DeepSeek jaisa): saari chats phone mein, naam badlo, delete karo, date-time ke saath.
//  Neeche provider chuno (Auto / Groq / Gemini / Cerebras / NVIDIA / OpenRouter / Ollama ...) aur chaho to uska koi bhi model;
//  sirf wahi providers dikhte hain jinki key Vercel mein hai. Kisi ki saari keys limit par hon to "High traffic".
//  RESEARCH (globe) button: web se search karke sources + images ke saath jawab. Part A ka sawaal pehle page se, Part C ka aakhri page se dhundha jata hai,
//  aur AI ko poora page nahi, sirf wahi ek sawaal bheja jata hai (kam request, kam token, tez jawab).
// =====================================================================
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ensureSession, loadDoc } from './viewer.jsx';
import { YEARS, pyqSubjects, paperSlug, dashPath, nice } from './data.js';
import { loadSyllabus, sylFileUrl, findSyllabusFor } from './syllabus.js';
import { buildAnswerPdf } from './answerpdf.js';
import { loadKatex, splitMath, texToText, plainMath } from './tex.js';
import { fileToText, FILE_ACCEPT, isImage, kindOf, sizeOf } from './filetext.js';

// khaali box mein apne aap type hota hint
export function useTyped(list, on = true) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!on) return;
    let word = 0, len = 0, dir = 1, timer;
    const tick = () => {
      const full = list[word];
      len += dir;
      setText(full.slice(0, len));
      let wait = dir > 0 ? 38 : 14;
      if (dir > 0 && len === full.length) { dir = -1; wait = 1200; }
      else if (dir < 0 && len === 0) { dir = 1; word = (word + 1) % list.length; wait = 200; }
      timer = setTimeout(tick, wait);
    };
    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, [on]);
  return text;
}

// =====================================================================
//  PAPER PADHNA (AI ki "memory") — phone par hi, kisi key ke bina.
//  1. PDF mein text ho to seedha wahi.  2. Scan (photo) ho to OCR se (Tesseract).
//  Ek baar padha hua page yaad rehta hai, dobara nahi padhna padta.
// =====================================================================
const OCR_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
const memory = new Map();   // "paper|page" -> text
let ocrLib = null, ocrWorker = null, ocrProgress = null;

// server par photo padhne wala model (NVIDIA / Gemini / Groq) hai ya nahi
let caps = null;
// student ka chuna hua provider ('auto' = sabse tez jo free ho) + us provider ka model ('' = best apne aap)
// providers ki list server batata hai (/api/ai?caps=1): sirf wahi jinki key hai
// AMC = Automatic Model Choice (Built by Coder X): sabse tez free model apne aap, limit lage to agla
export const AUTO = { id: 'auto', name: 'AMC ⚙️', full: 'Automatic Model Choice', by: 'Built by Coder X', tip: 'Groq first, then Gemini · spreads users across keys & models · switches on limits', icon: 'cog' };
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { v === '' || v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
let chosen = lsGet('rtuhub_model', 'auto');
const getCaps = () => caps || (caps = fetch('/api/ai?caps=1').then(r => r.json()).catch(() => { caps = null; return { vision: false }; }));
// ek provider ke saare models (dropdown ke liye), ek baar
const modelLists = new Map();
const getModels = id => modelLists.get(id) || modelLists.set(id, fetch('/api/ai?models=' + encodeURIComponent(id)).then(r => r.json()).then(j => j.models || []).catch(() => { modelLists.delete(id); return []; })).get(id);
// server se aaya web research (sources + images), base64 JSON header mein
function readWeb(res) {
  const h = res.headers.get('x-ai-web');
  if (!h) return null;
  try { const bin = atob(h), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); const j = JSON.parse(new TextDecoder().decode(bytes)); return { s: j.s || [], i: j.i || [], d: j.d ? 1 : 0 }; } catch (e) { return null; }
}
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };

// jawab ke neeche: Google jaisa images ka strip + sources (number ke saath, [1] [2] jawab mein)
function WebBits({ web }) {
  const [big, setBig] = useState(-1);
  const [gone, setGone] = useState({});
  if (!web || (!web.s.length && !web.i.length)) return null;
  const imgs = web.i.map((x, j) => ({ ...x, j })).filter(x => !gone[x.j]);
  const show = imgs.slice(0, 5), more = imgs.length - show.length;
  return (
    <div className="web-bits">
      {show.length > 0 && (
        <div className={'web-gal n' + show.length} role="list" aria-label="Images from the web">
          {show.map((x, k) => (
            <button key={x.j} type="button" role="listitem" className="web-tile" onClick={() => setBig(k)} title={x.d || 'Image'}>
              <img src={x.u} alt={x.d || 'Web image ' + (k + 1)} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setGone(g => ({ ...g, [x.j]: 1 }))} />
              {k === show.length - 1 && more > 0 && <span className="web-more">+{more}</span>}
            </button>
          ))}
        </div>
      )}
      {web.s.length > 0 && (
        <div className="web-srcbox">
          <p className="web-h"><i className="fas fa-globe" aria-hidden="true"></i> {web.s.length} sources</p>
          <ol className="web-src" aria-label="Sources">
            {web.s.map((x, j) => (
              <li key={j}><a href={x.u} target="_blank" rel="noopener noreferrer nofollow"><img className="web-fav" src={`https://www.google.com/s2/favicons?domain=${host(x.u)}&sz=32`} alt="" loading="lazy" referrerPolicy="no-referrer" /><span><em>{x.t}</em><small>{j + 1} · {host(x.u)}</small></span></a></li>
            ))}
          </ol>
        </div>
      )}
      {big >= 0 && imgs[big] && createPortal(<Lightbox imgs={imgs} at={big} go={setBig} />, document.body)}
    </div>
  );
}
// Google jaisa bada view: aage / peeche (arrow keys, swipe), counter, thumbnails
function Lightbox({ imgs, at, go }) {
  const x = imgs[at], n = imgs.length, prev = () => go((at - 1 + n) % n), next = () => go((at + 1) % n), close = () => go(-1);
  const touch = useRef(0);
  useEffect(() => {
    const k = e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') prev(); else if (e.key === 'ArrowRight') next(); };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [at]);
  return (
    <div className="lbx" role="dialog" aria-label="Image viewer" onClick={close}>
      <div className="lbx-top" onClick={e => e.stopPropagation()}>
        <span>{at + 1} / {n}</span>
        <a href={x.u} target="_blank" rel="noopener noreferrer nofollow"><i className="fas fa-external-link-alt" aria-hidden="true"></i> {host(x.u)}</a>
        <button type="button" aria-label="Close" onClick={close}><i className="fas fa-times" aria-hidden="true"></i></button>
      </div>
      <figure onClick={e => e.stopPropagation()} onTouchStart={e => { touch.current = e.touches[0].clientX; }} onTouchEnd={e => { const d = e.changedTouches[0].clientX - touch.current; if (Math.abs(d) > 50) (d > 0 ? prev : next)(); }}>
        <img key={x.u} src={x.u} alt={x.d || 'Web image'} referrerPolicy="no-referrer" />
        {x.d && <figcaption>{x.d}</figcaption>}
      </figure>
      {n > 1 && <>
        <button type="button" className="lbx-nav l" aria-label="Previous image" onClick={e => { e.stopPropagation(); prev(); }}><i className="fas fa-chevron-left" aria-hidden="true"></i></button>
        <button type="button" className="lbx-nav r" aria-label="Next image" onClick={e => { e.stopPropagation(); next(); }}><i className="fas fa-chevron-right" aria-hidden="true"></i></button>
        <div className="lbx-thumbs" onClick={e => e.stopPropagation()}>
          {imgs.map((t, k) => <button key={t.u} type="button" className={k === at ? 'on' : ''} aria-label={'Image ' + (k + 1)} onClick={() => go(k)}><img src={t.u} alt="" loading="lazy" referrerPolicy="no-referrer" /></button>)}
        </div>
      </>}
    </div>
  );
}
// har model ka abhi ka haal (koi AI call nahi): { groq: { keys, busy, down }, gemini: {...} }
const getStatus = () => fetch('/api/ai?caps=1', { cache: 'no-store' }).then(r => r.json()).then(j => j.models || {}).catch(() => ({}));

// MODEL 1 (reader): photo -> text. Pehle server ka vision model, wo na ho to phone par OCR.
async function imageToText(dataUrl, canvas, onProgress) {
  if ((await getCaps()).vision) {
    try {
      await ensureSession();
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ read: dataUrl, model: chosen === 'auto' ? '' : chosen }) });
      if (r.ok) return (await r.json()).text || '';
    } catch (e) {}
  }
  const T = await loadOcr();
  ocrProgress = onProgress;
  if (!ocrWorker) ocrWorker = T.createWorker('eng', 1, { logger: m => { if (m.status === 'recognizing text' && ocrProgress) ocrProgress(m.progress); } });
  return (await (await ocrWorker).recognize(canvas || dataUrl)).data.text || '';
}

// attach ki hui photo ko chhota JPEG banana (tez upload, kam data)
function shrink(file) {
  return new Promise((ok, fail) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 1500 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); fail(new Error('image')); };
    img.src = url;
  });
}

function loadOcr() {
  return ocrLib || (ocrLib = new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = OCR_SRC;
    s.onload = () => window.Tesseract ? ok(window.Tesseract) : fail(new Error('ocr'));
    s.onerror = () => { ocrLib = null; fail(new Error('ocr')); };
    document.head.appendChild(s);
  }));
}

const scanned = new Set();   // "paper|page" jinme text nahi (scan / photo)
const shots = new Map();     // "paper|page" -> JPEG

// scan page ki photo (AI ko seedha bhejne ke liye): 1400px chaudi, ~1 MB se kam
async function pageJpeg(doc, paper, n) {
  const key = paper + '|' + n;
  if (shots.has(key)) return shots.get(key);
  const page = await doc.getPage(n);
  const base = page.getViewport({ scale: 1 }), viewport = page.getViewport({ scale: 1400 / base.width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width); canvas.height = Math.floor(viewport.height);
  await page.render({ canvas, viewport }).promise;
  let url = canvas.toDataURL('image/jpeg', 0.72);
  if (url.length > 1300000) url = canvas.toDataURL('image/jpeg', 0.5);
  canvas.width = canvas.height = 0;
  shots.set(key, url);
  if (shots.size > 10) shots.delete(shots.keys().next().value);
  return url;
}

// ocr=false: sirf PDF ka apna text dekho (turant); scan ho to '' lautao, OCR mat chalao
async function readPage(doc, paper, n, onProgress, ocr = true) {
  const key = paper + '|' + n;
  if (memory.has(key)) return memory.get(key);
  if (!ocr && scanned.has(key)) return '';
  try { const saved = localStorage.getItem('rtuhub_txt:' + key); if (saved) { memory.set(key, saved); return saved; } } catch (e) {}
  const page = await doc.getPage(n);
  // 1. PDF ka apna text
  const rows = [];
  for (const it of (await page.getTextContent()).items) {
    if (!it.str || !it.str.trim()) continue;
    const y = it.transform[5];
    let row = rows.find(r => Math.abs(r.y - y) < 3);
    if (!row) rows.push(row = { y, parts: [] });
    row.parts.push([it.transform[4], it.str]);
  }
  let text = rows.sort((a, b) => b.y - a.y).map(r => r.parts.sort((a, b) => a[0] - b[0]).map(p => p[1]).join(' ')).join('\n');
  // 2. scan hai: page ko photo bana kar OCR (sirf jab tez raasta na chal sake)
  if (text.replace(/\s/g, '').length < 80) {
    scanned.add(key);
    if (!ocr) return '';
    const base = page.getViewport({ scale: 1 }), viewport = page.getViewport({ scale: 1600 / base.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width); canvas.height = Math.floor(viewport.height);
    await page.render({ canvas, viewport }).promise;
    text = await imageToText(canvas.toDataURL('image/jpeg', 0.8), canvas, onProgress);
    canvas.width = canvas.height = 0;
  }
  text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  memory.set(key, text);
  try { localStorage.setItem('rtuhub_txt:' + key, text); } catch (e) {}
  return text;
}

// ---------- formula: KaTeX se paper jaisa (load hone tak saaf Unicode) ----------
function MathTex({ tex, display }) {
  const [k, setK] = useState(() => (typeof window !== 'undefined' && window.katex) || null);
  useEffect(() => { if (!k) loadKatex().then(x => x && setK(() => x)); }, []);
  if (k) {
    try {
      // trust: false (default) = \href jaisi koi cheez nahi chalti; output sirf KaTeX ka banaya HTML
      const html = k.renderToString(tex, { displayMode: !!display, throwOnError: false, strict: 'ignore', output: 'html' });
      return <span className={display ? 'math-block' : 'math-in'} dangerouslySetInnerHTML={{ __html: html }} />;   // span: <p> ke andar bhi sahi HTML
    } catch (e) {}
  }
  return <span className={(display ? 'math-block' : 'math-in') + ' raw'}>{texToText(tex)}</span>;
}

// ---------- chhota, surakshit Markdown (koi HTML inject nahi hota) ----------
function inline(text, key) {
  // pehle formula ($..$) alag, phir baaki text mein bold / code / link
  const bits = splitMath(String(text));
  if (bits.some(b => b.math)) return bits.map((b, i) => b.math ? <MathTex key={key + 'm' + i} tex={b.v} display={b.display} /> : <span key={key + 't' + i}>{inlineText(b.v, key + 't' + i)}</span>);
  return inlineText(text, key);
}
function inlineText(text, key) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]\n]{1,120}\]\(\/[A-Za-z0-9\-_/.%]*\))/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.length > 4) return <strong key={key + i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.length > 2) return <code key={key + i}>{p.slice(1, -1)}</code>;
    const a = p.match(/^\[([^\]]+)\]\((\/[^)]*)\)$/);       // sirf rtuhub.in ke andar ke link ("/2ndyear/..."), bahar ka koi link nahi
    if (a) return <a key={key + i} className="msg-link" href={a[2]}>{a[1]}</a>;
    return p;
  });
}
// code: upar language + Copy (ChatGPT jaisa)
function CodeBlock({ lang, text, live }) {
  const [ok, setOk] = useState(false);
  const copyIt = () => { if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); }, () => {}); };
  return (
    <div className="code">
      <div className="code-h"><span>{lang || 'code'}</span>{!live && <button type="button" onClick={copyIt} aria-label="Copy code"><i className={'fas fa-' + (ok ? 'check' : 'copy')} aria-hidden="true"></i> {ok ? 'Copied' : 'Copy code'}</button>}</div>
      <pre>{text}</pre>
    </div>
  );
}
export function Markdown({ text }) {
  const out = [], lines = String(text).replace(/\r/g, '').split('\n');
  let list = null, code = null;
  const flush = () => { if (list) { const L = list.ordered ? 'ol' : 'ul'; out.push(<L key={out.length}>{list.items.map((it, i) => <li key={i}>{inline(it, 'l' + i)}</li>)}</L>); list = null; } };
  let math = null;   // kai line ka $$ ... $$ (ya \[ ... \])
  lines.forEach((line, n) => {
    const tl = line.trim();
    if (math) {
      if (tl.endsWith('$$') || tl.endsWith('\\]')) { math.push(tl.replace(/(\$\$|\\\])$/, '')); out.push(<MathTex key={out.length} tex={math.join('\n')} display />); math = null; }
      else math.push(line);
      return;
    }
    if (!code && (tl === '$$' || tl === '\\[' || ((tl.startsWith('$$') || tl.startsWith('\\[')) && !/(\$\$|\\\])$/.test(tl.slice(2))))) { flush(); math = [tl.slice(2)]; return; }
    if (line.trim().startsWith('```')) { if (code) { out.push(<CodeBlock key={out.length} lang={code.lang} text={code.join('\n')} />); code = null; } else { flush(); code = []; code.lang = line.trim().slice(3).trim().split(/\s/)[0]; } return; }
    if (code) { code.push(line); return; }
    const h = line.match(/^(#{1,4})\s+(.*)/), ul = line.match(/^\s*[-*•]\s+(.*)/), ol = line.match(/^\s*(\d+)[.)]\s+(.*)/);
    if (h) { flush(); out.push(<h4 key={out.length}>{inline(h[2], 'h' + n)}</h4>); }
    else if (ul || ol) {
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] }; }
      list.items.push(ul ? ul[1] : ol[2]);
    }
    else if (!line.trim()) flush();
    else { flush(); out.push(<p key={out.length}>{inline(line, 'p' + n)}</p>); }
  });
  flush();
  if (code) out.push(<CodeBlock key={out.length} lang={code.lang} text={code.join('\n')} live />);
  if (math) out.push(<span key={out.length} className="math-block raw">{texToText(math.join(' '))}</span>);   // abhi likha ja raha hai
  return <>{out}</>;
}

// ---------- SMART: sawaal kis page par hai? sirf wahi page padho ----------
function wanted(q) {
  const part = (q.match(/part\s*[-:.]?\s*([abc])\b/i) || [])[1];
  const no = q.match(/(?:\bq(?:uestion|ues)?\.?\s*(?:no\.?|number)?\s*|sawaal\s*|prashn\s*)(\d{1,2})\b/i) || q.match(/\b(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:question|sawaal|ques)\b/i);
  return { part: part ? part.toUpperCase() : '', no: no ? +no[1] : 0, whole: /poora|pura|pure|whole|entire|complete|all (pages|questions)|saare (page|question)|sabhi|important topics|full paper/i.test(q) };
}
const partAt = (text, part) => text.search(new RegExp('part\\s*[-–—:.]?\\s*' + part + '\\b', 'i'));
const nextPart = text => { const i = text.slice(8).search(/part\s*[-–—:.]?\s*[a-c]\b/i); return i < 0 ? text.length : i + 8; };
const hasNo = (text, no) => new RegExp('(^|\\n)\\s*(q\\.?\\s*)?0?' + no + '\\s*[.):\\]]?\\s', 'i').test(text);
const PART = /(^|\n)[^\n]{0,12}part\s*[-–—:.]?\s*([a-c])\b/gi;

// kis kram mein page dekhne hain: Part A aage se, Part C peeche se, Part B beech se; part nahi bataya to student wala page aur uske paas wale
export function pageOrder(part, pages, here) {
  const all = Array.from({ length: Math.min(pages, 12) }, (_, i) => i + 1);
  if (part === 'A') return all;
  if (part === 'C') return all.reverse();
  const mid = part === 'B' ? (all.length + 1) / 2 : Math.min(here, all.length);
  return all.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b);
}

// page ke text mein se sirf ek sawaal kaatna: "no" se agle sawaal (no+1..no+3, OCR kabhi number chhod deta hai) / agle part tak
const QLINE = /(^|\n)\s*(?:q(?:ue(?:s(?:tion)?)?)?\.?\s*(?:no\.?\s*)?)?0?(\d{1,2})\s*[.):\]]?\s/gi;
export function cutQuestion(text, no) {
  const start = new RegExp('(^|\\n)\\s*(q(?:ue(?:s(?:tion)?)?)?\\.?\\s*(?:no\\.?\\s*)?)?0?' + no + '\\s*[.):\\]]?\\s', 'i');
  const m = text.match(start);
  if (!m) return null;
  const at = m.index + m[1].length, rest = text.slice(at), tail = rest.slice(2);
  const ends = [];
  for (const q of tail.matchAll(QLINE)) if (+q[2] > no && +q[2] <= no + 3) { ends.push(q.index); break; }
  const part = tail.search(/(^|\n)[^\n]{0,12}part\s*[-–—:.]?\s*[a-c]\b/i);
  if (part >= 0) ends.push(part);
  const end = ends.length ? Math.min(...ends) + 2 : rest.length;
  return { at, text: rest.slice(0, end).trim(), open: !ends.length };   // open: page khatam, sawaal agle page par chal sakta hai
}

// sawaal se pehle wala part ka heading (marks ke liye, jaise "PART A (10x2=20)")
export function headBefore(text, at) {
  let head = '';
  for (const m of text.matchAll(PART)) {
    if (m.index >= at) break;
    const [one, two = ''] = text.slice(m.index).replace(/^\n/, '').split('\n');
    head = (/^\s*(q\.?\s*)?\d{1,2}\s*[.):\]]?\s/i.test(two) ? one : one + ' ' + two).slice(0, 220);
  }
  return head;
}

// "Part A Q1 ka answer do" jaisa seedha sawaal? (tabhi jawab sab students mein share/cache hota hai)
const FILLER = /\b(part|section|q|ques|question|questions|no|number|sawaal|prashn|ka|ki|ke|answer|ans|jawab|uttar|solve|solution|do|de|dedo|dena|batao|bata|karo|kar|please|plz|pls|bhai|give|me|the|of|for|write|st|nd|rd|th|a|b|c)\b/gi;
export const plainAsk = q => !q.replace(/([a-z])(\d)/gi, '$1 $2').replace(/(\d)([a-z])/gi, '$1 $2').replace(/[.,:;?!()'"\-–]/g, ' ')
  .replace(FILLER, ' ').replace(/\b\d{1,2}\b/g, ' ').trim();
const langOf = q => /\b(ka|ki|ke|do|de|dedo|batao|bata|karo|kya|bhai|jawab|sawaal|samjhao)\b/i.test(q) ? 'hi' : 'en';

// =====================================================================
//  SMART: sawaal kis page par hai, aur us page mein se sirf wahi sawaal. Lautata hai { text, cache, shots? }
//  Paper chat aur AI Assistant dono yahi use karte hain.
// =====================================================================
async function findQuestion({ doc, paper, page, pages, q, photos = true, read, peek, note = () => {} }) {
  const readOne = read, setNote = note, at1 = page || 1;   // page 0 = koi page khula nahi (AI Assistant)
  const w = wanted(q), tag = n => `--- Page ${n}${n === page ? ' (student is here)' : ''} ---`;
  // TEZ RAASTA: scan paper + server par photo dekhne wala model -> sahi page(s) ki photo seedha bhejo
  if (photos && !(await peek(at1)) && scanned.has(paper + '|' + at1) && (await getCaps()).vision) {
    const N = Math.min(pages, 12), mid = Math.ceil(N / 2);
    const pick = w.part === 'A' ? [1, 2] : w.part === 'C' ? [N - 1, N] : w.part === 'B' ? [mid, mid + 1] : w.whole ? [1, 2, 3] : w.no ? [at1, at1 + 1] : [at1];
    const nos = [...new Set(pick.filter(n => n >= 1 && n <= N))].slice(0, 3);
    setNote(`Page ${nos.join(' + ')} AI ko dikha raha hu`);
    const shotsNow = await Promise.all(nos.map(n => pageJpeg(doc, paper, n)));
    return { text: '', shots: shotsNow, nos, cache: w.no && plainAsk(q) ? { part: w.part, no: w.no, lang: langOf(q) } : null };
  }
  const all = async () => { const out = []; for (let n = 1; n <= Math.min(pages, 12); n++) { const t = await readOne(n); if (t) out.push(`${tag(n)}\n${t}`); } return out.join('\n\n'); };
  if (w.whole) return { text: await all() };
  if (!w.no) { const here = await readOne(at1); return { text: here ? `${tag(at1)}\n${here}` : await all() }; }
  const cache = plainAsk(q) ? { part: w.part, no: w.no, lang: langOf(q) } : null;
  const found = (n, head, body) => ({ text: `${tag(n)}\n${head ? head + '\n...\n' : ''}${body}`.slice(0, 6000), cache });
  // sawaal page ke aakhir tak gaya aur chhota laga: agle page ki shuruaat bhi jodo (wahan tak jahan agla sawaal / part shuru ho)
  const more = async (n, cut) => {
    if (!cut.open || cut.text.length > 160 || n >= Math.min(pages, 12)) return cut.text;
    const next = await readOne(n + 1);
    const stop = next ? next.search(/(^|\n)\s*(q\.?\s*)?\d{1,2}\s*[.):\]]?\s|part\s*[-–—:.]?\s*[a-c]\b/i) : -1;
    return next ? cut.text + '\n' + (stop < 0 ? next : next.slice(0, stop)).slice(0, 1500) : cut.text;
  };
  for (const n of pageOrder(w.part, pages, page)) {
    const t = await readOne(n);
    if (!t) continue;
    if (!w.part) {
      const cut = cutQuestion(t, w.no);
      if (cut) return found(n, headBefore(t, cut.at), await more(n, cut));
      continue;
    }
    const at = partAt(t, w.part);
    if (at < 0) continue;
    const section = t.slice(at), own = section.slice(0, nextPart(section)), head = headBefore(own, 1);
    const cut = cutQuestion(own, w.no);
    if (cut) return found(n, head, own.length === section.length ? await more(n, cut) : cut.text);
    if (own.length === section.length && n < pages) {            // part agle page par chalta hai
      const next = await readOne(n + 1);
      const stop = next ? next.search(/part\s*[-–—:.]?\s*[a-c]\b/i) : -1;
      const c2 = next ? cutQuestion(stop < 0 ? next : next.slice(0, stop), w.no) : null;
      if (c2) return found(n + 1, head, c2.text);
    }
  }
  return { text: await all() };   // number nahi mila (scan dhundhla ho sakta hai): jo padha hai sab bhej do
}

// paper ke baare mein hai? ("Q8", "Part A", "is page", "ye question") — warna general sawaal (linked list ka program, koi concept)
export const refersPaper = q => wanted(q).no > 0 || /\b(q|ques|question|questions|sawaal|prashn|part|page|paper|pyq|isme|iska|iske|iski|ye|yeh|upar|above|this|marks?)\b|\bq\.?\s*\d/i.test(q);

// =====================================================================
//  AI ASSISTANT (dashboard ka "AI Assistant") — koi bhi sawaal + site ki saari cheezein.
//  Sawaal mein subject/saal ho ("DSA 2024 Part A Q1", "OS syllabus") to wahi paper / syllabus khulta hai,
//  usi domain-lock wale raaste se (/api/paper, /api/syllabus: cookie + same-site). Na koi file ka link bahar
//  jaata hai, na koi key; AI ko sirf zaroori page milta hai. Baaki sawaal (concept, program) normal AI jaise.
// =====================================================================
const ABBR = {
  dsa: 'data structures and algorithms', ds: 'data structure', os: 'operating system', dbms: 'database management system', cn: 'computer network',
  toc: 'theory of computation', oop: 'object oriented programming', oops: 'object oriented programming', de: 'digital electronics', dld: 'digital electronics',
  coa: 'computer organization and architecture', daa: 'design and analysis of algorithms', se: 'software engineering', cd: 'compiler design',
  ai: 'artificial intelligence', ml: 'machine learning', aem: 'advanced engineering mathematics', m3: 'advanced engineering mathematics',
  m1: 'engineering mathematics i', m2: 'engineering mathematics ii', pps: 'programming for problem solving', bee: 'basic electrical engineering',
  bme: 'basic mechanical engineering', bce: 'basic civil engineering', physics: 'engineering physics', chemistry: 'engineering chemistry',
  dms: 'discrete mathematics structure', mefa: 'managerial economics and financial accounting', tc: 'technical communication', wt: 'web technology',
  iot: 'internet of things', cg: 'computer graphics', ds_a: 'data structures and algorithms'
};
const STOPW = new Set(['AND', 'OF', 'THE', 'IN', 'FOR', 'TO', 'ENGINEERING', 'LAB', 'SYSTEM', 'SYSTEMS', 'A', 'AN', 'PAPER', 'PYQ', 'KA', 'KI', 'KE', 'SYLLABUS',
  'QUESTION', 'PART', 'YEAR', 'SEM', 'SEMESTER', 'DO', 'DE', 'BATAO', 'SOLVE', 'ANSWER', 'Q', 'MEIN', 'ME', 'KYA', 'HAI', 'KARO', 'BHAI']);
const toks = s => String(s).toUpperCase().replace(/&/g, ' AND ').replace(/[^A-Z0-9]+/g, ' ').split(' ').filter(Boolean);
const expand = q => Object.entries(ABBR).reduce((t, [k, v]) => t.replace(new RegExp('\\b' + k + '\\b', 'gi'), ' ' + v + ' '), ' ' + q + ' ');
// sawaal se subject pehchanna (naam ke shabd + chhote naam jaise DSA, OS, M3)
export function bestSubject(q, list) {
  const qs = new Set(toks(expand(q)).filter(w => !STOPW.has(w)).map(w => w.replace(/S$/, '')));
  const ROM = { I: 1, II: 2, III: 3, IV: 4 };
  let best = null, score = 0;
  for (const s of list || []) {
    const ws = toks(s.name).filter(w => !STOPW.has(w) && !ROM[w] && !/^\d$/.test(w)).map(w => w.replace(/S$/, ''));
    if (!ws.length) continue;
    let sc = ws.filter(w => qs.has(w)).length / ws.length;
    const r = (String(s.name).match(/[-\s](I{1,3}|IV)\s*$/i) || [])[1];
    if (r && sc) sc += qs.has(r.toUpperCase()) || qs.has(String(ROM[r.toUpperCase()])) ? 0.05 : -0.05;
    if (sc > score) { score = sc; best = s; }
  }
  return score >= 0.6 ? best : null;
}

// AI ko site ki "library" ka chhota naksha: student ke year/branch ke subjects, kaun se saal ke papers, aur page link
export function assistantCatalog(sel) {
  if (!sel || !YEARS[sel.year - 1]) return 'The student has not chosen a year/branch on rtuhub.in yet.';
  const y = YEARS[sel.year - 1], base = dashPath(sel.year, sel.branch);
  const list = pyqSubjects(sel.year, sel.branch);
  const lines = list.map(s => `- ${nice(s.name)} (sem ${parseInt(s.semester)}): ${[...new Set(s.files.map(f => f.slice(0, 4)))].join(', ')} -> ${base}/pyq/${s.slug}`);
  return (`Student: ${y.nice}${sel.year > 1 ? ', ' + nice(sel.branch) : ' (common to all branches)'}\n`
    + `PYQ papers on rtuhub.in (subject (semester): years -> page link):\n${lines.join('\n') || '(none yet)'}\n`
    + `Syllabus: ${base}/syllabus\nOther pages: SGPA calculator /sgpa-calculator, RTU news /news, official RTU links (result, admit card, revaluation, copy view, exam form, certificates) /links, campus map /map`).slice(0, 6000);
}

// sawaal kis paper / syllabus ka hai? (koi na mile to null = general sawaal)
async function findTarget(q, sel) {
  if (!sel || !YEARS[sel.year - 1]) return null;
  const base = dashPath(sel.year, sel.branch), w = wanted(q);
  const list = pyqSubjects(sel.year, sel.branch), subj = bestSubject(q, list);
  if (/syllabus|silabus|course content|units? (kya|kaun|list)/i.test(q) && !w.no && !w.part) {
    const st = await loadSyllabus();
    const box = st && st.data && st.data[(sel.year === 1 ? 'COMMON' : sel.branch) + '|' + sel.year];
    const g = box && ((subj && findSyllabusFor(box, subj.name)) || bestSubject(q, box.subjects));
    return g ? { kind: 'syl', g, title: g.name + ' syllabus', url: `${base}/syllabus/${g.slug}` } : null;
  }
  if (!subj || !(w.no || w.part || w.whole || /\b(pyq|paper|20\d{2}|important questions?)\b/i.test(q))) return null;   // "DSA mein stack kya hai" -> general
  const yr = (q.match(/\b(20\d{2})\b/) || [])[1];
  const file = (yr && subj.files.find(f => f.startsWith(yr))) || subj.files[0];
  return { kind: 'pyq', subj, file, title: `${nice(subj.name)} ${paperSlug(subj, file)} paper`, url: `${base}/pyq/${subj.slug}/${paperSlug(subj, file)}` };
}

// AI Assistant ka "gather": target khol kar wahi sawaal / page nikaalna
async function assistantGather(q, sel, note) {
  const t = await findTarget(q, sel);
  if (!t) return { text: '', general: true };
  note(`${t.title} khol raha hu`);
  if (t.kind === 'pyq') {
    const doc = await loadDoc(t.subj, t.file), paper = 'PYQ ' + t.url;
    const read = n => readPage(doc, paper, n, p => note(`${t.title}: page ${n} padh raha hu ${Math.round(p * 100)}%`)).catch(() => '');
    const peek = n => readPage(doc, paper, n, null, false).catch(() => '');
    return { ...(await findQuestion({ doc, paper, page: 0, pages: doc.numPages, q, read, peek, note })), target: t };
  }
  // syllabus: photo pages -> seedha AI ko; PDF -> pehle 3 page ka text (scan ho to photo)
  const g = t.g, keys = g.pages.slice(0, 3).map(p => p.key);
  if (g.kind === 'img') {
    const shotsNow = [];
    for (const k of keys) { try { const b = await (await fetch(sylFileUrl(k), { credentials: 'same-origin' })).blob(); shotsNow.push(await shrink(b)); } catch (e) {} }
    return shotsNow.length ? { text: '', shots: shotsNow, nos: shotsNow.map((_, i) => i + 1), target: t } : { text: '', general: true };
  }
  const doc = await loadDoc(null, null, sylFileUrl(keys[0])), paper = 'SYL ' + t.url, out = [];
  for (let n = 1; n <= Math.min(doc.numPages, 3); n++) { const x = await readPage(doc, paper, n, null, false).catch(() => ''); if (x) out.push(`--- Page ${n} ---\n${x}`); }
  if (out.length) return { text: out.join('\n\n').slice(0, 9000), target: t };
  const shotsNow = await Promise.all([1, 2].filter(n => n <= doc.numPages).map(n => pageJpeg(doc, paper, n)));
  return { text: '', shots: shotsNow, nos: [1, 2].slice(0, shotsNow.length), target: t };
}

// =====================================================================
//  CHAT HISTORY — saari chats isi phone mein (localStorage). DeepSeek jaisa: list, kholo, naam badlo, delete.
//  rtuhub_chats            -> [{ id, title, paper, url, created, updated, n }]   (sirf list, halki)
//  rtuhub_chatmsg:<id>     -> us chat ke messages
// =====================================================================
const IDX = 'rtuhub_chats', msgKey = id => 'rtuhub_chatmsg:' + id;
const ls = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const titleOf = t => String(t || '').replace(/\s+/g, ' ').trim().slice(0, 48) || 'New chat';

export function listChats() {
  let list = ls.get(IDX, null);
  if (!Array.isArray(list)) {                 // pehli baar: purani "ek paper = ek chat" wali yaadein naye dhaanche mein
    list = [];
    const old = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('rtuhub_chat:')) old.push(k); } } catch (e) {}
    for (const k of old) {
      const msgs = ls.get(k, []);
      if (Array.isArray(msgs) && msgs.length) {
        const id = newId(), first = msgs.find(m => m.role === 'user');
        ls.set(msgKey(id), msgs);
        list.push({ id, title: titleOf(first && first.content), paper: k.slice(12), url: '', created: Date.now(), updated: Date.now(), n: msgs.length });
      }
      ls.del(k);
    }
    ls.set(IDX, list);
  }
  return list.filter(c => c && c.id).sort((a, b) => b.updated - a.updated);
}
const loadMsgs = id => { const v = ls.get(msgKey(id), []); return Array.isArray(v) ? v : []; };
function storeChat(id, info, messages) {
  const keep = messages.filter(m => m.content && !m.error).slice(-40).map(m => ({ role: m.role, content: m.content, model: m.model, n: m.photos ? m.photos.length : m.n || 0, ...(m.web ? { web: m.web } : {}), ...(m.conn ? { conn: m.conn } : {}), ...(m.fallback ? { fallback: m.fallback } : {}), ...(m.files && m.files.length ? { files: m.files.map(f => ({ name: f.name, kind: f.kind })) } : {}) }));
  if (!keep.length) return;
  let list = listChats();
  const was = list.find(c => c.id === id);
  const row = { id, title: was ? was.title : titleOf((keep.find(m => m.role === 'user') || {}).content), paper: info.paper, url: info.url || (was && was.url) || '', created: was ? was.created : Date.now(), updated: Date.now(), n: keep.length };
  list = [row, ...list.filter(c => c.id !== id)];
  // phone ki jagah bhar gayi: sabse purani chats hatao jab tak save na ho jaye
  while (!ls.set(msgKey(id), keep) && list.length > 1) { const gone = list.pop(); ls.del(msgKey(gone.id)); }
  ls.set(IDX, list.slice(0, 200));
}
function renameChat(id, title) { ls.set(IDX, listChats().map(c => c.id === id ? { ...c, title: titleOf(title) } : c)); }
function deleteChat(id) { ls.del(msgKey(id)); ls.set(IDX, listChats().filter(c => c.id !== id)); }

// "18 Oct, 7:42 pm" ; group: Today / Yesterday / Previous 7 days / Older
const when = ts => new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
function groupOf(ts) {
  const day = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const diff = Math.round((day(Date.now()) - day(ts)) / 86400000);
  return diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : diff < 7 ? 'Previous 7 days' : 'Older';
}

// ---------- history panel ----------
function History({ paper, cid, open, close }) {
  const [chats, setChats] = useState(listChats);
  const [edit, setEdit] = useState('');
  const [sure, setSure] = useState('');
  const refresh = () => setChats(listChats());
  const groups = [];
  for (const c of chats) { const g = groupOf(c.updated); let box = groups.find(x => x.name === g); if (!box) groups.push(box = { name: g, items: [] }); box.items.push(c); }
  return (
    <div className="chat-hist" id="aiHistory" role="dialog" aria-label="Chat history">
      <div className="hist-top">
        <div><b>Chat history</b><small>{chats.length} {chats.length === 1 ? 'chat' : 'chats'} · saved on this device</small></div>
        <button aria-label="Close history" onClick={close}><i className="fas fa-times" aria-hidden="true"></i></button>
      </div>
      <div className="hist-list">
        {!chats.length && <p className="hist-empty"><i className="fas fa-comments" aria-hidden="true"></i>Abhi koi chat nahi. Sawaal poochho, chat yahan save ho jayegi.</p>}
        {groups.map(g => (
          <section key={g.name}>
            <h5>{g.name}</h5>
            {g.items.map(c => {
              const here = c.paper === paper, far = !here && !c.url;
              return (
                <div key={c.id} className={'hist-row' + (c.id === cid ? ' on' : '')}>
                  {edit === c.id ? (
                    <form className="hist-edit" onSubmit={e => { e.preventDefault(); renameChat(c.id, e.target.elements.t.value); setEdit(''); refresh(); }}>
                      <input name="t" defaultValue={c.title} maxLength="60" autoFocus aria-label="Chat name" onKeyDown={e => e.key === 'Escape' && setEdit('')} />
                      <button type="submit" aria-label="Save name"><i className="fas fa-check" aria-hidden="true"></i></button>
                    </form>
                  ) : (
                    <button className="hist-open" disabled={far} title={far ? 'Ye chat doosre paper ki hai. Wo paper kholo.' : c.title} onClick={() => open(c)}>
                      <b>{c.title}</b>
                      <small>{!here && <><i className="fas fa-file-alt" aria-hidden="true"></i> {c.paper} · </>}{when(c.updated)} · {c.n} msg</small>
                    </button>
                  )}
                  {sure === c.id ? (
                    <span className="hist-sure">Delete?
                      <button className="yes" onClick={() => { deleteChat(c.id); setSure(''); refresh(); if (c.id === cid) open(null); }}>Yes</button>
                      <button onClick={() => setSure('')}>No</button>
                    </span>
                  ) : edit !== c.id && (
                    <span className="hist-act">
                      <button aria-label={'Rename ' + c.title} title="Rename" onClick={() => { setSure(''); setEdit(c.id); }}><i className="fas fa-pen" aria-hidden="true"></i></button>
                      <button aria-label={'Delete ' + c.title} title="Delete" onClick={() => { setEdit(''); setSure(c.id); }}><i className="fas fa-trash" aria-hidden="true"></i></button>
                    </span>
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </div>
      <p className="hist-brand"><span className="chat-orb mini" aria-hidden="true"></span>RTU Hub AI <em>· rtuhub.in</em></p>
    </div>
  );
}

const CHIPS = ['Is page ke saare questions list karo', 'Q1 ka answer do', 'Important topics batao', 'Is page ko simple Hindi mein samjhao'];
const AI_HINTS = ['Kuch bhi poochho', 'DSA 2024 paper Part A Q1', 'Linked list ka C program do', 'OS ka syllabus batao', 'Mere PYQ papers ki list do'];
// AI Assistant ke chips: student ke apne subject se
function aiChips(sel) {
  const s = sel && YEARS[sel.year - 1] ? pyqSubjects(sel.year, sel.branch)[0] : null;
  const n = s ? nice(s.name) : '';
  return [n ? `${n} ${s.files[0].slice(0, 4)} paper Part A Q1 solve karo` : 'Stack aur queue mein difference', 'Linked list ka C program do', n ? `${n} ka syllabus batao` : 'Binary search samjhao', 'Mere PYQ papers ki list do'];
}
const HINTS = ['Enter your command', 'Q8 ka answer do', 'Part A question 1', 'Part C Q2, 10 marks answer', 'Is topic ko simple Hindi mein samjhao'];

// ---------- jawab ka PDF: site ke andar khulta hai, wahin se share / download ----------
function AnswerPdf({ title, items, close }) {
  const [pdf, setPdf] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { let alive = true; buildAnswerPdf(title, items).then(p => alive && setPdf(p)).catch(() => alive && setMsg('PDF nahi ban paya. Dobara try karo.')); return () => { alive = false; }; }, []);
  const download = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(pdf.blob); a.download = pdf.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000); };
  const share = async () => {
    try {
      if (pdf.file && navigator.canShare && navigator.canShare({ files: [pdf.file] })) { await navigator.share({ files: [pdf.file], title: pdf.name, text: 'Solved with RTU Hub AI on rtuhub.in' }); return; }
    } catch (e) { if (e.name === 'AbortError') return; }
    download(); setMsg('Is browser mein seedha share nahi hota. PDF download ho gaya, wahan se share kar do.');
  };
  return (
    <div className="apdf" id="answerPdf">
      <div className="pdfv-bar">
        <button className="icon-btn" aria-label="Back to chat" onClick={close}><i className="fas fa-arrow-left" aria-hidden="true"></i></button>
        <div className="pdfv-name"><h1>Answer PDF</h1></div>
        <button className="icon-btn" id="apdfDownload" aria-label="Download PDF" disabled={!pdf} onClick={download}><i className="fas fa-download" aria-hidden="true"></i></button>
        <button className="btn" id="apdfShare" disabled={!pdf} onClick={share}><i className="fas fa-share-alt" aria-hidden="true"></i> Share</button>
      </div>
      {msg && <p className="apdf-msg">{msg}</p>}
      <div className="pdf-stage">
        {pdf
          ? <div className="pdf-pages">{pdf.previews.map((src, i) => <div key={i} className="pdf-page done" style={{ aspectRatio: '1240 / 1754' }}><img src={src} alt={'Answer page ' + (i + 1)} /></div>)}</div>
          : !msg && <div className="apdf-wait"><span className="dots"><i></i><i></i><i></i></span> PDF ban raha hai</div>}
      </div>
    </div>
  );
}

// model id -> brand jaisa saaf naam:  "openai/gpt-oss-120b" -> "GPT-OSS 120B",  "gemini-2.5-flash" -> "Gemini 2.5 Flash"
const BRAND = { gpt: 'GPT', oss: 'OSS', llama: 'Llama', llama3: 'Llama 3', gemini: 'Gemini', gemma: 'Gemma', gemma3: 'Gemma 3', qwen: 'Qwen', qwen3: 'Qwen3', qwq: 'QwQ', deepseek: 'DeepSeek', kimi: 'Kimi', mistral: 'Mistral', mixtral: 'Mixtral', phi: 'Phi', glm: 'GLM', r1: 'R1', v3: 'V3', vl: 'VL', it: 'IT', nemotron: 'Nemotron', claude: 'Claude', grok: 'Grok', o1: 'o1', o3: 'o3', o4: 'o4', fp8: 'FP8', ai: 'AI', moe: 'MoE', coder: 'Coder', default: 'Default', fast: 'Fast', openai: 'OpenAI' };
export function prettyModel(m) {
  const id = String(m).split('/').pop().replace(/:free$|:cloud$/, '').replace(/:/g, ' ');
  const words = id.split(/[-_ ]+/).filter(Boolean).map(w => {
    const k = w.toLowerCase();
    if (BRAND[k]) return BRAND[k];
    if (/^\d+(\.\d+)?[bmkt]$/i.test(w)) return w.toUpperCase();          // 120b -> 120B
    if (/^a\d+b$/i.test(w)) return w.toUpperCase();                        // a22b -> A22B
    if (/^\d+e$/i.test(w)) return w.toUpperCase();                         // 16e -> 16E
    const v = k.match(/^(llama|gemma|qwen|phi|mistral)(\d[\d.]*)$/);        // llama3.1 -> Llama 3.1
    if (v) return BRAND[v[1]] + ' ' + v[2];
    if (/^\d{4}$/.test(w) || /^\d+(\.\d+)*$/.test(w)) return w;            // version / date
    return w.charAt(0).toUpperCase() + w.slice(1);
  });
  const out = words.join(' ').replace(/^GPT OSS/, 'GPT-OSS').replace(/^Llama (\d)/, 'Llama $1');
  return out.length > 34 ? out.slice(0, 33) + '…' : out;
}
const short = prettyModel;
const Globe = () => <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z" fill="none" stroke="currentColor" strokeWidth="2"/></svg>;

// ---------- CONNECTORS (Claude jaisa): GitHub, Vercel, YouTube ----------
// token sirf isi browser mein (localStorage); har sawaal ke saath server ko jaata hai, wahan save nahi hota
export const CONNECTORS = [
  { id: 'github', name: 'GitHub', icon: 'fab fa-github', desc: 'Read repos, files, folders, issues and commits from a GitHub link. Add a token for your private repos.', token: true, optional: true,
    help: 'https://github.com/settings/personal-access-tokens/new', helpText: 'Create a fine-grained token (read-only: Contents, Metadata, Issues)', ph: 'github_pat_… or ghp_…' },
  { id: 'vercel', name: 'Vercel', icon: 'fas fa-caret-up', desc: 'See your projects and latest deployments, and debug failed builds from the real build log.', token: true,
    help: 'https://vercel.com/account/settings/tokens', helpText: 'Create a token in Vercel → Account Settings → Tokens', ph: 'Vercel access token' },
  { id: 'youtube', name: 'YouTube', icon: 'fab fa-youtube', desc: 'Paste a video link: summary, notes and answers from the transcript, with time marks.' }
];
const CONN_DEFAULT = { github: { on: true }, vercel: { on: false }, youtube: { on: true } };
const loadConn = () => { try { const v = JSON.parse(localStorage.getItem('rtuhub_conn') || 'null'); return v && typeof v === 'object' ? { ...CONN_DEFAULT, ...v } : CONN_DEFAULT; } catch (e) { return CONN_DEFAULT; } };
const saveConn = v => { try { localStorage.setItem('rtuhub_conn', JSON.stringify(v)); } catch (e) {} };
const connIcon = k => (CONNECTORS.find(c => c.id === k) || { icon: 'fas fa-plug' }).icon;

// "Authorize" (Claude jaisa): popup mein GitHub / Vercel login -> server encrypted cookie rakhta hai
export const getOauth = () => fetch('/api/oauth?status=1', { cache: 'no-store', credentials: 'same-origin' }).then(r => r.json()).catch(() => ({ ready: {} }));
function authorize(id, after) {
  const w = 560, h = 720, left = Math.max(0, (screen.width - w) / 2), top = Math.max(0, (screen.height - h) / 2);
  const pop = window.open('/api/oauth?start=' + id, 'rtuhub_' + id, `width=${w},height=${h},left=${left},top=${top}`);
  if (!pop) { location.href = '/api/oauth?start=' + id; return; }   // popup band: isi tab mein
  const onMsg = e => { if (e.origin === location.origin && e.data && e.data.rtuhubConnector === id) { cleanup(); after(e.data); } };
  const timer = setInterval(() => { if (pop.closed) { cleanup(); after({ ok: null }); } }, 700);
  function cleanup() { clearInterval(timer); removeEventListener('message', onMsg); }
  addEventListener('message', onMsg);
}

function ConnectorSheet({ conn, setConn, oauth, setOauth, close }) {
  const [edit, setEdit] = useState('');
  const [tok, setTok] = useState('');
  const [wait, setWait] = useState('');
  const [err, setErr] = useState({});
  useEffect(() => { const k = e => e.key === 'Escape' && close(); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  useEffect(() => { getOauth().then(setOauth); }, []);
  const set = (id, v) => { const n = { ...conn, [id]: { ...(conn[id] || {}), ...v } }; setConn(n); saveConn(n); };
  const ready = (oauth && oauth.ready) || {};
  async function useToken(c) {
    setWait(c.id); setErr({});
    try {
      await ensureSession();
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ verify: c.id, token: tok.trim() }) });
      const j = await r.json().catch(() => ({}));
      if (j.ok) { set(c.id, { on: true, token: tok.trim(), name: j.name }); setEdit(''); setTok(''); }
      else setErr({ [c.id]: j.error || 'Could not connect' });
    } catch (e) { setErr({ [c.id]: 'Network error' }); }
    setWait('');
  }
  function doAuth(c) {
    setWait(c.id); setErr({});
    authorize(c.id, d => {
      setWait('');
      if (d.ok === false) setErr({ [c.id]: d.msg || 'Could not connect' });
      getOauth().then(o => { setOauth(o); if (o[c.id]) set(c.id, { on: true }); });
    });
  }
  async function disconnect(c) {
    const st = conn[c.id] || {};
    if (st.token) set(c.id, { token: '', name: '', on: c.optional ? st.on : false });
    if (oauth && oauth[c.id]) { await fetch('/api/oauth?logout=' + c.id, { credentials: 'same-origin' }).catch(() => {}); setOauth(await getOauth()); if (!c.optional) set(c.id, { on: false, token: '', name: '' }); }
  }
  return (
    <div className="msheet csheet" role="dialog" aria-label="Connectors">
      <div className="msheet-head"><b>Connectors</b><button type="button" aria-label="Close" onClick={close}><i className="fas fa-times" aria-hidden="true"></i></button></div>
      <p className="csheet-sub">Let RTU Hub AI read from your apps and links. Turn one on, or authorize your account.</p>
      <div className="msheet-list">
        {CONNECTORS.map(c => {
          const st = conn[c.id] || {}, who = (oauth && oauth[c.id] && oauth[c.id].name) || (st.token && st.name), linked = !!who;
          const usable = !c.token || c.optional || linked;
          return (
            <div key={c.id} className={'conn' + (st.on && usable ? ' on' : '')}>
              <div className="conn-row">
                <i className={'conn-ic ' + c.id + ' ' + c.icon} aria-hidden="true"></i>
                <span className="conn-txt">
                  <b>{c.name}</b>
                  <small className={'conn-state' + (linked ? ' ok' : '')}>{linked ? <><i className="fas fa-check-circle" aria-hidden="true"></i> Connected as {who}</> : c.token && !c.optional ? 'Not connected' : 'Works with public links'}</small>
                  <small>{c.desc}</small>
                </span>
                <button type="button" role="switch" aria-checked={!!(st.on && usable)} aria-label={'Use ' + c.name} className="conn-sw"
                  onClick={() => { if (!usable) { ready[c.id] ? doAuth(c) : setEdit(c.id); return; } set(c.id, { on: !st.on }); }}><i></i></button>
              </div>
              {c.token && (
                <div className="conn-acts">
                  {linked
                    ? <button type="button" className="conn-btn ghost" onClick={() => disconnect(c)}><i className="fas fa-unlink" aria-hidden="true"></i> Disconnect</button>
                    : <>
                        {ready[c.id] && <button type="button" className="conn-btn auth" disabled={wait === c.id} onClick={() => doAuth(c)}><i className={c.icon} aria-hidden="true"></i> {wait === c.id ? 'Waiting for authorization…' : `Authorize ${c.name}`}</button>}
                        {edit !== c.id && <button type="button" className={'conn-btn' + (ready[c.id] ? ' link' : '')} onClick={() => { setEdit(c.id); setTok(''); setErr({}); }}>{ready[c.id] ? 'Use a token instead' : <><i className="fas fa-key" aria-hidden="true"></i> Connect with token</>}</button>}
                      </>}
                </div>
              )}
              {edit === c.id && !linked && (
                <form className="conn-form" onSubmit={e => { e.preventDefault(); if (tok.trim()) useToken(c); }}>
                  <input type="password" autoComplete="off" spellCheck="false" value={tok} onChange={e => setTok(e.target.value)} placeholder={c.ph} aria-label={c.name + ' token'} autoFocus />
                  <button type="submit" className="conn-btn" disabled={wait === c.id || !tok.trim()}>{wait === c.id ? 'Checking…' : 'Connect'}</button>
                  <a href={c.help} target="_blank" rel="noopener noreferrer">{c.helpText} <i className="fas fa-external-link-alt" aria-hidden="true"></i></a>
                </form>
              )}
              {err[c.id] && <small className="conn-err">{err[c.id]}</small>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
// jawab ke neeche: kis connector se kya padha
function ConnBits({ list }) {
  if (!list || !list.length) return null;
  return (
    <div className="conn-used">
      {list.map((c, i) => <a key={i} href={c.u} target="_blank" rel="noopener noreferrer nofollow" title={c.t}><i className={connIcon(c.k)} aria-hidden="true"></i><span>{c.t}</span></a>)}
    </div>
  );
}

// ===== har model ke tags + benchmark (BenchLM, Oct 2026; open models + kuch Gemini) =====
const BENCH = { 'gemini-4-argon': 82.9, 'mimo-v2.6-pro': 73.7, 'kimi-k3': 70.0, 'step-5-preview': 69.7, 'gemini-3.8-flash': 69.2, 'ling-3.1-flash': 68.1, 'glm-5.3': 67.9,
  'deepseek-v4.1-flash': 65.7, 'mimo-v2.6-flash': 64.6, 'dots-3-note-preview': 64.2, 'deepseek-v4-pro': 63.2, 'muse-spark-open': 62.7, 'hy4-preview': 61.4, 'glm-5.2': 60.5,
  'qwen3.8-27b': 59.6, 'glm-5.3-flash': 58.5, 'kimi-k2.6': 58.4, 'glm-5.1': 56.3, 'qwen3.5-397b': 55.4, 'minimax-m3': 55.0, 'glm-5': 54.8, 'kimi-k2.5': 53.0,
  'inkling-small': 52.7, 'inkling': 52.6, 'hy3': 52.5, 'beam': 51.5, 'beam-1.0-501b': 51.5, 'deepseek-v3.2': 50.2, 'nemotron-3.5-super-vl': 49.4, 'kimi-k2.7-code': 49.3,
  'glm-4.7': 48.8, 'qwen3.5-27b': 48.7, 'qwen3.6-27b': 48.5, 'minimax-m2.7': 48.2, 'nemotron-3-ultra': 46.8, 'ling-3.0-flash-vl': 46.7, 'qwen3.5-35b': 45.8,
  'gemma-4-26b': 45.6, 'ling-3.0-flash': 45.1, 'step-3.7-flash': 43.6, 'qwen3.6-35b': 43.4, 'step-3.5-flash': 42.1, 'qwen3.5-122b': 41.7, 'muse-glimmer-30b': 41.2,
  'deepseek-r1': 41.0, 'deepseek-v3.1': 40.7, 'glm-4.6': 40.0, 'gemma-4-31b': 39.8, 'glm-4.7-flash': 39.1, 'gpt-oss-120b': 37.3, 'deepseek-v3-0324': 36.4,
  'gpt-oss-20b': 33.3, 'granite-4.2-8b': 32.9, 'nemotron-3-nano-omni': 32.1, 'qwen2.5-72b': 28.7, 'gemma-3-27b': 28.6, 'llama-4-scout': 28.1, 'qwen2.5-coder-32b': 26.5,
  'nemotron-3.5-lightning': 25.6, 'phi-4': 25.0, 'llama-4-maverick': 21.5, 'mixtral-8x22b': 18.1, 'mistral-7b': 7.2 };
const normId = m => String(m).split('/').pop().toLowerCase().replace(/:free$|:cloud$/, '').replace(/[:_ ]+/g, '-').replace(/^nvidia-/, '')
  .replace(/-(instruct|it|bf16|fp8|nvfp4|awq-4bit|gguf|versatile|v0\.\d)(?=-|$)/g, '').replace(/-+$/, '');
export function benchOf(m) {
  const id = normId(m);
  if (BENCH[id] != null) return BENCH[id];
  let best = null, len = 0;
  for (const k in BENCH) if (id.startsWith(k) && k.length > len && /^(-(a?\d+(\.\d+)?[bmkt]|\d{3,4}|preview|latest|rl|exp|reasoning|\d+e))*$/.test(id.slice(k.length))) { best = BENCH[k]; len = k.length; }
  return best;
}
export function tagsOf(m, prov) {
  const id = String(m).toLowerCase(), t = [];
  if (/cod(e|er|estral)|starcoder|devstral|kimi-k2\.7|glm-[45]|deepseek-v[34]|qwen3\.[5-8]|minimax-m|gpt-oss|step-5|mimo|kimi-k3|ling-3/.test(id)) t.push('Coding');
  if (/vision|-vl\b|vl-|[-.]vl$|llama-4|maverick|scout|gemma-?[34]|gemini|omni|phi-3-vision|kosmos|neva|vila|fuyu|pixtral|glm-4\.\dv|super-vl|mimo-v2\.6|qwen3-vl/.test(id)) t.push('Image read');
  if (/image-gen|imagen|flux|nano-banana/.test(id)) t.push('Image create');
  if (/omni|audio|speech|-live/.test(id)) t.push('Audio');
  if (/\br1\b|-r1|thinking|reasoning|qwq|gpt-oss|ultra|-pro\b|step-5|mimo|kimi-k3|glm-5|deepseek-v4|qwen3\.8|argon/.test(id)) t.push('Reasoning');
  if (prov === 'groq' || prov === 'cerebras' || /flash|lite|nano|(^|[-/])mini\b|small|lightning|instant|fast|turbo|(^|[-/])[1-9]b\b|e[24]b|a[34]b/.test(id)) t.push('Fast');
  return t.slice(0, 4);
}
const ModelMeta = ({ m, prov }) => {
  const b = benchOf(m), tags = tagsOf(m, prov);
  if (b == null && !tags.length) return null;
  return (
    <span className="mm">
      {b != null && <em className={'mm-b' + (b >= 65 ? ' top' : b >= 50 ? ' good' : '')} title="BenchLM overall score (Oct 2026)">{b >= 65 ? '★ ' : ''}{b.toFixed(1)}</em>}
      {tags.map(x => <i key={x} className={'mm-t ' + x.split(' ')[0].toLowerCase()}>{x}</i>)}
    </span>
  );
};

// model chunne ki sheet: Auto + har provider ka apna khulne wala list (models tabhi aate hain jab khola jaye)
function ModelSheet({ provs, model, exact, pick, close, isDown, isHot }) {
  const [open, setOpen] = useState(model === 'auto' ? '' : model);
  const [lists, setLists] = useState({});
  const [q, setQ] = useState('');
  const need = ids => ids.forEach(id => { if (!lists[id]) getModels(id).then(l => setLists(x => ({ ...x, [id]: l }))); });
  useEffect(() => { need(provs.map(p => p.id)); }, [provs.length]);   // sabke total models ek saath (server 30 min cache karta hai)
  useEffect(() => { if (q.trim()) need(provs.map(p => p.id)); }, [q]);
  useEffect(() => { const k = e => e.key === 'Escape' && close(); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  const term = q.trim().toLowerCase();
  const state = id => isDown(id) ? ['down', 'Unavailable'] : isHot(id) ? ['hot', 'High traffic'] : ['ok', ''];
  return (
    <div className="msheet" role="dialog" aria-label="Choose model">
      <div className="msheet-head">
        <b>Choose a model</b>
        <button type="button" aria-label="Close" onClick={close}><i className="fas fa-times" aria-hidden="true"></i></button>
      </div>
      <label className="msheet-search"><i className="fas fa-search" aria-hidden="true"></i><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search models (llama, deepseek, flash…)" aria-label="Search models" /></label>
      <div className="msheet-list">
        {!term && (
          <button type="button" className={'msheet-auto' + (model === 'auto' ? ' on' : '')} onClick={() => pick('auto')}>
            <i className="fas fa-cog" aria-hidden="true"></i>
            <span><b>{AUTO.name}</b><small className="amc-full">{AUTO.full.split(' ').map((w, k) => <span key={k}><u>{w[0]}</u>{w.slice(1)} </span>)}<em>[ {AUTO.by} ]</em></small><small>{AUTO.tip}</small>{(() => {
              const ids = Object.values(lists).flat(); if (!ids.length) return null;
              const done = provs.length && provs.every(p => lists[p.id]);
              const uniq = new Set(ids.map(normId)).size;
              return <small className="amc-count"><b>{done ? '' : '≈'}{uniq}</b> unique models · {provs.length} providers</small>;
            })()}</span>
            {model === 'auto' && <i className="fas fa-check" aria-hidden="true"></i>}
          </button>
        )}
        {provs.map(p => {
          const all = lists[p.id], [st, stText] = state(p.id);
          const shown = term ? (all || []).filter(m => m.toLowerCase().includes(term) || p.name.toLowerCase().includes(term)) : all;
          if (term && all && !shown.length) return null;
          const isOpen = term ? true : open === p.id;
          return (
            <div key={p.id} className={'msheet-grp' + (isOpen ? ' open' : '') + (model === p.id ? ' cur' : '')}>
              <button type="button" className="msheet-prov" aria-expanded={isOpen} onClick={() => setOpen(isOpen && !term ? '' : p.id)}>
                <i className={'fas fa-' + p.icon} aria-hidden="true"></i>
                <span><b>{p.name}<em className="msheet-cnt">{all ? `${all.length} model${all.length === 1 ? '' : 's'}` : '…'}</em></b><small>{p.tip}{p.keys > 1 ? ` · ${p.keys} keys` : ''}</small></span>
                <i className={'cmp-dot ' + st} title={stText || 'Ready'} aria-label={stText || 'Ready'}></i>
                <i className="fas fa-chevron-down msheet-car" aria-hidden="true"></i>
              </button>
              {isOpen && (
                <div className="msheet-models">
                  {!term && (
                    <button type="button" className={model === p.id && !exact ? 'on' : ''} onClick={() => pick(p.id)}>
                      <span><b>Best {p.name} model</b><small>Auto-selects the best one, switches on limits</small></span>
                      {model === p.id && !exact && <i className="fas fa-check" aria-hidden="true"></i>}
                    </button>
                  )}
                  {!all ? <p className="msheet-wait"><span className="dots"><i></i><i></i><i></i></span> Loading models</p>
                    : (shown || []).map(m => (
                      <button key={m} type="button" className={model === p.id && exact === m ? 'on' : ''} onClick={() => pick(p.id, m)}>
                        <span><b>{short(m)}</b><small>{m}</small><ModelMeta m={m} prov={p.id} /></span>
                        {model === p.id && exact === m && <i className="fas fa-check" aria-hidden="true"></i>}
                      </button>
                    ))}
                </div>
              )}
            </div>
          );
        })}
        {!provs.length && <p className="msheet-wait"><span className="dots"><i></i><i></i><i></i></span> Loading models</p>}
      </div>
    </div>
  );
}

export function Chat({ doc, paper: paperName, page = 0, pages = 0, getImage = () => '', close, startId, assistant }) {
  const isAI = assistant !== undefined;            // dashboard wala AI Assistant (koi ek paper khula nahi)
  const paper = isAI ? 'AI Assistant' : paperName;
  // shuru mein: link se aayi chat, warna is paper ki sabse nayi chat
  const [cid, setCid] = useState(() => { const all = listChats(); const c = all.find(x => x.id === startId) || all.find(x => x.paper === paper); return c ? c.id : ''; });
  const [messages, setMessages] = useState(() => cid ? loadMsgs(cid) : []);   // {role, content, model?, error?, photos?, n?}
  const [hist, setHist] = useState(false);
  const [status, setStatus] = useState({});        // { groq: { busy }, gemini: { busy } ... }
  const [provs, setProvs] = useState([]);          // server par jin providers ki key hai
  const [canWeb, setCanWeb] = useState(false);     // Tavily key hai to Research button
  // research: 'off' (default) | 'web' | 'deep'
  const [web, setWeb] = useState(() => { const v = lsGet('rtuhub_research', 'off'); return v === 'web' || v === 'deep' ? v : 'off'; });
  const [menu, setMenu] = useState('');            // '' | 'research' | 'model' | 'plus' | 'conn' (khula hua popup)
  const [conn, setConn] = useState(CONN_DEFAULT);  // connectors (GitHub / Vercel / YouTube)
  const [oauth, setOauth] = useState({ ready: {} });   // "Authorize" se jude account (sirf naam)
  useEffect(() => { setConn(loadConn()); getOauth().then(setOauth); if (/[?&]connected=/.test(location.search)) setMenu('conn'); }, []);
  const connOn = c => !!(conn[c.id] && conn[c.id].on && (!c.token || c.optional || conn[c.id].token || (oauth && oauth[c.id])));
  const toggleConn = c => {
    if (!c.token || c.optional || conn[c.id].token || (oauth && oauth[c.id])) { const n = { ...conn, [c.id]: { ...(conn[c.id] || {}), on: !connOn(c) } }; setConn(n); saveConn(n); }
    else setMenu('conn');   // pehle jodna padega
  };
  const [exact, setExact] = useState(() => lsGet('rtuhub_exact', ''));   // chuna hua model ('' = best apne aap)
  const [hot, setHot] = useState({});              // answer se pata chala busy model -> kab tak
  const [photos, setPhotos] = useState([]);       // attach ki hui photos (data URL), zyada se zyada 3
  const [files, setFiles] = useState([]);         // attach ki hui files: { id, name, size, kind, text, shots, pages, state: 'read'|'ok'|'err', err }
  const [canMic, setCanMic] = useState(false);
  const [away, setAway] = useState(false);          // upar scroll kiya hua: "neeche jao" button
  const [note, setNote] = useState('');           // jawab aane se pehle kya chal raha hai
  const [text, setText] = useState(() => { try { return localStorage.getItem('rtuhub_draft:' + paper) || ''; } catch (e) { return ''; } });   // adhoora likha hua yaad rehta hai
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(-1);
  const [sheet, setSheet] = useState(null);       // answer PDF ke items
  const [read, setRead] = useState({ now: 0, pct: 0, done: 0 });
  const [model, setModel] = useState(chosen);
  useEffect(() => { chosen = model; lsSet('rtuhub_model', model); }, [model]);
  useEffect(() => { lsSet('rtuhub_exact', exact); }, [exact]);
  useEffect(() => { lsSet('rtuhub_research', web === 'off' ? '' : web); }, [web]);
  // research menu: bahar tap / Esc = band
  useEffect(() => {
    if (menu !== 'research' && menu !== 'plus') return;
    const out = e => { if (!e.target.closest || !e.target.closest('.cmp-pop')) setMenu(''); };
    const esc = e => e.key === 'Escape' && setMenu('');
    document.addEventListener('pointerdown', out); addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', out); removeEventListener('keydown', esc); };
  }, [menu]);
  // provider + model ek saath chuno (picker se)
  const pick = (id, m = '') => { setModel(id); setExact(m); setMenu(''); };
  // kaunse providers hain (key wale); chuna hua ab nahi raha to Auto
  useEffect(() => { getCaps().then(c => { const ps = Array.isArray(c.providers) ? c.providers : []; setProvs(ps); setCanWeb(!!c.research); if (ps.length && model !== 'auto' && !ps.some(p => p.id === model)) { setModel('auto'); setExact(''); } }); }, []);
  const log = useRef(null), stop = useRef(null), fileEl = useRef(null);
  const jobs = useRef({});                        // page -> promise(text)
  const hint = useTyped(isAI ? AI_HINTS : HINTS, !text);

  // ek page padhna (ek baar); chat khulte hi sirf wahi page jis par student hai
  const pageText = n => jobs.current[n] || (jobs.current[n] = (jobs.current.chain || Promise.resolve()).then(() => {
    setRead(r => ({ ...r, now: n, pct: 0 }));
    return readPage(doc, paper, n, p => setRead(r => ({ ...r, pct: p })));
  }).catch(() => '').then(t => { setRead(r => ({ ...r, done: r.done + 1, now: 0 })); return t; }));
  const readOne = n => (jobs.current.chain = pageText(n));
  const peek = n => readPage(doc, paper, n, null, false).catch(() => '');   // turant: sirf PDF ka text, OCR nahi
  useEffect(() => { if (doc) peek(page); }, [page]);

  useEffect(() => { const el = log.current; if (el) el.scrollTop = el.scrollHeight; }, [messages, note]);
  useEffect(() => () => stop.current && stop.current.abort(), []);
  useEffect(() => { try { text ? localStorage.setItem('rtuhub_draft:' + paper, text) : localStorage.removeItem('rtuhub_draft:' + paper); } catch (e) {} }, [text]);
  // har jawab ke baad chat save (pehla sawaal aate hi nayi chat banti hai)
  useEffect(() => {
    if (busy || !messages.some(m => m.content && !m.error)) return;
    const id = cid || newId();
    if (!cid) setCid(id);
    storeChat(id, { paper, url: location.pathname }, messages);
  }, [messages, busy]);
  // model ka haal: khulte hi, har jawab ke baad, aur har 45 s
  useEffect(() => { let alive = true; const go = () => { if (!document.hidden) getStatus().then(s => alive && setStatus(s)); }; go(); const t = setInterval(go, 60000); return () => { alive = false; clearInterval(t); }; }, []);
  useEffect(() => { if (!busy) getStatus().then(setStatus); }, [busy]);

  // paper wale chat ka sawaal: general (linked list ka program) ho to paper nahi bhejte
  const gather = (q, photos = true) => isAI ? assistantGather(q, assistant, setNote) : refersPaper(q) ? findQuestion({ doc, paper, page, pages, q, photos, read: readOne, peek, note: setNote }) : Promise.resolve({ text: '', general: true });

  // laptop par screenshot copy -> Ctrl+V: photo seedha attach (drag & drop bhi)
  const onPaste = e => {
    const list = [...((e.clipboardData && e.clipboardData.items) || [])].filter(it => it.kind === 'file').map(it => it.getAsFile()).filter(Boolean);
    if (list.length) { e.preventDefault(); addAny(list); }
  };
  const onDrop = e => {
    const list = [...((e.dataTransfer && e.dataTransfer.files) || [])];
    if (list.length) { e.preventDefault(); addAny(list); }
  };
  // photo -> photos, baaki (PDF, Word, PPT, code, text) -> files (text phone par hi nikalta hai)
  function addAny(list) {
    const arr = [...list], imgs = arr.filter(isImage), docs = arr.filter(f => !isImage(f));
    if (imgs.length) addPhotos(imgs);
    const room = Math.max(0, 5 - files.length);
    for (const f of docs.slice(0, room)) {
      const id = Math.random().toString(36).slice(2);
      setFiles(fs => [...fs, { id, name: f.name || 'file', size: f.size, kind: kindOf(f.name || ''), state: 'read', pct: 0 }]);
      const set = v => setFiles(fs => fs.map(x => x.id === id ? { ...x, ...v } : x));
      fileToText(f, pct => set({ pct }))
        .then(r => set({ state: 'ok', text: String(r.text || '').slice(0, 60000), shots: r.shots || [], pages: r.pages || 0, cut: String(r.text || '').length > 60000 }))
        .catch(e => set({ state: 'err', err: e.message || 'File padh nahi paya' }));
    }
  }
  // ===== MIC (voice typing) =====
  // 1. Groq Whisper (server): record -> Done -> text. Har browser, Hindi / Hinglish / English, sabse sahi.
  // 2. Key na ho to browser ki apni voice typing (sirf final words jodte hain; Android par words repeat nahi hote).
  const [voice, setVoice] = useState(null);         // null | { phase: 'rec' | 'busy', secs }
  const [lang, setLang] = useState(() => lsGet('rtuhub_voice_lang', '') || 'auto');   // auto (Hinglish) | en | hi
  const [level, setLevel] = useState([]);           // awaaz ki lehar (bars)
  const vr = useRef({});
  useEffect(() => {
    setCanMic(!!((navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder) || window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => stopVoice(false);
  }, []);
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; lsSet('rtuhub_voice_lang', lang === 'auto' ? '' : lang); }, [lang]);
  const LANGS = { auto: 'Hinglish', en: 'English', hi: 'हिंदी' };
  const nextLang = () => setLang(l => l === 'auto' ? 'en' : l === 'en' ? 'hi' : 'auto');
  const addText = t => { if (t) setText(x => (x ? x.replace(/\s*$/, ' ') : '') + t); };

  async function toggleMic() {
    if (voice) { stopVoice(true); return; }
    const stt = (await getCaps()).stt && navigator.mediaDevices && window.MediaRecorder;
    if (stt) return startRecording();
    startBrowserSpeech();
  }
  async function startRecording() {
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch (e) { alertMic(); return; }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
    const rec2 = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
    const chunks = [];
    rec2.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec2.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const v = vr.current; vr.current = {};
      if (v.ctx) v.ctx.close().catch(() => {});
      clearInterval(v.timer); cancelAnimationFrame(v.raf);
      if (!v.send || !chunks.length) { setVoice(null); setLevel([]); return; }
      setVoice({ phase: 'busy', secs: 0 }); setLevel([]);
      try {
        const blob = new Blob(chunks, { type: rec2.mimeType || mime || 'audio/webm' });
        const data = await new Promise((ok, bad) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = bad; fr.readAsDataURL(blob); });
        await ensureSession();
        const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ transcribe: data, lang: langRef.current === 'auto' ? '' : langRef.current }) });
        const j = await r.json().catch(() => ({}));
        if (r.ok) addText(j.text); else setNote(j.message || 'Voice samajh nahi aayi');
      } catch (e) { setNote('Voice bhej nahi paya'); }
      setVoice(null);
      setTimeout(() => setNote(''), 3000);
    };
    // awaaz ki lehar (visualizer)
    let ctx = null, raf = 0;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const an = ctx.createAnalyser(); an.fftSize = 64;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const draw = () => { an.getByteFrequencyData(buf); setLevel(Array.from(buf.slice(2, 22), x => Math.max(0.12, x / 255))); vr.current.raf = raf = requestAnimationFrame(draw); };
      draw();
    } catch (e) {}
    const t0 = Date.now();
    const timer = setInterval(() => { const secs = Math.floor((Date.now() - t0) / 1000); setVoice(v => v && v.phase === 'rec' ? { ...v, secs } : v); if (secs >= 180) stopVoice(true); }, 250);
    vr.current = { rec: rec2, ctx, timer, raf, send: false };
    rec2.start(500);
    setVoice({ phase: 'rec', secs: 0 });
  }
  function stopVoice(send) {
    const v = vr.current;
    if (v.rec && v.rec.state !== 'inactive') { v.send = send; v.rec.stop(); return; }
    if (v.sr) { v.keep = false; try { send ? v.sr.stop() : v.sr.abort(); } catch (e) {} }
  }
  function startBrowserSpeech() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alertMic(); return; }
    const base = text ? text.replace(/\s*$/, ' ') : '';
    let finals = '';
    const st = vr.current = { keep: true };
    const run = () => {
      const r = new SR();
      r.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
      r.continuous = false; r.interimResults = true; r.maxAlternatives = 1;   // Android par continuous mode words dohrata hai
      r.onresult = e => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript.trim();
          if (e.results[i].isFinal) finals += (finals ? ' ' : '') + t; else interim = t;
        }
        setText(base + finals + (interim ? ' ' + interim : ''));
      };
      r.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { st.keep = false; alertMic(); } };
      r.onend = () => { if (st.keep && vr.current === st) { try { run(); } catch (e) { st.keep = false; } } else { vr.current = {}; setVoice(null); } };
      st.sr = r;
      try { r.start(); } catch (e) { st.keep = false; setVoice(null); }
    };
    run();
    const t0 = Date.now();
    st.timer = setInterval(() => { if (!st.keep) return clearInterval(st.timer); setVoice(v => v ? { ...v, secs: Math.floor((Date.now() - t0) / 1000) } : v); }, 500);
    setVoice({ phase: 'rec', secs: 0, live: true });
  }
  const [micErr, setMicErr] = useState(false);
  const alertMic = () => { setMicErr(true); setTimeout(() => setMicErr(false), 4000); };
  async function addPhotos(files) {
    const list = [...files].filter(f => f.type.startsWith('image/')).slice(0, 3 - photos.length);
    const done = [];
    for (const f of list) { try { done.push(await shrink(f)); } catch (e) {} }
    if (done.length) setPhotos(p => [...p, ...done].slice(0, 3));
  }

  // chalu connectors (+ unke token) — kuch chalu nahi to kuch nahi bhejte
  const connBody = () => {
    const on = CONNECTORS.filter(connOn).map(c => c.id);
    if (!on.length) return undefined;
    const b = { on };
    for (const c of CONNECTORS) if (c.token && conn[c.id] && conn[c.id].token && on.includes(c.id)) b[c.id] = conn[c.id].token;
    return b;
  };
  async function ask(question, base) {   // base: retry ke liye pichhli baat-cheet (aakhri sawaal-jawab ke bina)
    if (voice) stopVoice(false);
    const docs = files.filter(f => f.state === 'ok');
    if (files.some(f => f.state === 'read')) return;                       // file abhi padhi ja rahi hai
    const sent = [...photos, ...docs.flatMap(f => f.shots || [])].slice(0, 3);   // scan PDF ke page bhi photo ki tarah
    const q = (question || text).trim() || (docs.length ? 'Is file ko samjhao: short summary aur important points do' : sent.length ? 'Is photo ke sawaal solve karo' : '');
    if (!q || busy) return;
    setText(''); setPhotos([]); setFiles([]);
    const fileText = docs.filter(f => f.text).map(f => `[File: ${f.name}${f.pages ? `, ${f.pages} ${f.kind === 'powerpoint' ? 'slides' : 'pages'}` : ''}${f.cut ? ', shortened' : ''}]\n${f.text}`).join('\n\n');
    const history = [...(base || messages).filter(m => m.content && !m.error), { role: 'user', content: q, photos: photos, files: docs.map(f => ({ name: f.name, kind: f.kind })) }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setBusy(true);
    const patch = fn => setMessages(ms => ms.map((m, i) => i === ms.length - 1 ? fn(m) : m));
    try {
      await ensureSession();
      let got = (sent.length || fileText) && !wanted(q).no ? { text: '', general: !!fileText } : await gather(q);
      let paperText = got.text;
      const ctl = stop.current = new AbortController();
      // attach ki hui photos: server par vision model ho to wahi padhe, warna phone par OCR
      let images = [], attachText = '';
      const vision = sent.length ? (await getCaps()).vision : false;
      if (sent.length && vision) images = sent;
      const ocrPhotos = async () => {
        const out = [];
        for (let i = 0; i < sent.length; i++) {
          setNote(`Photo ${i + 1} padh raha hu`);
          const t = await imageToText(sent[i], null, p => setNote(`Photo ${i + 1} padh raha hu (${Math.round(p * 100)}%)`)).catch(() => '');
          if (t.trim()) out.push(`[Photo ${i + 1}]\n${t.trim()}`);
        }
        return out.join('\n\n');
      };
      if (sent.length && !vision) attachText = await ocrPhotos();
      if (fileText) attachText = [fileText, attachText].filter(Boolean).join('\n\n');
      const doWeb = web !== 'off' ? web : '';
      setNote(doWeb === 'deep' ? 'Deep research: web ke kai sources padh raha hu' : doWeb ? 'Web par research kar raha hu' : got.shots ? `Page ${got.nos.join(' + ')} dekh kar jawab bana raha hu` : sent.length && vision ? 'Photo padh raha hu' : 'Soch raha hu');
      let res;
      for (let attempt = 1; ; attempt++) {
        res = await fetch('/api/ai', {
          method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ paper: got.target ? got.target.title : paper, page, pages, paperText, attachText, images, model: model === 'auto' ? '' : model, exact: model === 'auto' ? undefined : exact || undefined, research: doWeb === 'deep' ? 'deep' : doWeb ? true : undefined, connectors: connBody(), cache: sent.length ? null : got.cache, pid: got.target ? got.target.url : location.pathname,
            assistant: isAI || undefined, catalog: isAI ? assistantCatalog(assistant) : undefined, general: got.general || undefined, opened: got.target ? `${got.target.title} (${got.target.url})` : undefined,
            pageImages: got.shots && !sent.length ? got.shots : undefined, pageNos: got.nos,
            image: isAI || got.general || paperText.length > 150 || sent.length || got.shots ? '' : getImage(), messages: history.slice(-8).map(m => ({ role: m.role, content: m.content })) })
        });
        if (res.ok && res.body) break;
        const info = await res.json().catch(() => ({}));
        if (info.busy) setHot(h => { const n = { ...h }; for (const id of String(info.busy).split(',')) if (id) n[id] = Date.now() + 90000; return n; });
        if (res.status === 422 && got.shots) { got = await gather(q, false); paperText = got.text; continue; }      // photo dekhne wala model nahi: purana raasta (page padh kar)
        if (res.status === 422 && images.length) { images = []; attachText = [fileText, await ocrPhotos()].filter(Boolean).join('\n\n'); continue; }       // server photo nahi padh paya: phone par padho
        if ((res.status === 503 || res.status === 502 || res.status === 504) && attempt < 3) {                       // AI busy: khud dobara try
          setNote(`AI busy hai, dobara try kar raha hu (${attempt + 1}/3)`);
          await new Promise(done => setTimeout(done, attempt * 2500));
          continue;
        }
        const why = Array.isArray(info.tried) && info.tried.length ? ` [${info.tried.slice(-3).join(', ')}]` : '';
        throw new Error((info.message || (res.status === 401 || res.status === 403 ? 'Page reload karke dobara pooch.' : 'AI abhi available nahi hai. Ek minute baad dobara pooch.')) + why);
      }
      setNote('');
      const hotNow = res.headers.get('x-ai-busy');
      if (hotNow) setHot(h => { const n = { ...h }; for (const id of hotNow.split(',')) if (id) n[id] = Date.now() + 90000; return n; });
      const by = res.headers.get('x-ai-reader');
      const ai = (res.headers.get('x-ai') || '').split(' ');
      const found = readWeb(res), webErr = res.headers.get('x-ai-web-err');
      let used = null;
      try { const h = res.headers.get('x-ai-conn'); if (h) { const bin = atob(h), by = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) by[k] = bin.charCodeAt(k); used = JSON.parse(new TextDecoder().decode(by)); } } catch (e) {}
      const provId = res.headers.get('x-ai-prov'), mdl = res.headers.get('x-ai-model');
      const provName = (provs.find(p => p.id === provId) || {}).name || ai[0];
      const fb = res.headers.get('x-ai-fallback');
      if (fb && model !== 'auto') {   // chuna hua model nahi chala: saaf batao, aur AMC par shift (agle sawaal phir na atke)
        const want = ((provs.find(p => p.id === model) || {}).name || model) + (exact ? ' · ' + short(exact) : '');
        const why = { limit: 'free limit is used up for now', key: 'its API key is not working', unavailable: 'this model is not available on your key', busy: 'the server is overloaded' }[fb] || 'it is busy';
        patch(m => ({ ...m, fallback: { want, why, used: provName + (mdl ? ' · ' + short(mdl) : '') } }));
        setModel('auto'); setExact('');
      }
      const label = (by ? by.split(' ')[0] + ' + ' : '') + provName + (mdl ? ' · ' + short(mdl) : ai[1] ? ' · ' + ai[1].split('/').pop() : '') + (res.headers.get('x-ai-cache') ? ' · saved' : '') + (got.target ? ' · ' + got.target.title : '')   // reader + solver + model (+ kaunsa paper khola)
        + (found && found.s.length ? ` · ${found.d ? 'Deep research' : 'Research'} · ${found.s.length} sources` : webErr ? ' · web research nahi ho payi' : '');
      if (found || used) patch(m => ({ ...m, ...(found ? { web: found } : {}), ...(used ? { conn: used } : {}) }));
      const reader = res.body.getReader(), dec = new TextDecoder();
      let answer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += dec.decode(value, { stream: true });
        patch(m => ({ ...m, content: answer, model: label, ...(found ? { web: found } : {}), ...(used ? { conn: used } : {}) }));
      }
      if (!answer.trim()) throw new Error('Jawab nahi aaya. Dobara pooch.');
    } catch (e) {
      if (e.name !== 'AbortError') patch(m => m.content ? m : { ...m, content: e.message || 'Kuch gadbad ho gayi. Dobara pooch.', error: true });
    }
    setBusy(false); setNote('');
  }

  const copy = (i, content) => {
    const done = () => { setCopied(i); setTimeout(() => setCopied(-1), 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(plainMath(content)).then(done, () => {}); else done();
  };
  // [{q, a}] : har jawab apne sawaal ke saath
  const pairs = from => { const out = []; from.forEach((m, i) => { if (m.role === 'assistant' && m.content && !m.error) out.push({ q: (from[i - 1] && from[i - 1].role === 'user' ? from[i - 1].content : 'Question'), a: m.content }); }); return out; };
  const newChat = () => { if (stop.current) stop.current.abort(); setBusy(false); setNote(''); setMessages([]); setPhotos([]); setCid(''); setHist(false); };
  // history se chat kholna: isi paper ki ho to yahin, doosre paper ki ho to wo paper khol kar
  const openChat = c => {
    if (!c) { newChat(); return; }
    if (c.paper !== paper) { if (c.url) location.href = c.url + '?chat=' + encodeURIComponent(c.id); return; }
    if (stop.current) stop.current.abort();
    setBusy(false); setNote(''); setPhotos([]); setCid(c.id); setMessages(loadMsgs(c.id)); setHist(false);
  };
  const isDown = id => !!(status[id] && status[id].down);                                   // saari keys band (block / galat key)
  const isHot = id => !isDown(id) && ((status[id] && status[id].busy) || (hot[id] || 0) > Date.now());
  const answered = messages.some(m => m.role === 'assistant' && m.content && !m.error);

  return (
    <section className={'chat' + (isAI ? ' full' : '')} id="aiChat" aria-label="RTU Hub AI chat" onDragOver={e => e.preventDefault()} onDrop={onDrop}>
      <header className="chat-head">
        <span className="chat-orb" aria-hidden="true"></span>
        <div className="chat-name"><b>{isAI ? 'AI Assistant' : 'RTU Hub AI'}</b>
          <small id="aiRead">{isAI ? <><i className="fas fa-shield-alt" aria-hidden="true"></i> PYQ, syllabus, code, doubts</> : read.now
            ? <><i className="fas fa-circle-notch fa-spin" aria-hidden="true"></i> Reading page {read.now}{read.pct > 0 && read.pct < 1 ? ` ${Math.round(read.pct * 100)}%` : ''}</>
            : <><i className="fas fa-check" aria-hidden="true"></i> Page {page} ready</>}</small>
        </div>
        <span className="chat-pair">
          <button id="aiNew" className="chat-new" aria-label="New chat" disabled={!messages.length} onClick={newChat}><i className="fas fa-plus" aria-hidden="true"></i> New</button>
          <button id="aiHistBtn" className={'chat-histbtn' + (hist ? ' on' : '')} aria-label="Chat history" title="Chat history" aria-expanded={hist} onClick={() => setHist(!hist)}><i className="fas fa-history" aria-hidden="true"></i></button>
        </span>
        <button id="aiPdfAll" aria-label="All answers as PDF" title="All answers as PDF" disabled={!answered} onClick={() => setSheet(pairs(messages))}><i className="fas fa-file-pdf" aria-hidden="true"></i></button>
        <button aria-label={isAI ? 'Back' : 'Close chat'} onClick={close}><i className={'fas fa-' + (isAI ? 'times' : 'chevron-down')} aria-hidden="true"></i></button>
      </header>

      <div className="chat-log" ref={log} onScroll={e => { const el = e.currentTarget; setAway(el.scrollHeight - el.scrollTop - el.clientHeight > 240); }}>
        {!messages.length && (
          <div className="chat-hello">
            {isAI
              ? <div className="hero">
                  <span className="hero-orb" aria-hidden="true"></span>
                  <h2>Kya padhna hai aaj?</h2>
                  <p>PYQ solve, syllabus, programs, concepts — kuch bhi poochho. Paper ka naam bologe to wo khol kar answer dunga.</p>
                </div>
              : <p>Bhai, paper mere saamne hai. Bas bol <b>“Q8 ka answer do”</b> ya <b>“Part A question 1”</b>, marks ke hisaab se answer milega. Paper se bahar ka sawaal (jaise <b>program</b> ya koi concept) bhi pooch sakta hai.</p>}
            {isAI
              ? <div className="sugg">{aiChips(assistant).map((c, k) => (
                  <button key={c} type="button" onClick={() => ask(c)}>
                    <i className={'fas fa-' + ['file-alt', 'code', 'book-open', 'list-ul'][k]} aria-hidden="true"></i>
                    <span><b>{['Solve a PYQ', 'Write a program', 'Syllabus', 'My papers'][k]}</b><small>{c}</small></span>
                  </button>))}
                </div>
              : <div className="chat-chips">{CHIPS.map(c => <button key={c} onClick={() => ask(c)}>{c}</button>)}</div>}
          </div>
        )}
        {messages.map((m, i) => m.role === 'user'
          ? (
            <div key={i} className="me-wrap">
              <div className="msg me">
                {m.photos && m.photos.length > 0 && <span className="msg-photos">{m.photos.map((p, j) => <img key={j} src={p} alt={'Attached photo ' + (j + 1)} />)}</span>}
                {!m.photos && m.n > 0 && <em className="msg-had">{m.n} photo</em>}
                {m.files && m.files.length > 0 && <span className="msg-files">{m.files.map((f, j) => <span key={j}><i className={'fas fa-file-' + (f.kind === 'pdf' ? 'pdf' : f.kind) } aria-hidden="true"></i>{f.name}</span>)}</span>}
                {m.content}
              </div>
              {/* DeepSeek jaisa: apne sawaal ke neeche copy */}
              {m.content && (
                <button className="me-copy" aria-label="Copy your question" title="Copy" onClick={() => copy(i, m.content)}>
                  <i className={'fas fa-' + (copied === i ? 'check' : 'copy')} aria-hidden="true"></i>{copied === i ? ' Copied' : ''}
                </button>
              )}
            </div>
          ) : (
            <div key={i} className={'msg ai' + (m.error ? ' err' : '')}>
              <div className="ai-by"><span className="ai-dot" aria-hidden="true"></span><b>RTU Hub AI</b>{m.model && <small>{m.model}</small>}</div>
              {m.content ? <Markdown text={m.content} /> : <span className="dots"><i></i><i></i><i></i><em>{note || (read.now > 0 ? `Page ${read.now} padh raha hu${read.pct > 0 && read.pct < 1 ? ` (${Math.round(read.pct * 100)}%)` : ''}` : '')}</em></span>}
              {busy && i === messages.length - 1 && m.content && <span className="caret">▌</span>}
              {m.fallback && <div className="fb-note" role="note"><i className="fas fa-exchange-alt" aria-hidden="true"></i><span><b>{m.fallback.want}</b> could not answer — {m.fallback.why}. Answered by <b>{m.fallback.used}</b>; model switched to {AUTO.name}.</span></div>}
              {m.conn && <ConnBits list={m.conn} />}
              {m.web && <WebBits web={m.web} />}
              {m.content && !m.error && !(busy && i === messages.length - 1) && (
                <div className="msg-tools">
                  <button onClick={() => copy(i, m.content)} title="Copy answer"><i className={'fas fa-' + (copied === i ? 'check' : 'copy')} aria-hidden="true"></i> {copied === i ? 'Copied' : 'Copy'}</button>
                  <button className="msg-pdf" onClick={() => setSheet(pairs(messages.slice(Math.max(0, i - 1), i + 1)))} title="Save as PDF or share"><i className="fas fa-file-pdf" aria-hidden="true"></i> PDF / Share</button>
                  {i === messages.length - 1 && <button onClick={() => { const k = messages.slice(0, i).map(x => x.role).lastIndexOf('user'); if (k >= 0) ask(messages[k].content, messages.slice(0, k)); }} title="Ask again"><i className="fas fa-redo" aria-hidden="true"></i> Retry</button>}
                </div>
              )}
            </div>
          ))}
      </div>

      {away && <button type="button" className="to-end" aria-label="Scroll to latest" onClick={() => { const el = log.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }}><i className="fas fa-arrow-down" aria-hidden="true"></i></button>}
      {/* DeepSeek jaisa composer: upar likho, neeche ek line mein Research + Model + attach + send (side scroll nahi) */}
      <form className="cmp" onSubmit={e => { e.preventDefault(); ask(); }}>
        {(photos.length > 0 || files.length > 0) && (
          <div className="cmp-att" id="aiPhotos">
            {photos.map((p, i) => (
              <span key={'p' + i} className="cmp-thumb"><img src={p} alt={'Photo ' + (i + 1)} />
                <button type="button" aria-label={'Remove photo ' + (i + 1)} onClick={() => setPhotos(photos.filter((_, j) => j !== i))}><i className="fas fa-times" aria-hidden="true"></i></button></span>
            ))}
            {files.map(f => (
              <span key={f.id} className={'cmp-file ' + f.state} title={f.err || f.name}>
                <i className={'fas fa-' + (f.state === 'read' ? 'circle-notch fa-spin' : f.state === 'err' ? 'exclamation-triangle' : 'file-' + (f.kind === 'pdf' ? 'pdf' : f.kind))} aria-hidden="true"></i>
                <span><b>{f.name}</b><small>{f.state === 'read' ? `Reading${f.pct ? ' ' + Math.round(f.pct * 100) + '%' : '…'}` : f.state === 'err' ? f.err : [f.kind === 'alt' ? 'File' : f.kind.toUpperCase(), sizeOf(f.size), f.pages ? f.pages + (f.kind === 'powerpoint' ? ' slides' : ' pages') : '', f.shots && f.shots.length ? 'scanned' : ''].filter(Boolean).join(' · ')}</small></span>
                <button type="button" aria-label={'Remove ' + f.name} onClick={() => setFiles(fs => fs.filter(x => x.id !== f.id))}><i className="fas fa-times" aria-hidden="true"></i></button>
              </span>
            ))}
          </div>
        )}
        <textarea id="aiInput" rows="1" value={text} placeholder={voice ? (voice.phase === 'busy' ? 'Text bana raha hu…' : 'Bolo… phir ✓ dabao') : hint + '▌'} aria-label="Your question"
          onChange={e => setText(e.target.value)} onPaste={onPaste}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}></textarea>
        {voice && (
          <div className={'vbar ' + voice.phase} role="status" aria-live="polite">
            {voice.phase === 'busy'
              ? <><i className="fas fa-circle-notch fa-spin" aria-hidden="true"></i><span className="vbar-t">Transcribing…</span></>
              : <>
                  <button type="button" className="vbar-x" aria-label="Cancel recording" onClick={() => stopVoice(false)}><i className="fas fa-times" aria-hidden="true"></i></button>
                  <span className="vbar-dot" aria-hidden="true"></span>
                  <span className="vbar-time">{Math.floor(voice.secs / 60)}:{String(voice.secs % 60).padStart(2, '0')}</span>
                  <span className="vbar-wave" aria-hidden="true">{(level.length ? level : Array.from({ length: 20 }, (_, k) => 0.15 + 0.12 * Math.abs(Math.sin((voice.secs * 4 + k) / 2)))).map((h, k) => <i key={k} style={{ height: Math.round(4 + h * 22) + 'px' }}></i>)}</span>
                  <button type="button" className="vbar-lang" onClick={nextLang} title="Language">{LANGS[lang] || 'Hinglish'}</button>
                  <button type="button" className="vbar-ok" aria-label="Done" onClick={() => stopVoice(true)}><i className="fas fa-check" aria-hidden="true"></i></button>
                </>}
          </div>
        )}
        <div className={'cmp-bar' + (voice ? ' hide' : '')}>
          <div className="cmp-pop static">
            <button type="button" id="aiWeb" className={'cmp-pill' + (web !== 'off' ? ' on' : '')} aria-haspopup="menu" aria-expanded={menu === 'research'} disabled={busy}
              onClick={() => setMenu(menu === 'research' ? '' : 'research')}>
              <Globe />
              <span>{web === 'deep' ? <><b className="cmp-full">Deep research</b><b className="cmp-mini">Deep</b></> : 'Research'}</span>
              <i className="fas fa-chevron-down cmp-caret" aria-hidden="true"></i>
            </button>
            {menu === 'research' && (
              <div className="cmp-menu" role="menu" aria-label="Research">
                <p className="cmp-menu-h">Research</p>
                {[['off', 'ban', 'Off', 'Answer from the AI only (default)'], ['web', 'globe', 'Research', 'Web search with sources and images'], ['deep', 'layer-group', 'Deep research', 'More sources, a full structured report']].map(([id, icon, name, tip]) => (
                  <button key={id} type="button" role="menuitemradio" aria-checked={web === id} className={web === id ? 'on' : ''} disabled={id !== 'off' && !canWeb}
                    onClick={() => { setWeb(id); setMenu(''); }}>
                    <i className={'fas fa-' + icon} aria-hidden="true"></i>
                    <span><b>{name}</b><small>{id !== 'off' && !canWeb ? 'Unavailable right now' : tip}</small></span>
                    {web === id && <i className="fas fa-check cmp-tick" aria-hidden="true"></i>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="cmp-pop">
            <button type="button" id="aiModelBtn" className="cmp-pill model" aria-haspopup="dialog" aria-expanded={menu === 'model'} disabled={busy}
              onClick={() => setMenu(menu === 'model' ? '' : 'model')} title="Choose a model">
              {model !== 'auto' && <i className={'fas fa-' + ((provs.find(p => p.id === model) || AUTO).icon)} aria-hidden="true"></i>}
              <span>{model === 'auto' ? AUTO.name : (provs.find(p => p.id === model) || { name: model }).name}{exact ? <em> · {short(exact)}</em> : ''}</span>
              {model !== 'auto' && (isDown(model) || isHot(model)) && <i className={'cmp-dot' + (isDown(model) ? ' down' : ' hot')} aria-hidden="true"></i>}
              <i className="fas fa-chevron-down cmp-caret" aria-hidden="true"></i>
            </button>
          </div>
          <span className="cmp-gap"></span>
          <div className="cmp-pop static">
            <button type="button" className={'cmp-icon' + (menu === 'plus' ? ' open' : '')} id="aiAttach" aria-label="Add files or connectors" aria-haspopup="menu" aria-expanded={menu === 'plus'} title="Add files, photos or connectors" disabled={busy} onClick={() => setMenu(menu === 'plus' ? '' : 'plus')}><i className="fas fa-plus" aria-hidden="true"></i></button>
            {menu === 'plus' && (
              <div className="cmp-menu plus" role="menu" aria-label="Add">
                <button type="button" role="menuitem" className="pm-item" disabled={photos.length >= 3 && files.length >= 5} onClick={() => { setMenu(''); fileEl.current.click(); }}>
                  <i className="fas fa-paperclip" aria-hidden="true"></i>
                  <span><b>Add photos & files</b><small>PDF · Word · PPT · code · images</small></span>
                  <kbd>Ctrl V</kbd>
                </button>
                <p className="cmp-menu-h">Connectors</p>
                {CONNECTORS.map(c => {
                  const who = (oauth && oauth[c.id] && oauth[c.id].name) || (conn[c.id] && conn[c.id].token && conn[c.id].name);
                  return (
                    <div key={c.id} className={'pm-conn' + (connOn(c) ? ' on' : '')}>
                      <i className={'conn-ic sm ' + c.id + ' ' + c.icon} aria-hidden="true"></i>
                      <span><b>{c.name}</b><small>{who ? 'Connected · ' + who : c.token && !c.optional ? 'Not connected' : 'Public links'}</small></span>
                      <button type="button" role="switch" aria-checked={connOn(c)} aria-label={'Use ' + c.name} className="conn-sw" onClick={() => toggleConn(c)}><i></i></button>
                    </div>
                  );
                })}
                <button type="button" role="menuitem" className="pm-manage" onClick={() => setMenu('conn')}><i className="fas fa-sliders-h" aria-hidden="true"></i> Manage connectors<i className="fas fa-chevron-right" aria-hidden="true"></i></button>
              </div>
            )}
          </div>
          <input ref={fileEl} id="aiFile" type="file" accept={FILE_ACCEPT} multiple hidden onChange={e => { addAny(e.target.files); e.target.value = ''; }} />
          {canMic && <button type="button" className={'cmp-icon mic' + (micErr ? ' err' : '')} id="aiMic" aria-label="Voice typing" title={micErr ? 'Mic ki permission do (browser settings)' : 'Bol kar likho'} disabled={busy || !!voice} onClick={toggleMic}><i className="fas fa-microphone" aria-hidden="true"></i></button>}
          {busy
            ? <button type="button" className="cmp-send stop" aria-label="Stop" onClick={() => { stop.current && stop.current.abort(); setBusy(false); }}><i className="fas fa-stop" aria-hidden="true"></i></button>
            : <button type="submit" className="cmp-send" aria-label="Send" disabled={(!text.trim() && !photos.length && !files.some(f => f.state === 'ok')) || files.some(f => f.state === 'read')}><i className="fas fa-arrow-up" aria-hidden="true"></i></button>}
        </div>
      </form>
      {menu === 'conn' && createPortal(<><div className="msheet-scrim" onClick={() => setMenu('')}></div><ConnectorSheet conn={conn} setConn={setConn} oauth={oauth} setOauth={setOauth} close={() => setMenu('')} /></>, document.body)}
      {menu === 'model' && createPortal(<><div className="msheet-scrim" onClick={() => setMenu('')}></div><ModelSheet provs={provs} model={model} exact={exact} pick={pick} close={() => setMenu('')} isDown={isDown} isHot={isHot} /></>, document.body)}
      {hist && <History paper={paper} cid={cid} open={openChat} close={() => setHist(false)} />}
      {sheet && <AnswerPdf title={paper} items={sheet} close={() => setSheet(null)} />}
    </section>
  );
}
