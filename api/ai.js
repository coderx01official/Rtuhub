// =====================================================================
//  RTU HUB AI — paper viewer ka chatbot.
//  Keys CODE MEIN NAHI hain. Vercel > Settings > Environment Variables mein daalo
//  (ek se zyada key ho to comma ya nayi line se alag karo):
//     GEMINI_KEYS    Gemini keys   (paper ki photo padh sakta hai — sabse zaroori)
//     GROQ_KEYS      Groq keys     (tez; photo bhi padh leta hai)
//     CEREBRAS_KEYS  Cerebras key  (bahut tez, sirf text)
//  Koi key na ho ya sab ki limit khatam ho jaye to bina-key wale free server try hote hain.
//  Sirf rtuhub.in ke page se, sahi cookie ke saath chalta hai (dekho api/_auth.js).
//  Jaanch:  /api/ai?diag=1   (kaunsa provider chal raha hai; keys kabhi nahi dikhata)
// =====================================================================
import { COOKIE, checkToken, fromThisSite, readCookie, deny } from './_auth.js';

export const config = { runtime: 'edge' };

const SYSTEM = `You are RTU Hub AI, a study helper inside rtuhub.in for RTU (Rajasthan Technical University) B.Tech students.
The student is viewing a previous year question paper. When an image of the current page is attached, read the questions from it.
Rules:
- Reply in the language the student uses (Hindi, Hinglish or English). Keep it simple and friendly.
- When asked for a question by number (like "Q8" or "Part B Q2"), first write that question in one line, then answer it.
- Write exam-ready answers: sized to the marks, with headings, numbered points, formulas, and a small example or diagram description where it helps.
- If the question is not on the attached page, say which page to open instead of guessing.
- Write maths in plain text with Unicode (x², √, ×, ÷, θ, π, ∫, Σ, ≤). Do not use LaTeX or $ signs.
- Use simple Markdown only: ## headings, **bold**, - lists, 1. lists. No tables wider than 3 columns.
- Only help with studies. Politely refuse anything else.`;

const keys = v => String(v || '').split(/[\s,;]+/).filter(s => s.length > 15);
const cool = new Map();      // key/provider -> timestamp jab tak ise chhod do
const goodModel = new Map(); // provider -> model jo chal gaya
let turn = 0;                // keys ko baari-baari use karne ke liye
const hits = new Map();      // ip -> request times (halka rate limit)

// ---------- kaun-kaun se AI server, kis kram mein ----------
function chain(env, vision) {
  if (env.AI_TEST_BASE) return [{ id: 'test', name: 'test', api: 'openai', url: env.AI_TEST_BASE, key: 'test', models: ['test-model'] }];
  const rotate = list => list.length ? list.slice(turn % list.length).concat(list.slice(0, turn % list.length)) : list;
  const gemini = rotate(keys(env.GEMINI_KEYS)).flatMap((key, i) => [
    { id: 'gemini' + key.slice(-6), name: 'Gemini', api: 'openai', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', key,
      models: ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'] },
    { id: 'vertex' + key.slice(-6), name: 'Gemini', api: 'gemini', key, models: ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'] }
  ]);
  const groqKeys = rotate(keys(env.GROQ_KEYS));
  const groqVision = groqKeys.map(key => ({ id: 'groqv' + key.slice(-6), name: 'Groq', api: 'openai', url: 'https://api.groq.com/openai/v1/chat/completions', key,
    models: ['meta-llama/llama-4-scout-17b-16e-instruct', 'meta-llama/llama-4-maverick-17b-128e-instruct'], listUrl: 'https://api.groq.com/openai/v1/models', pick: /scout|maverick|vision/i }));
  const groqText = groqKeys.map(key => ({ id: 'groqt' + key.slice(-6), name: 'Groq', api: 'openai', url: 'https://api.groq.com/openai/v1/chat/completions', key,
    models: ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'moonshotai/kimi-k2-instruct', 'qwen/qwen3-32b'], listUrl: 'https://api.groq.com/openai/v1/models', pick: /gpt-oss-120b|llama-3\.3-70b|kimi|qwen/i }));
  const cerebras = rotate(keys(env.CEREBRAS_KEYS || env.CEREBRAS_KEY)).map(key => ({ id: 'cer' + key.slice(-6), name: 'Cerebras', api: 'openai', url: 'https://api.cerebras.ai/v1/chat/completions', key,
    models: ['gpt-oss-120b', 'llama-3.3-70b', 'qwen-3-235b-a22b-instruct-2507', 'llama3.1-8b'], listUrl: 'https://api.cerebras.ai/v1/models', pick: /gpt-oss|llama-3\.3|qwen-3|llama3\.1/i }));
  const pollinations = { id: 'poll', name: 'Pollinations', api: 'openai', url: 'https://text.pollinations.ai/openai', key: '', models: ['openai', 'openai-fast'] };
  const llm7 = { id: 'llm7', name: 'LLM7', api: 'openai', url: 'https://api.llm7.io/v1/chat/completions', key: 'unused', models: ['default', 'gpt-4.1-nano-2025-04-14'] };
  return vision
    ? [...gemini, ...groqVision, pollinations]                       // photo padhne wale
    : [...cerebras, ...groqText, ...gemini, llm7, pollinations];     // sirf text: sabse tez pehle
}

// provider ke paas abhi kaunse model hain (ek baar pooch kar yaad rakho)
const lists = new Map();
async function modelsFor(p) {
  const known = goodModel.get(p.name + p.api + (p.pick || ''));
  let models = p.models;
  if (p.listUrl) {
    if (!lists.has(p.listUrl)) {
      lists.set(p.listUrl, fetch(p.listUrl, { headers: { authorization: 'Bearer ' + p.key }, signal: AbortSignal.timeout(2500) })
        .then(r => r.ok ? r.json() : null).then(j => j && Array.isArray(j.data) ? j.data.map(m => m.id) : null).catch(() => null));
    }
    const live = await lists.get(p.listUrl);
    if (live) {
      const have = p.models.filter(m => live.includes(m));
      const extra = live.filter(m => p.pick.test(m) && !have.includes(m) && !/guard|whisper|tts|embed/i.test(m));
      if (have.length || extra.length) models = [...have, ...extra];
    } else lists.delete(p.listUrl);
  }
  return known && models.includes(known) ? [known, ...models.filter(m => m !== known)] : models;
}

// ---------- ek server ko request ----------
// 15 second mein jawab shuru na ho to chhod do (jawab shuru hone ke baad koi time limit nahi)
function fetchStart(url, init) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  return fetch(url, { ...init, signal: ctl.signal }).finally(() => clearTimeout(timer));
}

function call(p, model, input, stream) {
  if (p.api === 'gemini') {   // Vertex AI "express" keys ka apna format
    const part = c => typeof c === 'string' ? [{ text: c }] : c.map(x => x.type === 'text' ? { text: x.text } : { inlineData: { mimeType: 'image/jpeg', data: x.image_url.url.split(',')[1] } });
    const body = {
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: input.messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: part(m.content) })),
      generationConfig: { maxOutputTokens: input.max, temperature: 0.3 }
    };
    return fetchStart(`https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:${stream ? 'streamGenerateContent?alt=sse' : 'generateContent'}`,
      { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': p.key }, body: JSON.stringify(body) });
  }
  const headers = { 'content-type': 'application/json' };
  if (p.key) headers.authorization = 'Bearer ' + p.key;
  return fetchStart(p.url, { method: 'POST', headers, body: JSON.stringify({ model, stream, temperature: 0.3, max_tokens: input.max, messages: [{ role: 'system', content: SYSTEM }, ...input.messages] }) });
}

// server ka stream (SSE) -> seedha text
function toText(upstream, api) {
  const dec = new TextDecoder(), enc = new TextEncoder();
  let buf = '';
  return upstream.body.pipeThrough(new TransformStream({
    transform(chunk, ctl) {
      buf += dec.decode(chunk, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        const data = line.startsWith('data:') ? line.slice(5).trim() : '';
        if (!data || data === '[DONE]') continue;
        try {
          const j = JSON.parse(data);
          const text = api === 'gemini'
            ? (j.candidates?.[0]?.content?.parts || []).map(x => x.thought ? '' : x.text || '').join('')
            : j.choices?.[0]?.delta?.content || '';
          if (text) ctl.enqueue(enc.encode(text));
        } catch (e) {}
      }
    }
  }));
}

async function answer(env, input, vision) {
  const tried = [];
  let attempts = 0;
  for (const p of chain(env, vision)) {
    if ((cool.get(p.id) || 0) > Date.now()) continue;
    for (const model of await modelsFor(p)) {
      if (++attempts > 9) return { tried };
      let res;
      try { res = await call(p, model, input, true); } catch (e) { tried.push(`${p.name}:timeout`); cool.set(p.id, Date.now() + 30000); break; }
      if (res.ok && res.body) {
        goodModel.set(p.name + p.api + (p.pick || ''), model);
        return { res, p, model, tried };
      }
      tried.push(`${p.name}:${res.status}`);
      if (res.status === 404 || res.status === 400 || res.status === 422) continue;                           // model nahi / format nahi: agla model
      cool.set(p.id, Date.now() + (res.status === 401 || res.status === 403 ? 600000 : 45000));               // key galat: 10 min, limit: 45 s
      break;
    }
  }
  return { tried };
}

const json = (status, data, extra) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });

export default async function handler(request) {
  const env = process.env;
  const url = new URL(request.url);

  // ---------- jaanch: kaunsa provider chal raha hai (keys kabhi nahi dikhti) ----------
  if (request.method === 'GET' && url.searchParams.get('diag')) {
    const report = { keys: { gemini: keys(env.GEMINI_KEYS).length, groq: keys(env.GROQ_KEYS).length, cerebras: keys(env.CEREBRAS_KEYS || env.CEREBRAS_KEY).length }, secretSet: !!env.RTUHUB_SECRET, text: [], vision: [] };
    const input = { max: 32, messages: [{ role: 'user', content: 'Reply with just: OK' }] };
    for (const kind of ['text', 'vision']) {
      const seen = new Set();
      for (const p of chain(env, kind === 'vision')) {
        if (seen.has(p.name + p.api) || seen.size > 6) continue;
        seen.add(p.name + p.api);
        const t = Date.now();
        let line = { provider: p.name, api: p.api };
        try {
          const model = (await modelsFor(p))[0];
          const res = await call(p, model, input, false);
          line = { ...line, model, status: res.status, ms: Date.now() - t };
          if (!res.ok) line.note = (await res.text()).replace(/[A-Za-z0-9_\-.]{24,}/g, '***').slice(0, 140);
        } catch (e) { line = { ...line, status: 'error', note: String(e && e.name) }; }
        report[kind].push(line);
      }
    }
    return json(200, report, { 'cache-control': 'public, s-maxage=300' });
  }

  if (request.method !== 'POST') return deny(405, 'POST only');
  if (!fromThisSite(request)) return deny(403, 'RTU Hub AI works only on rtuhub.in');
  if (!(await checkToken(readCookie(request, COOKIE)))) return deny(401, 'Session expired. Reload rtuhub.in');

  // halka rate limit: ek IP se 1 minute mein 8 sawaal
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'x';
  const now = Date.now(), mine = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (mine.length >= 8) return json(429, { error: 'slow', message: 'Too many questions. Wait a minute and ask again.' });
  mine.push(now); hits.set(ip, mine);
  if (hits.size > 5000) hits.clear();

  let body;
  try { body = await request.json(); } catch (e) { return json(400, { error: 'bad' }); }
  const history = (Array.isArray(body.messages) ? body.messages : []).slice(-8)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, 6000) }));
  if (!history.length || history[history.length - 1].role !== 'user') return json(400, { error: 'bad' });
  const image = typeof body.image === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(body.image) && body.image.length < 1600000 ? body.image : '';
  const where = `Paper: ${String(body.paper || 'RTU question paper').slice(0, 160)}. ${body.page ? `The student is on page ${+body.page || 1} of ${+body.pages || '?'}.` : ''}`;
  const last = history.pop();
  const text = `${where}\n\nStudent: ${last.content}`;
  const input = { max: 4096, messages: [...history, { role: 'user', content: image ? [{ type: 'text', text }, { type: 'image_url', image_url: { url: image } }] : text }] };
  turn++;

  let out = await answer(env, input, !!image);
  if (!out.res && image) {   // photo wale sab band: bina photo ke koshish
    input.messages[input.messages.length - 1].content = text + '\n\n(The page image could not be read right now. If you need the exact question text, ask the student to type it.)';
    out = await answer(env, input, false);
  }
  if (!out.res) return json(503, { error: 'busy', message: 'AI is busy right now. Try again in a minute.', tried: out.tried.slice(0, 12) });
  return new Response(toText(out.res, out.p.api), { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-ai': `${out.p.name} ${out.model}`.slice(0, 80) } });
}
