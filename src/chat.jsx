// =====================================================================
//  RTU HUB AI — paper viewer ke neeche khulne wala chatbot.
//  Sirf zaroori page padha jata hai, uska text /api/ai ko jata hai; jawab shabd-shabd aata hai.
//  Har paper ki chat yaad rehti hai. Jawab copy, branded PDF, share, text bada-chhota.
// =====================================================================
import { useEffect, useRef, useState } from 'react';
import { ensureSession } from './viewer.jsx';
import { buildAnswerPdf } from './answerpdf.js';

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
const getCaps = () => caps || (caps = fetch('/api/ai?caps=1').then(r => r.json()).catch(() => ({ vision: false })));

// MODEL 1 (reader): photo -> text. Pehle server ka vision model, wo na ho to phone par OCR.
async function imageToText(dataUrl, canvas, onProgress) {
  if ((await getCaps()).vision) {
    try {
      await ensureSession();
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ read: dataUrl }) });
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

async function readPage(doc, paper, n, onProgress) {
  const key = paper + '|' + n;
  if (memory.has(key)) return memory.get(key);
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
  // 2. scan hai: page ko photo bana kar OCR
  if (text.replace(/\s/g, '').length < 80) {
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

// ---------- chhota, surakshit Markdown (koi HTML inject nahi hota) ----------
function inline(text, key) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => p.startsWith('**') && p.length > 4 ? <strong key={key + i}>{p.slice(2, -2)}</strong>
    : p.startsWith('`') && p.length > 2 ? <code key={key + i}>{p.slice(1, -1)}</code> : p);
}
export function Markdown({ text }) {
  const out = [], lines = String(text).replace(/\r/g, '').split('\n');
  let list = null, code = null;
  const flush = () => { if (list) { const L = list.ordered ? 'ol' : 'ul'; out.push(<L key={out.length}>{list.items.map((it, i) => <li key={i}>{inline(it, 'l' + i)}</li>)}</L>); list = null; } };
  lines.forEach((line, n) => {
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

// har paper ki chat phone mein yaad
const chatKey = paper => 'rtuhub_chat:' + paper;
const loadChat = paper => { try { const v = JSON.parse(localStorage.getItem(chatKey(paper))); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
function saveChat(paper, messages) {
  try {
    const keep = messages.filter(m => m.content && !m.error).slice(-40).map(m => ({ role: m.role, content: m.content, model: m.model, n: m.photos ? m.photos.length : m.n || 0 }));
    if (keep.length) localStorage.setItem(chatKey(paper), JSON.stringify(keep)); else localStorage.removeItem(chatKey(paper));
  } catch (e) {}
}

const CHIPS = ['Is page ke saare questions list karo', 'Q1 ka answer do', 'Important topics batao', 'Is page ko simple Hindi mein samjhao'];
const HINTS = ['Enter your command', 'Q8 ka answer do', 'Part A question 1', 'Part C Q2, 10 marks answer', 'Is topic ko simple Hindi mein samjhao'];
const SIZES = [0.86, 0.95, 1.06, 1.2, 1.36];

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

export function Chat({ doc, paper, page, pages, getImage, close }) {
  const [messages, setMessages] = useState(() => loadChat(paper));   // {role, content, model?, error?, photos?, n?}
  const [photos, setPhotos] = useState([]);       // attach ki hui photos (data URL), zyada se zyada 3
  const [note, setNote] = useState('');           // jawab aane se pehle kya chal raha hai
  const [text, setText] = useState(() => { try { return localStorage.getItem('rtuhub_draft:' + paper) || ''; } catch (e) { return ''; } });   // adhoora likha hua yaad rehta hai
  const [busy, setBusy] = useState(false);
  const [size, setSize] = useState(1);
  const [copied, setCopied] = useState(-1);
  const [sheet, setSheet] = useState(null);       // answer PDF ke items
  const [read, setRead] = useState({ now: 0, pct: 0, done: 0 });
  const log = useRef(null), stop = useRef(null), fileEl = useRef(null);
  const jobs = useRef({});                        // page -> promise(text)
  const hint = useTyped(HINTS, !text);

  // ek page padhna (ek baar); chat khulte hi sirf wahi page jis par student hai
  const pageText = n => jobs.current[n] || (jobs.current[n] = (jobs.current.chain || Promise.resolve()).then(() => {
    setRead(r => ({ ...r, now: n, pct: 0 }));
    return readPage(doc, paper, n, p => setRead(r => ({ ...r, pct: p })));
  }).catch(() => '').then(t => { setRead(r => ({ ...r, done: r.done + 1, now: 0 })); return t; }));
  const readOne = n => (jobs.current.chain = pageText(n));
  useEffect(() => { readOne(page); }, [page]);

  useEffect(() => { const el = log.current; if (el) el.scrollTop = el.scrollHeight; }, [messages, note]);
  useEffect(() => () => stop.current && stop.current.abort(), []);
  useEffect(() => { try { text ? localStorage.setItem('rtuhub_draft:' + paper, text) : localStorage.removeItem('rtuhub_draft:' + paper); } catch (e) {} }, [text]);
  useEffect(() => { if (!busy) saveChat(paper, messages); }, [messages, busy]);

  // SMART: sirf wo page(s) jinme sawaal hai
  async function gather(q) {
    const w = wanted(q), tag = n => `--- Page ${n}${n === page ? ' (student is here)' : ''} ---`;
    const here = await readOne(page);
    const all = async () => { const out = []; for (let n = 1; n <= Math.min(pages, 12); n++) { const t = await readOne(n); if (t) out.push(`${tag(n)}\n${t}`); } return out.join('\n\n'); };
    if (w.whole) return all();
    if (!w.no) return here ? `${tag(page)}\n${here}` : all();
    const order = [page, ...Array.from({ length: Math.min(pages, 12) }, (_, i) => i + 1).filter(n => n !== page)];
    for (const n of order) {
      const t = n === page ? here : await readOne(n);
      if (!t) continue;
      if (!w.part) { if (hasNo(t, w.no)) return `${tag(n)}\n${t}`; continue; }
      const at = partAt(t, w.part);
      if (at < 0) continue;
      const section = t.slice(at), own = section.slice(0, nextPart(section));
      if (hasNo(own, w.no)) return `${tag(n)}\n${t}`;
      if (own.length === section.length && n < pages) {            // part agle page par chalta hai
        const next = await readOne(n + 1);
        const cut = next ? next.search(/part\s*[-–—:.]?\s*[a-c]\b/i) : -1;
        if (next && hasNo(cut < 0 ? next : next.slice(0, cut), w.no)) return `${tag(n)}\n${t}\n\n${tag(n + 1)}\n${next}`;
      }
    }
    return all();   // number nahi mila (scan dhundhla ho sakta hai): jo padha hai sab bhej do
  }

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
      const paperText = sent.length && !wanted(q).no ? '' : await gather(q);
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
      setNote(sent.length && vision ? 'Photo padh raha hu' : 'Soch raha hu');
      let res;
      for (let attempt = 1; ; attempt++) {
        res = await fetch('/api/ai', {
          method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ paper, page, pages, paperText, attachText, images, image: paperText.length > 150 || sent.length ? '' : getImage(), messages: history.slice(-8).map(m => ({ role: m.role, content: m.content })) })
        });
        if (res.ok && res.body) break;
        const info = await res.json().catch(() => ({}));
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
      const by = res.headers.get('x-ai-reader');
      const model = (by ? by.split(' ')[0] + ' + ' : '') + (res.headers.get('x-ai') || '').split(' ')[0];   // reader + solver
      const reader = res.body.getReader(), dec = new TextDecoder();
      let answer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += dec.decode(value, { stream: true });
        patch(m => ({ ...m, content: answer, model }));
      }
      if (!answer.trim()) throw new Error('Jawab nahi aaya. Dobara pooch.');
    } catch (e) {
      if (e.name !== 'AbortError') patch(m => m.content ? m : { ...m, content: e.message || 'Kuch gadbad ho gayi. Dobara pooch.', error: true });
    }
    setBusy(false); setNote('');
  }

  const copy = (i, content) => {
    const done = () => { setCopied(i); setTimeout(() => setCopied(-1), 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(content).then(done, () => {}); else done();
  };
  // [{q, a}] : har jawab apne sawaal ke saath
  const pairs = from => { const out = []; from.forEach((m, i) => { if (m.role === 'assistant' && m.content && !m.error) out.push({ q: (from[i - 1] && from[i - 1].role === 'user' ? from[i - 1].content : 'Question'), a: m.content }); }); return out; };
  const newChat = () => { if (stop.current) stop.current.abort(); setBusy(false); setNote(''); setMessages([]); setPhotos([]); try { localStorage.removeItem(chatKey(paper)); } catch (e) {} };
  const answered = messages.some(m => m.role === 'assistant' && m.content && !m.error);

  return (
    <section className="chat" id="aiChat" style={{ '--fz': SIZES[size] + 'rem' }} aria-label="RTU Hub AI chat">
      <header className="chat-head">
        <span className="chat-orb" aria-hidden="true"></span>
        <div className="chat-name"><b>RTU Hub AI</b>
          <small id="aiRead">{read.now
            ? <><i className="fas fa-circle-notch fa-spin" aria-hidden="true"></i> Reading page {read.now}{read.pct > 0 && read.pct < 1 ? ` ${Math.round(read.pct * 100)}%` : ''}</>
            : <><i className="fas fa-check" aria-hidden="true"></i> Page {page} ready</>}</small>
        </div>
        <button id="aiNew" className="chat-new" aria-label="New chat" disabled={!messages.length} onClick={newChat}><i className="fas fa-plus" aria-hidden="true"></i> New</button>
        <button aria-label="Text size" title="Text size" onClick={() => setSize((size + 1) % SIZES.length)}>A<sup>a</sup></button>
        <button id="aiPdfAll" aria-label="All answers as PDF" title="All answers as PDF" disabled={!answered} onClick={() => setSheet(pairs(messages))}><i className="fas fa-file-pdf" aria-hidden="true"></i></button>
        <button aria-label="Close chat" onClick={close}><i className="fas fa-chevron-down" aria-hidden="true"></i></button>
      </header>

      <div className="chat-log" ref={log}>
        {!messages.length && (
          <div className="chat-hello">
            <p>Bhai, paper mere saamne hai. Bas bol <b>“Q8 ka answer do”</b> ya <b>“Part A question 1”</b>, marks ke hisaab se answer milega.</p>
            <div className="chat-chips">{CHIPS.map(c => <button key={c} onClick={() => ask(c)}>{c}</button>)}</div>
          </div>
        )}
        {messages.map((m, i) => m.role === 'user'
          ? (
            <div key={i} className="msg me">
              {m.photos && m.photos.length > 0 && <span className="msg-photos">{m.photos.map((p, j) => <img key={j} src={p} alt={'Attached photo ' + (j + 1)} />)}</span>}
              {!m.photos && m.n > 0 && <em className="msg-had">{m.n} photo</em>}
              {m.content}
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
      <p className="chat-note">AI galti kar sakta hai. Zaroori jawab apne notes se mila lena.</p>
      {sheet && <AnswerPdf title={paper} items={sheet} close={() => setSheet(null)} />}
    </section>
  );
}
