// =====================================================================
//  RTU HUB AI — paper viewer ke neeche khulne wala chatbot.
//  Sawaal + abhi wale page ki photo /api/ai ko jaati hai; jawab shabd-shabd aata hai.
//  Jawab copy kar sakte ho, PDF bana sakte ho, text bada-chhota kar sakte ho.
// =====================================================================
import { useEffect, useRef, useState } from 'react';
import { ensureSession } from './viewer.jsx';

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

// ---------- jawab ko PDF banana (phone/computer ka "Save as PDF") ----------
function savePdf(title, messages) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const md = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/^#{1,4}\s+(.*)$/gm, '<h3>$1</h3>').replace(/^\s*[-*•]\s+(.*)$/gm, '<div class="li">• $1</div>').replace(/\n/g, '<br>');
  const html = `<!doctype html><meta charset="utf-8"><title>${esc(title)} - RTU Hub AI</title>
<style>body{font:14px/1.6 system-ui,Segoe UI,Arial,sans-serif;color:#111;margin:28px;max-width:760px}h1{font-size:19px;margin:0 0 2px}h3{font-size:15px;margin:14px 0 4px}
.sub{color:#666;font-size:12px;margin-bottom:18px;border-bottom:2px solid #3b82f6;padding-bottom:10px}.q{background:#eef4ff;border-left:4px solid #3b82f6;padding:8px 12px;margin:18px 0 8px;font-weight:600}
.li{margin-left:14px}.foot{margin-top:26px;color:#888;font-size:11px;border-top:1px solid #ddd;padding-top:8px}</style>
<h1>${esc(title)}</h1><div class="sub">Answers by RTU Hub AI · rtuhub.in</div>
${messages.filter(m => m.content).map(m => m.role === 'user' ? `<div class="q">${esc(m.content)}</div>` : `<div class="a">${md(m.content)}</div>`).join('')}
<div class="foot">AI answers can have mistakes. Check with your notes or book before the exam.</div>`;
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  frame.srcdoc = html;
  frame.onload = () => { try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) {} setTimeout(() => frame.remove(), 60000); };
  document.body.appendChild(frame);
}

const CHIPS = ['Is page ke saare questions list karo', 'Q1 ka answer do', 'Important topics batao', 'Is page ko simple Hindi mein samjhao'];
const HINTS = ['Enter your command', 'Q8 ka answer do', 'Explain Q3 step by step', 'Part C Q2, 10 marks answer', 'Is topic ko simple Hindi mein samjhao'];
const SIZES = [0.86, 0.95, 1.06, 1.2, 1.36];

export function Chat({ doc, paper, page, pages, getImage, close }) {
  const [messages, setMessages] = useState([]);   // {role, content, model?, error?, photos?}
  const [photos, setPhotos] = useState([]);       // attach ki hui photos (data URL), zyada se zyada 3
  const [note, setNote] = useState('');           // jawab aane se pehle kya chal raha hai
  const fileEl = useRef(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [size, setSize] = useState(1);
  const [copied, setCopied] = useState(-1);
  const log = useRef(null), stop = useRef(null), box = useRef(null);
  const hint = useTyped(HINTS, !text);
  const [read, setRead] = useState({ done: 0, now: 0, pct: 0 });   // paper padhne ki haalat
  const jobs = useRef({});                                         // page -> promise(text)

  // chat khulte hi poora paper padhna shuru: pehle wo page jis par student hai
  const pageText = n => jobs.current[n] || (jobs.current[n] = (jobs.current.chain || Promise.resolve()).then(() => {
    setRead(r => ({ ...r, now: n, pct: 0 }));
    return readPage(doc, paper, n, p => setRead(r => ({ ...r, pct: p })));
  }).catch(() => '').then(t => { setRead(r => ({ ...r, done: r.done + 1, now: 0 })); return t; }));
  useEffect(() => {
    const order = [page, ...Array.from({ length: pages }, (_, i) => i + 1).filter(n => n !== page)].slice(0, 12);
    for (const n of order) jobs.current.chain = pageText(n);
  }, []);

  useEffect(() => { const el = log.current; if (el) el.scrollTop = el.scrollHeight; }, [messages]);
  useEffect(() => () => stop.current && stop.current.abort(), []);

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
      // AI ki memory: abhi wala page zaroor, baaki jitne padhe ja chuke hain
      const mine = await pageText(page);
      // baaki pages bhi padh lene do (zyada se zyada 30 second), taaki Q kisi bhi page par ho mil jaye
      const rest = Array.from({ length: Math.min(pages, 12) }, (_, i) => pageText(i + 1));
      await Promise.race([Promise.all(rest), new Promise(done => setTimeout(done, 30000))]);
      const parts = [];
      for (let n = 1; n <= pages; n++) {
        const t = n === page ? mine : memory.get(paper + '|' + n);
        if (t) parts.push(`--- Page ${n}${n === page ? ' (student is here)' : ''} ---\n${t}`);
      }
      const paperText = parts.join('\n\n');
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
      setNote(sent.length && vision ? 'Photo padh raha hu' : '');
      let res;
      for (let attempt = 1; ; attempt++) {
        res = await fetch('/api/ai', {
          method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json' },
          // paper ka text achha padha gaya ho to page ki photo bhejne ki zaroorat nahi (tez + kam data)
          body: JSON.stringify({ paper, page, pages, paperText, attachText, images, image: mine.length > 150 || sent.length ? '' : getImage(), messages: history.slice(-8).map(m => ({ role: m.role, content: m.content })) })
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
      if (!answer.trim()) throw new Error('No answer came back. Ask again.');
    } catch (e) {
      if (e.name !== 'AbortError') patch(m => m.content ? m : { ...m, content: e.message || 'Something went wrong. Ask again.', error: true });
    }
    setBusy(false); setNote('');
  }

  const copy = (i, content) => {
    const done = () => { setCopied(i); setTimeout(() => setCopied(-1), 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(content).then(done, () => {}); else done();
  };

  return (
    <section className="chat" id="aiChat" style={{ '--fz': SIZES[size] + 'rem' }} aria-label="RTU Hub AI chat">
      <header className="chat-head">
        <span className="chat-orb" aria-hidden="true"></span>
        <div className="chat-name"><b>RTU Hub AI</b>
          <small id="aiRead">{read.done >= Math.min(pages, 12)
            ? <><i className="fas fa-check" aria-hidden="true"></i> Paper loaded, you are on page {page}</>
            : <><i className="fas fa-circle-notch fa-spin" aria-hidden="true"></i> Reading paper{read.now ? `, page ${read.now}` : ''}{read.pct > 0 && read.pct < 1 ? ` ${Math.round(read.pct * 100)}%` : ''}</>}</small>
        </div>
        <button aria-label="Smaller text" disabled={size === 0} onClick={() => setSize(size - 1)}>A<sub>−</sub></button>
        <button aria-label="Bigger text" disabled={size === SIZES.length - 1} onClick={() => setSize(size + 1)}>A<sup>+</sup></button>
        <button aria-label="Save answers as PDF" title="Save as PDF" disabled={!messages.some(m => m.role === 'assistant' && m.content && !m.error)} onClick={() => savePdf(paper, messages.filter(m => !m.error))}><i className="fas fa-file-pdf" aria-hidden="true"></i></button>
        <button aria-label="Close chat" onClick={close}><i className="fas fa-chevron-down" aria-hidden="true"></i></button>
      </header>

      <div className="chat-log" ref={log}>
        {!messages.length && (
          <div className="chat-hello">
            <p>Bhai, poora paper mere paas hai. Bas bol <b>“Q8 ka answer do”</b>, marks ke hisaab se answer milega.</p>
            <div className="chat-chips">{CHIPS.map(c => <button key={c} onClick={() => ask(c)}>{c}</button>)}</div>
          </div>
        )}
        {messages.map((m, i) => m.role === 'user'
          ? <div key={i} className="msg me">{m.photos && m.photos.length > 0 && <span className="msg-photos">{m.photos.map((p, j) => <img key={j} src={p} alt={'Attached photo ' + (j + 1)} />)}</span>}{m.content}</div>
          : (
            <div key={i} className={'msg ai' + (m.error ? ' err' : '')}>
              {m.content ? <Markdown text={m.content} /> : <span className="dots"><i></i><i></i><i></i><em>{note || (read.now > 0 ? `Paper padh raha hu, page ${read.now}${read.pct > 0 && read.pct < 1 ? ` (${Math.round(read.pct * 100)}%)` : ''}` : '')}</em></span>}
              {busy && i === messages.length - 1 && m.content && <span className="caret">▌</span>}
              {m.content && !m.error && !(busy && i === messages.length - 1) && (
                <div className="msg-tools">
                  <button onClick={() => copy(i, m.content)}><i className={'fas fa-' + (copied === i ? 'check' : 'copy')} aria-hidden="true"></i> {copied === i ? 'Copied' : 'Copy'}</button>
                  <button onClick={() => savePdf(paper, [messages[i - 1], m].filter(Boolean))}><i className="fas fa-file-pdf" aria-hidden="true"></i> PDF</button>
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
        <textarea ref={box} id="aiInput" rows="1" value={text} placeholder={hint + '▌'} aria-label="Your question" maxLength="1500"
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}></textarea>
        {busy
          ? <button type="button" className="chat-send stop" aria-label="Stop" onClick={() => { stop.current && stop.current.abort(); setBusy(false); }}><i className="fas fa-stop" aria-hidden="true"></i></button>
          : <button type="submit" className="chat-send" aria-label="Send" disabled={!text.trim() && !photos.length}><i className="fas fa-paper-plane" aria-hidden="true"></i></button>}
      </form>
      <p className="chat-note">AI can make mistakes. Check important answers with your notes.</p>
    </section>
  );
}
