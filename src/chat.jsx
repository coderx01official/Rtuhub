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

const CHIPS = ['Is page ke saare questions list karo', 'Q1 ka answer do', 'Important topics batao', 'Explain in simple Hindi'];
const HINTS = ['Enter your command', 'Q8 ka answer do', 'Explain Q3 step by step', 'Part C Q2, 10 marks answer', 'Is topic ko simple Hindi mein samjhao'];
const SIZES = [0.86, 0.95, 1.06, 1.2, 1.36];

export function Chat({ paper, page, pages, getImage, close }) {
  const [messages, setMessages] = useState([]);   // {role, content, model?, error?}
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [size, setSize] = useState(1);
  const [copied, setCopied] = useState(-1);
  const log = useRef(null), stop = useRef(null), box = useRef(null);
  const hint = useTyped(HINTS, !text);

  useEffect(() => { const el = log.current; if (el) el.scrollTop = el.scrollHeight; }, [messages]);
  useEffect(() => () => stop.current && stop.current.abort(), []);

  async function ask(question) {
    const q = (question || text).trim();
    if (!q || busy) return;
    setText('');
    const history = [...messages.filter(m => m.content && !m.error), { role: 'user', content: q }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setBusy(true);
    const patch = fn => setMessages(ms => ms.map((m, i) => i === ms.length - 1 ? fn(m) : m));
    try {
      await ensureSession();
      const ctl = stop.current = new AbortController();
      const res = await fetch('/api/ai', {
        method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paper, page, pages, image: getImage(), messages: history.slice(-8).map(m => ({ role: m.role, content: m.content })) })
      });
      if (!res.ok || !res.body) {
        const info = await res.json().catch(() => ({}));
        throw new Error(info.message || (res.status === 401 || res.status === 403 ? 'Reload the page and ask again.' : 'AI is not available right now. Try again in a minute.'));
      }
      const model = res.headers.get('x-ai') || '';
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
    setBusy(false);
  }

  const copy = (i, content) => {
    const done = () => { setCopied(i); setTimeout(() => setCopied(-1), 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(content).then(done, () => {}); else done();
  };

  return (
    <section className="chat" id="aiChat" style={{ '--fz': SIZES[size] + 'rem' }} aria-label="RTU Hub AI chat">
      <header className="chat-head">
        <span className="chat-orb" aria-hidden="true"></span>
        <div className="chat-name"><b>RTU Hub AI</b><small>Reading page {page} of {pages}</small></div>
        <button aria-label="Smaller text" disabled={size === 0} onClick={() => setSize(size - 1)}>A<sub>−</sub></button>
        <button aria-label="Bigger text" disabled={size === SIZES.length - 1} onClick={() => setSize(size + 1)}>A<sup>+</sup></button>
        <button aria-label="Save answers as PDF" title="Save as PDF" disabled={!messages.some(m => m.role === 'assistant' && m.content && !m.error)} onClick={() => savePdf(paper, messages.filter(m => !m.error))}><i className="fas fa-file-pdf" aria-hidden="true"></i></button>
        <button aria-label="Close chat" onClick={close}><i className="fas fa-chevron-down" aria-hidden="true"></i></button>
      </header>

      <div className="chat-log" ref={log}>
        {!messages.length && (
          <div className="chat-hello">
            <p>Ask anything about this paper. I can read the page you are on, so you can just say <b>“Q8 ka answer do”</b>.</p>
            <div className="chat-chips">{CHIPS.map(c => <button key={c} onClick={() => ask(c)}>{c}</button>)}</div>
          </div>
        )}
        {messages.map((m, i) => m.role === 'user'
          ? <div key={i} className="msg me">{m.content}</div>
          : (
            <div key={i} className={'msg ai' + (m.error ? ' err' : '')}>
              {m.content ? <Markdown text={m.content} /> : <span className="dots"><i></i><i></i><i></i></span>}
              {busy && i === messages.length - 1 && m.content && <span className="caret">▌</span>}
              {m.content && !m.error && !(busy && i === messages.length - 1) && (
                <div className="msg-tools">
                  <button onClick={() => copy(i, m.content)}><i className={'fas fa-' + (copied === i ? 'check' : 'copy')} aria-hidden="true"></i> {copied === i ? 'Copied' : 'Copy'}</button>
                  <button onClick={() => savePdf(paper, [messages[i - 1], m].filter(Boolean))}><i className="fas fa-file-pdf" aria-hidden="true"></i> PDF</button>
                  {m.model && <small>{m.model.split(' ')[0]}</small>}
                </div>
              )}
            </div>
          ))}
      </div>

      <form className="chat-in" onSubmit={e => { e.preventDefault(); ask(); }}>
        <textarea ref={box} id="aiInput" rows="1" value={text} placeholder={hint + '▌'} aria-label="Your question" maxLength="1500"
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}></textarea>
        {busy
          ? <button type="button" className="chat-send stop" aria-label="Stop" onClick={() => { stop.current && stop.current.abort(); setBusy(false); }}><i className="fas fa-stop" aria-hidden="true"></i></button>
          : <button type="submit" className="chat-send" aria-label="Send" disabled={!text.trim()}><i className="fas fa-paper-plane" aria-hidden="true"></i></button>}
      </form>
      <p className="chat-note">AI can make mistakes. Check important answers with your notes.</p>
    </section>
  );
}
