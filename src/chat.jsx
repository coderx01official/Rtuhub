// =====================================================================
//  RTU HUB AI — paper viewer ke neeche khulne wala chatbot.
//  Sirf zaroori page padha jata hai, uska text /api/ai ko jata hai; jawab shabd-shabd aata hai.
//  Scan (photo wala) paper: page padhne (OCR) mein time nahi lagate — page ki photo + sawaal seedha AI ko,
//  wo ek hi baar mein padh kar jawab deta hai (Part A -> page 1-2, Part C -> aakhri 2 page).
//  Har paper ki chat yaad rehti hai. Jawab copy, branded PDF, share, text bada-chhota.
//  Chat history (DeepSeek jaisa): saari chats phone mein, naam badlo, delete karo, date-time ke saath.
//  Neeche model chuno (Groq / Gemini); kisi model ki saari keys limit par hon to us par "High traffic" dikhta hai. Part A ka sawaal pehle page se, Part C ka aakhri page se dhundha jata hai,
//  aur AI ko poora page nahi, sirf wahi ek sawaal bheja jata hai (kam request, kam token, tez jawab).
// =====================================================================
import { useEffect, useRef, useState } from 'react';
import { ensureSession, loadDoc } from './viewer.jsx';
import { YEARS, pyqSubjects, paperSlug, dashPath, nice } from './data.js';
import { loadSyllabus, sylFileUrl, findSyllabusFor } from './syllabus.js';
import { buildAnswerPdf } from './answerpdf.js';
import { loadKatex, splitMath, texToText, plainMath } from './tex.js';

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
// student ka chuna hua model (Groq / Gemini) — photo padhne mein bhi wahi pehle
export const MODELS = [{ id: 'groq', name: 'Groq', tip: 'Fast', icon: 'bolt' }, { id: 'gemini', name: 'Gemini', tip: 'Maths + photo', icon: 'gem' }];
let chosen = (() => { try { const v = localStorage.getItem('rtuhub_model'); return MODELS.some(m => m.id === v) ? v : 'groq'; } catch (e) { return 'groq'; } })();
const getCaps = () => caps || (caps = fetch('/api/ai?caps=1').then(r => r.json()).catch(() => ({ vision: false })));
// har model ka abhi ka haal (koi AI call nahi): { groq: { keys, busy }, gemini: {...} }
const getStatus = () => fetch('/api/ai?caps=1', { cache: 'no-store' }).then(r => r.json()).then(j => j.models || {}).catch(() => ({}));

// MODEL 1 (reader): photo -> text. Pehle server ka vision model, wo na ho to phone par OCR.
async function imageToText(dataUrl, canvas, onProgress) {
  if ((await getCaps()).vision) {
    try {
      await ensureSession();
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ read: dataUrl, model: chosen }) });
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
    if (line.trim().startsWith('```')) { if (code) { out.push(<pre key={out.length}>{code.join('\n')}</pre>); code = null; } else { flush(); code = []; } return; }
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
  if (code) out.push(<pre key={out.length}>{code.join('\n')}</pre>);
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
    + `Syllabus: ${base}/syllabus\nOther pages: SGPA calculator /sgpa-calculator, RTU news /news, result and admit card links /links, campus map /map`).slice(0, 6000);
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
  const keep = messages.filter(m => m.content && !m.error).slice(-40).map(m => ({ role: m.role, content: m.content, model: m.model, n: m.photos ? m.photos.length : m.n || 0 }));
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
const SIZES = [0.86, 0.95, 1.06, 1.2, 1.36];

// ---------- jawab ka PDF: site ke andar khulta hai, wahin se share / download ----------
function AnswerPdf({ title, items, close }) {
  const [pdf, setPdf] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { let alive = true; buildAnswerPdf(title, items.map(it => ({ ...it, a: plainMath(it.a) }))).then(p => alive && setPdf(p)).catch(() => alive && setMsg('PDF nahi ban paya. Dobara try karo.')); return () => { alive = false; }; }, []);
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

export function Chat({ doc, paper: paperName, page = 0, pages = 0, getImage = () => '', close, startId, assistant }) {
  const isAI = assistant !== undefined;            // dashboard wala AI Assistant (koi ek paper khula nahi)
  const paper = isAI ? 'AI Assistant' : paperName;
  // shuru mein: link se aayi chat, warna is paper ki sabse nayi chat
  const [cid, setCid] = useState(() => { const all = listChats(); const c = all.find(x => x.id === startId) || all.find(x => x.paper === paper); return c ? c.id : ''; });
  const [messages, setMessages] = useState(() => cid ? loadMsgs(cid) : []);   // {role, content, model?, error?, photos?, n?}
  const [hist, setHist] = useState(false);
  const [status, setStatus] = useState({});        // { groq: { busy }, gemini: { busy } }
  const [hot, setHot] = useState({});              // answer se pata chala busy model -> kab tak
  const [photos, setPhotos] = useState([]);       // attach ki hui photos (data URL), zyada se zyada 3
  const [note, setNote] = useState('');           // jawab aane se pehle kya chal raha hai
  const [text, setText] = useState(() => { try { return localStorage.getItem('rtuhub_draft:' + paper) || ''; } catch (e) { return ''; } });   // adhoora likha hua yaad rehta hai
  const [busy, setBusy] = useState(false);
  const [size, setSize] = useState(1);
  const [copied, setCopied] = useState(-1);
  const [sheet, setSheet] = useState(null);       // answer PDF ke items
  const [read, setRead] = useState({ now: 0, pct: 0, done: 0 });
  const [model, setModel] = useState(chosen);
  useEffect(() => { chosen = model; try { localStorage.setItem('rtuhub_model', model); } catch (e) {} }, [model]);
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
  useEffect(() => { let alive = true; const go = () => getStatus().then(s => alive && setStatus(s)); go(); const t = setInterval(go, 45000); return () => { alive = false; clearInterval(t); }; }, []);
  useEffect(() => { if (!busy) getStatus().then(setStatus); }, [busy]);

  // paper wale chat ka sawaal: general (linked list ka program) ho to paper nahi bhejte
  const gather = (q, photos = true) => isAI ? assistantGather(q, assistant, setNote) : refersPaper(q) ? findQuestion({ doc, paper, page, pages, q, photos, read: readOne, peek, note: setNote }) : Promise.resolve({ text: '', general: true });

  async function addPhotos(files) {
    const list = [...files].filter(f => f.type.startsWith('image/')).slice(0, 3 - photos.length);
    const done = [];
    for (const f of list) { try { done.push(await shrink(f)); } catch (e) {} }
    if (done.length) setPhotos(p => [...p, ...done].slice(0, 3));
  }

  async function ask(question) {
    const sent = photos;
    const q = (question || text).trim() || (sent.length ? 'Is photo ke sawaal solve karo' : '');
    if (!q || busy) return;
    setText(''); setPhotos([]);
    const history = [...messages.filter(m => m.content && !m.error), { role: 'user', content: q, photos: sent }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setBusy(true);
    const patch = fn => setMessages(ms => ms.map((m, i) => i === ms.length - 1 ? fn(m) : m));
    try {
      await ensureSession();
      let got = sent.length && !wanted(q).no ? { text: '' } : await gather(q);
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
      setNote(got.shots ? `Page ${got.nos.join(' + ')} dekh kar jawab bana raha hu` : sent.length && vision ? 'Photo padh raha hu' : 'Soch raha hu');
      let res;
      for (let attempt = 1; ; attempt++) {
        res = await fetch('/api/ai', {
          method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ paper: got.target ? got.target.title : paper, page, pages, paperText, attachText, images, model, cache: sent.length ? null : got.cache, pid: got.target ? got.target.url : location.pathname,
            assistant: isAI || undefined, catalog: isAI ? assistantCatalog(assistant) : undefined, general: got.general || undefined, opened: got.target ? `${got.target.title} (${got.target.url})` : undefined,
            pageImages: got.shots && !sent.length ? got.shots : undefined, pageNos: got.nos,
            image: isAI || got.general || paperText.length > 150 || sent.length || got.shots ? '' : getImage(), messages: history.slice(-8).map(m => ({ role: m.role, content: m.content })) })
        });
        if (res.ok && res.body) break;
        const info = await res.json().catch(() => ({}));
        if (info.busy) setHot(h => { const n = { ...h }; for (const id of String(info.busy).split(',')) if (id) n[id] = Date.now() + 90000; return n; });
        if (res.status === 422 && got.shots) { got = await gather(q, false); paperText = got.text; continue; }      // photo dekhne wala model nahi: purana raasta (page padh kar)
        if (res.status === 422 && images.length) { images = []; attachText = await ocrPhotos(); continue; }       // server photo nahi padh paya: phone par padho
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
      const label = (by ? by.split(' ')[0] + ' + ' : '') + (res.headers.get('x-ai') || '').split(' ')[0] + (res.headers.get('x-ai-cache') ? ' · saved' : '') + (got.target ? ' · ' + got.target.title : '');   // reader + solver (+ kaunsa paper khola)
      const reader = res.body.getReader(), dec = new TextDecoder();
      let answer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += dec.decode(value, { stream: true });
        patch(m => ({ ...m, content: answer, model: label }));
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
  const isHot = id => (status[id] && status[id].busy) || (hot[id] || 0) > Date.now();
  const answered = messages.some(m => m.role === 'assistant' && m.content && !m.error);

  return (
    <section className={'chat' + (isAI ? ' full' : '')} id="aiChat" style={{ '--fz': SIZES[size] + 'rem' }} aria-label="RTU Hub AI chat">
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
        <button aria-label="Text size" title="Text size" onClick={() => setSize((size + 1) % SIZES.length)}>A<sup>a</sup></button>
        <button id="aiPdfAll" aria-label="All answers as PDF" title="All answers as PDF" disabled={!answered} onClick={() => setSheet(pairs(messages))}><i className="fas fa-file-pdf" aria-hidden="true"></i></button>
        <button aria-label={isAI ? 'Back' : 'Close chat'} onClick={close}><i className={'fas fa-' + (isAI ? 'times' : 'chevron-down')} aria-hidden="true"></i></button>
      </header>

      <div className="chat-log" ref={log}>
        {!messages.length && (
          <div className="chat-hello">
            {isAI
              ? <p>Bhai, kuch bhi poochh. <b>“DSA 2024 Part A Q1”</b> bolega to wo paper khol ke answer dunga, <b>“OS syllabus”</b> bolega to syllabus, aur <b>program, concept, doubt</b> kuch bhi normal AI jaisa.</p>
              : <p>Bhai, paper mere saamne hai. Bas bol <b>“Q8 ka answer do”</b> ya <b>“Part A question 1”</b>, marks ke hisaab se answer milega. Paper se bahar ka sawaal (jaise <b>program</b> ya koi concept) bhi pooch sakta hai.</p>}
            <div className="chat-chips">{(isAI ? aiChips(assistant) : CHIPS).map(c => <button key={c} onClick={() => ask(c)}>{c}</button>)}</div>
          </div>
        )}
        {messages.map((m, i) => m.role === 'user'
          ? (
            <div key={i} className="me-wrap">
              <div className="msg me">
                {m.photos && m.photos.length > 0 && <span className="msg-photos">{m.photos.map((p, j) => <img key={j} src={p} alt={'Attached photo ' + (j + 1)} />)}</span>}
                {!m.photos && m.n > 0 && <em className="msg-had">{m.n} photo</em>}
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
              {m.content ? <Markdown text={m.content} /> : <span className="dots"><i></i><i></i><i></i><em>{note || (read.now > 0 ? `Page ${read.now} padh raha hu${read.pct > 0 && read.pct < 1 ? ` (${Math.round(read.pct * 100)}%)` : ''}` : '')}</em></span>}
              {busy && i === messages.length - 1 && m.content && <span className="caret">▌</span>}
              {m.content && !m.error && !(busy && i === messages.length - 1) && (
                <div className="msg-tools">
                  <button onClick={() => copy(i, m.content)}><i className={'fas fa-' + (copied === i ? 'check' : 'copy')} aria-hidden="true"></i> {copied === i ? 'Copied' : 'Copy'}</button>
                  <button className="msg-pdf" onClick={() => setSheet(pairs(messages.slice(Math.max(0, i - 1), i + 1)))}><i className="fas fa-file-pdf" aria-hidden="true"></i> PDF / Share</button>
                  {m.model && <small>{m.model}</small>}
                </div>
              )}
            </div>
          ))}
      </div>

      {photos.length > 0 && (
        <div className="chat-photos" id="aiPhotos">
          {photos.map((p, i) => <span key={i}><img src={p} alt={'Photo ' + (i + 1)} /><button type="button" aria-label={'Remove photo ' + (i + 1)} onClick={() => setPhotos(photos.filter((_, j) => j !== i))}><i className="fas fa-times" aria-hidden="true"></i></button></span>)}
          <small>{photos.length} photo attach. Sawaal likho ya seedha bhejo.</small>
        </div>
      )}
      <form className="chat-in" onSubmit={e => { e.preventDefault(); ask(); }}>
        <button type="button" className="chat-attach" id="aiAttach" aria-label="Attach a photo" title="Attach photo" disabled={busy || photos.length >= 3} onClick={() => fileEl.current.click()}><i className="fas fa-paperclip" aria-hidden="true"></i></button>
        <input ref={fileEl} id="aiFile" type="file" accept="image/*" multiple hidden onChange={e => { addPhotos(e.target.files); e.target.value = ''; }} />
        <textarea id="aiInput" rows="1" value={text} placeholder={hint + '▌'} aria-label="Your question" maxLength="1500"
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}></textarea>
        {text && <button type="button" className="chat-clear" id="aiClear" aria-label="Clear what you typed" title="Clear" onClick={() => setText('')}><i className="fas fa-times-circle" aria-hidden="true"></i></button>}
        {busy
          ? <button type="button" className="chat-send stop" aria-label="Stop" onClick={() => { stop.current && stop.current.abort(); setBusy(false); }}><i className="fas fa-stop" aria-hidden="true"></i></button>
          : <button type="submit" className="chat-send" aria-label="Send" disabled={!text.trim() && !photos.length}><i className="fas fa-paper-plane" aria-hidden="true"></i></button>}
      </form>
      <div className="chat-model" id="aiModel" role="radiogroup" aria-label="Choose AI model">
        <span className="chat-model-label"><i className="fas fa-microchip" aria-hidden="true"></i> Model</span>
        {MODELS.map(m => {
          const busyNow = isHot(m.id);
          return (
            <button key={m.id} type="button" role="radio" aria-checked={model === m.id} className={(model === m.id ? 'on' : '') + (busyNow ? ' hot' : '')} disabled={busy} onClick={() => setModel(m.id)}>
              <i className={'fas fa-' + m.icon} aria-hidden="true"></i>
              <b>{m.name}</b>
              <small><i className="dot" aria-hidden="true"></i>{busyNow ? 'High traffic' : m.tip}</small>
            </button>
          );
        })}
      </div>
      <p className="chat-note">AI galti kar sakta hai. Zaroori jawab apne notes se mila lena.</p>
      {hist && <History paper={paper} cid={cid} open={openChat} close={() => setHist(false)} />}
      {sheet && <AnswerPdf title={paper} items={sheet} close={() => setSheet(null)} />}
    </section>
  );
}
