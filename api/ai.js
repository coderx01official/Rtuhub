// =====================================================================
//  RTU HUB AI — paper viewer ka chatbot. Do model milkar kaam karte hain:
//    1. READER  : photo / scan ko text mein badalta hai   (NVIDIA -> Gemini -> Groq)
//    2. SOLVER  : us text se sawaal hal karta hai          (Cerebras -> Groq -> NVIDIA -> Gemini -> LLM7)
//  Kisi ki limit lag jaye to apne aap agla model / agli key.
//  Student neeche se model chunta hai (Groq / Gemini): wahi pehle chalta hai, uski saari keys khatam hon tabhi doosra.
//  Keys baant kar chalti hain: jis key par pichhle 1 minute mein sabse kam kaam hua, wahi agle student ko.
//  Ek hi sawaal ka jawab ek baar banta hai, phir sabko cache se (api/_cache.js).
//  Keys: api/_keys.js dekho (Vercel env RTUHUB_KEYS). Sirf rtuhub.in ke page se chalta hai (api/_auth.js).
//  Jaanch:  /api/ai?diag=1   (kaunsa model chal raha hai; keys kabhi nahi dikhata)
// =====================================================================
import { COOKIE, checkToken, fromThisSite, readCookie, deny } from './_auth.js';
import { loadKeys } from './_keys.js';
import { cacheKey, cacheGet, cachePut } from './_cache.js';

export const config = { runtime: 'edge' };

const SOLVE = `You are RTU Hub AI, the study buddy inside rtuhub.in for RTU (Rajasthan Technical University) B.Tech students.
The student is viewing a previous year question paper. You are given the text of that paper (read from the PDF, so it can have small spelling mistakes) and sometimes text read from photos the student attached. Treat the paper as your memory: when the student says "Q8" or "Part B Q2", find that question in the paper yourself. Never ask the student to type a question that is in the paper or in an attached photo.

Tone: talk like a helpful elder brother who has already cleared this exam. Friendly, direct, a little casual ("dekh bhai", "simple hai"), never rude. Reply in the language the student uses (Hindi, Hinglish or English).

Answer length follows the marks of the question. Read the marks from the paper (for example "10x2=20" means each question is 2 marks, "5x4=20" means 4 marks each):
- 2 marks: 3 to 4 lines.
- 4 or 5 marks: 6 to 7 lines.
- 10 marks or more: 12 to 13 lines, with a small example or a described diagram where it helps.
- Marks not clear: guess from the part (Part A short, Part B medium, Part C long) and say which you assumed.
If the student asks for a different length, follow the student.

Format every answer like this:
1. First line: the question, as "Q8 (2 marks): <question text>".
2. Then the answer, exam-ready, as short numbered points or lines.
- Straight to the point: no greeting, no "great question", no repeating what the student said, no closing lines like "hope this helps" or "all the best". Stop when the answer is complete.
- You are given only the page(s) where the question is. Answer from them; do not ask for other pages unless the question is truly missing.
- Numerical or derivation: show the steps, then the final answer on its own line.
- Same question number in two parts (Part A Q1 and Part B Q1): answer the one from the part on the student's current page, and mention the other in one line.
- Question really not in the paper or photo: say so in one line and ask which paper or page.
- Maths in plain text with Unicode (x², √, ×, ÷, θ, π, ∫, Σ, ≤). No LaTeX, no $ signs.
- Simple Markdown only: **bold**, - lists, 1. lists, ## for a heading when the answer is long.
- Only studies. Politely refuse anything else.`;

const READ = `You are an exact reader for exam papers and study material. Copy out EVERYTHING written in this image as plain text, in reading order.
Keep question numbers, part names, marks (like [8] or 10x2=20), formulas and tables. Write maths in plain text with Unicode (x², √, θ, π).
For a diagram, circuit or graph, add one line in square brackets describing it, for example [Diagram: RC circuit with R = 2 Ω and C = 1 F in series].
Do not solve anything, do not add comments. If the image has no readable text, reply exactly: NO TEXT`;

const TINY = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAAgACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD06iiigAooooAKKKKACiiigD//2Q==';   // jaanch ke liye chhoti safed photo

const cool = new Map();      // key -> timestamp jab tak ise chhod do
const goodModel = new Map(); // provider -> model jo chal gaya
const used = new Map();      // key -> pichhle 1 minute ke kaam (timestamps)
const recent = key => { const now = Date.now(), list = (used.get(key) || []).filter(t => now - t < 60000); used.set(key, list); return list.length; };
const markUsed = key => { if (used.size > 600) used.clear(); used.set(key, [...(used.get(key) || []), Date.now()]); };
const hits = new Map();      // ip -> request times (halka rate limit)

// ---------- kaun-kaun se AI server, kis kram mein ----------
function chains(env, prefer = '') {
  if (env.AI_TEST_BASE) {
    const test = { id: 'test', name: 'test', api: 'openai', url: env.AI_TEST_BASE, key: 'test', models: ['test-model'] };
    return { reader: env.AI_TEST_VISION === '0' ? [] : [test], solver: [test] };
  }
  const k = loadKeys(env);
  // sabse khaali key pehle (ek saath 10 students = alag-alag keys); barabar ho to koi bhi
  const rotate = list => list.map(key => [key, recent(key), Math.random()]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(x => x[0]);
  const make = (list, name, url, models, pick, listUrl) => rotate(list).map(key => ({ id: name + pick.source.length + key, name, api: 'openai', url, key, models, pick, listUrl }));
  const NV = 'https://integrate.api.nvidia.com/v1/', GQ = 'https://api.groq.com/openai/v1/', CB = 'https://api.cerebras.ai/v1/';
  const nvRead = make(k.nvidia, 'NVIDIA', NV + 'chat/completions',
    ['meta/llama-4-maverick-17b-128e-instruct', 'meta/llama-3.2-90b-vision-instruct', 'google/gemma-3-27b-it', 'microsoft/phi-4-multimodal-instruct', 'meta/llama-3.2-11b-vision-instruct'],
    /vision|llama-4|gemma-3-(12|27)b|multimodal|pixtral|-vl-/i, NV + 'models');
  const nvSolve = make(k.nvidia, 'NVIDIA', NV + 'chat/completions',
    ['openai/gpt-oss-120b', 'meta/llama-3.3-70b-instruct', 'moonshotai/kimi-k2-instruct', 'qwen/qwen3-235b-a22b', 'meta/llama-3.1-70b-instruct'],
    /gpt-oss-120b|llama-3\.3-70b|kimi-k2|qwen3-235b/i, NV + 'models');
  const gqRead = make(k.groq, 'Groq', GQ + 'chat/completions', ['meta-llama/llama-4-scout-17b-16e-instruct', 'meta-llama/llama-4-maverick-17b-128e-instruct'], /scout|maverick|vision/i, GQ + 'models');
  const gqSolve = make(k.groq, 'Groq', GQ + 'chat/completions', ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'moonshotai/kimi-k2-instruct', 'qwen/qwen3-32b'], /gpt-oss-120b|llama-3\.3-70b|kimi|qwen/i, GQ + 'models');
  const cbSolve = make(k.cerebras, 'Cerebras', CB + 'chat/completions', ['gpt-oss-120b', 'llama-3.3-70b', 'qwen-3-235b-a22b-instruct-2507', 'llama3.1-8b'], /gpt-oss|llama-3\.3|qwen-3|llama3\.1/i, CB + 'models');
  const gemini = rotate(k.gemini).flatMap(key => [
    { id: 'gem' + key, name: 'Gemini', api: 'openai', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', key, models: ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'] },
    { id: 'vtx' + key, name: 'Gemini', api: 'gemini', key, models: ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'] }
  ]);
  // bina-key wala free server: aakhri sahara. Ise kabhi "band" nahi karte, chhota message bhejte hain, ek baar dobara try karte hain.
  const llm7 = { id: 'llm7', name: 'LLM7', api: 'openai', url: 'https://api.llm7.io/v1/chat/completions', key: 'unused', last: true,
    models: ['default', 'fast', 'gpt-4.1-nano-2025-04-14'], pick: /gpt|mistral|llama|qwen|deepseek|gemini/i, listUrl: 'https://api.llm7.io/v1/models' };
  // student ne jo model chuna wo sabse pehle; uski keys khatam to baaki (taaki jawab phir bhi mile)
  if (prefer === 'gemini') return { reader: [...gemini, ...nvRead, ...gqRead], solver: [...gemini, ...gqSolve, ...cbSolve, ...nvSolve, llm7] };
  if (prefer === 'groq') return { reader: [...nvRead, ...gemini, ...gqRead], solver: [...gqSolve, ...cbSolve, ...gemini, ...nvSolve, llm7] };
  return {
    reader: [...nvRead, ...gemini, ...gqRead],                         // photo padhne wale (key zaroori)
    solver: [...cbSolve, ...gqSolve, ...nvSolve, ...gemini, llm7]      // hal karne wale: tez pehle, aakhir mein bina-key wala
  };
}

// provider ke paas abhi kaunse model hain (ek baar pooch kar yaad rakho)
const lists = new Map();
async function modelsFor(p) {
  const tag = p.name + p.api + (p.pick ? p.pick.source : '');
  const known = goodModel.get(tag);
  let models = p.models;
  if (p.listUrl) {
    if (!lists.has(p.listUrl)) {
      lists.set(p.listUrl, fetchStart(p.listUrl, { headers: { authorization: 'Bearer ' + p.key } }, 3000)
        .then(r => r.ok ? r.json() : null).then(j => j && Array.isArray(j.data) ? j.data.map(m => m.id) : null).catch(() => null));
    }
    const live = await lists.get(p.listUrl);
    if (live) {
      const have = p.models.filter(m => live.includes(m));
      const extra = live.filter(m => p.pick.test(m) && !have.includes(m) && !/guard|whisper|tts|embed|rerank|safety|nemoguard/i.test(m));
      // free server ke "default"/"fast" naam list mein nahi hote par chalte hain: unhe pehle rakho
      if (p.last) models = [...p.models.slice(0, 2), ...extra.slice(0, 4)];
      else if (have.length || extra.length) models = [...have, ...extra].slice(0, 5);
    } else lists.delete(p.listUrl);
  }
  return known && models.includes(known) ? [known, ...models.filter(m => m !== known)] : models;
}

// itne second mein jawab shuru na ho to chhod do (shuru hone ke baad koi time limit nahi)
function fetchStart(url, init, ms = 15000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  return fetch(url, { ...init, signal: ctl.signal }).finally(() => clearTimeout(timer));
}

// ---------- ek server ko request ----------
function call(p, model, input, stream) {
  if (!p.last) markUsed(p.key);
  if (p.api === 'gemini') {   // Vertex AI "express" keys ka apna format
    const part = c => typeof c === 'string' ? [{ text: c }] : c.map(x => x.type === 'text' ? { text: x.text } : { inlineData: { mimeType: 'image/jpeg', data: x.image_url.url.split(',')[1] } });
    const body = {
      systemInstruction: { parts: [{ text: input.system }] },
      contents: input.messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: part(m.content) })),
      generationConfig: { maxOutputTokens: input.max, temperature: input.temp }
    };
    return fetchStart(`https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:${stream ? 'streamGenerateContent?alt=sse' : 'generateContent'}`,
      { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': p.key }, body: JSON.stringify(body) });
  }
  const headers = { 'content-type': 'application/json' };
  if (p.key) headers.authorization = 'Bearer ' + p.key;
  const messages = p.last && input.small ? input.small : input.messages;   // free server ko chhota message
  return fetchStart(p.url, { method: 'POST', headers, body: JSON.stringify({ model, stream, temperature: input.temp, max_tokens: p.last ? Math.min(input.max, 1800) : input.max, messages: [{ role: 'system', content: input.system }, ...messages] }) }, stream ? 15000 : 25000);
}

// limit lagi to key kitni der aaram kare: server ka "retry-after" maano; din ki limit khatam to 1 ghanta
async function restFor(res) {
  if (res.status === 401 || res.status === 403) return 600000;                 // key galat / band: 10 min
  if (res.status !== 429) return 30000;                                        // server gadbad: 30 s
  const after = parseFloat(res.headers.get('retry-after') || '');
  const why = await res.text().catch(() => '');
  if (/per.?day|daily|RPD|TPD|PerDay/i.test(why)) return 3600000;
  const delay = (why.match(/retryDelay"?\s*:\s*"(\d+)/) || [])[1];
  const sec = after > 0 ? after : delay ? +delay : 45;
  return Math.min(Math.max(sec, 5), 6 * 3600) * 1000;
}

// chain mein se pehla server jo haan bole
async function first(chain, input, stream) {
  const tried = [];
  let attempts = 0;
  for (const p of chain) {
    if ((cool.get(p.id) || 0) > Date.now()) continue;
    for (const model of await modelsFor(p)) {
      if (++attempts > 16) return { tried };                 // bahut keys ho sakti hain: 16 koshish tak
      let res;
      try { res = await call(p, model, input, stream); } catch (e) { tried.push(`${p.name}:timeout`); if (p.last) continue; cool.set(p.id, Date.now() + 30000); break; }
      if (res.ok && res.body) {
        goodModel.set(p.name + p.api + (p.pick ? p.pick.source : ''), model);
        return { res, p, model, tried };
      }
      tried.push(`${p.name}:${res.status}`);
      if (res.status === 404 || res.status === 400 || res.status === 422) continue;                           // model nahi / format nahi: agla model
      if (p.last) { await new Promise(done => setTimeout(done, 1200)); continue; }                            // aakhri sahara: thoda ruk kar agla model
      cool.set(p.id, Date.now() + await restFor(res));                                                         // is key ko aaram, agli key
      break;
    }
  }
  return { tried };
}

// ---------- MODEL 1: photo -> text ----------
async function readImage(env, image, prefer) {
  const input = { system: READ, max: 3000, temp: 0, messages: [{ role: 'user', content: [{ type: 'text', text: 'Read this image.' }, { type: 'image_url', image_url: { url: image } }] }] };
  const out = await first(chains(env, prefer).reader, input, false);
  if (!out.res) return { text: '', tried: out.tried };
  try {
    const j = await out.res.json();
    const text = (out.p.api === 'gemini'
      ? (j.candidates?.[0]?.content?.parts || []).map(x => x.thought ? '' : x.text || '').join('')
      : j.choices?.[0]?.message?.content || '').trim();
    return { text: /^NO TEXT\.?$/i.test(text) ? '' : text, by: `${out.p.name} ${out.model}` };
  } catch (e) { return { text: '', tried: out.tried }; }
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

const json = (status, data, extra) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
const okImage = s => typeof s === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 1400000;
function limited(request, bucket, perMinute) {
  const ip = bucket + ((request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'x');
  const now = Date.now(), mine = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (mine.length >= perMinute) return true;
  mine.push(now); hits.set(ip, mine);
  if (hits.size > 8000) hits.clear();
  return false;
}

export default async function handler(request) {
  const env = process.env;
  const url = new URL(request.url);

  if (request.method === 'GET') {
    // site ko batana ki photo padhne wala model hai ya nahi (koi key nahi dikhti)
    if (url.searchParams.get('caps')) return json(200, { vision: chains(env).reader.length > 0 }, { 'cache-control': 'public, max-age=120' });

    // jaanch: har provider ka pehla model chala kar dekhna
    if (url.searchParams.get('diag')) {
      const k = loadKeys(env);
      const report = { keys: { nvidia: k.nvidia.length, groq: k.groq.length, cerebras: k.cerebras.length, gemini: k.gemini.length }, secretSet: !!env.RTUHUB_SECRET, reader: [], solver: [] };
      const c = chains(env);
      for (const kind of ['reader', 'solver']) {
        const seen = new Set();
        const input = kind === 'reader'
          ? { system: 'Reply with just: OK', max: 32, temp: 0, messages: [{ role: 'user', content: [{ type: 'text', text: 'Reply with just: OK' }, { type: 'image_url', image_url: { url: TINY } }] }] }
          : { system: 'Reply with just: OK', max: 32, temp: 0, messages: [{ role: 'user', content: 'Reply with just: OK' }] };
        for (const p of c[kind]) {
          if (seen.has(p.name + p.api) || seen.size > 6) continue;
          seen.add(p.name + p.api);
          const t = Date.now();
          let line = { provider: p.name, api: p.api };
          try {
            const models = await modelsFor(p);
            const res = await call(p, models[0], input, false);
            line = { ...line, model: models[0], status: res.status, ms: Date.now() - t, others: models.slice(1, 4) };
            if (!res.ok) line.note = (await res.text()).replace(/[A-Za-z0-9_\-.]{24,}/g, '***').slice(0, 140);
          } catch (e) { line = { ...line, status: 'error', note: String(e && e.name) }; }
          report[kind].push(line);
        }
      }
      return json(200, report, { 'cache-control': 'public, s-maxage=300' });
    }
    return deny(405, 'POST only');
  }

  if (request.method !== 'POST') return deny(405, 'POST only');
  if (!fromThisSite(request)) return deny(403, 'RTU Hub AI works only on rtuhub.in');
  if (!(await checkToken(readCookie(request, COOKIE)))) return deny(401, 'Session expired. Reload rtuhub.in');

  let body;
  try { body = await request.json(); } catch (e) { return json(400, { error: 'bad' }); }
  const prefer = body.model === 'gemini' || body.model === 'groq' ? body.model : '';   // student ka chuna hua model

  // ---------- sirf padhna: paper ka scan page -> text ----------
  if (body.read) {
    if (!okImage(body.read)) return json(400, { error: 'bad' });
    if (limited(request, 'r', 24)) return json(429, { error: 'slow' });
    const r = await readImage(env, body.read, prefer);
    return r.by ? json(200, { text: r.text, by: r.by }) : json(503, { error: 'noread', tried: (r.tried || []).slice(0, 8) });
  }

  // ---------- sawaal ----------
  if (limited(request, 'q', 8)) return json(429, { error: 'slow', message: 'Bhai thoda ruk, 1 minute mein 8 hi sawaal. Ek minute baad pooch.' });
  const history = (Array.isArray(body.messages) ? body.messages : []).slice(-8)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, 6000) }));
  if (!history.length || history[history.length - 1].role !== 'user') return json(400, { error: 'bad' });

  // CACHE: seedha "Part A Q1 ka answer" jaisa sawaal, photo nahi -> pehle saved jawab dekho (AI request bachti hai)
  const c = body.cache && typeof body.cache === 'object' ? body.cache : null;
  const plain = c && /^[ABC]?$/.test(c.part || '') && Number.isInteger(c.no) && c.no > 0 && c.no < 30 && (c.lang === 'hi' || c.lang === 'en')
    && typeof body.paperText === 'string' && body.paperText.trim().length > 20 && !(Array.isArray(body.images) && body.images.length) && !body.image && !body.attachText;
  const key = plain ? await cacheKey({ prefer, lang: c.lang, part: c.part || '', no: c.no, question: body.paperText.replace(/^--- Page \d+[^\n]*---\n/gm, '').slice(0, 16000) }) : '';
  if (key) {
    const hit = await cacheGet(key);
    if (hit) return new Response(hit.text, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-ai': `${hit.by || 'AI'}`.slice(0, 80), 'x-ai-cache': '1' } });
  }

  // MODEL 1: attach ki hui photos (aur zaroorat ho to page ki photo) padho
  const images = [...(Array.isArray(body.images) ? body.images : []), body.image].filter(okImage).slice(0, 3);
  let attach = typeof body.attachText === 'string' ? body.attachText.slice(0, 9000).trim() : '', reader = '';
  if (images.length) {
    const read = await Promise.all(images.map(img => readImage(env, img, prefer)));
    const got = read.filter(r => r.text);
    if (!got.length && !attach && Array.isArray(body.images) && body.images.length) return json(422, { error: 'noread', message: 'Photo read nahi ho payi.' });
    attach = [attach, ...got.map((r, i) => `[Photo ${i + 1}]\n${r.text}`)].filter(Boolean).join('\n\n');
    reader = got[0] ? got[0].by : '';
  }

  // MODEL 2: hal karo
  const where = `Paper: ${String(body.paper || 'RTU question paper').slice(0, 160)}. ${body.page ? `The student is on page ${+body.page || 1} of ${+body.pages || '?'}.` : ''}`;
  const paperText = typeof body.paperText === 'string' ? body.paperText.slice(0, 16000).trim() : '';
  const last = history.pop();
  const text = where
    + (paperText ? `\n\n===== TEXT OF THE PAPER (your memory) =====\n${paperText}\n===== END OF PAPER =====` : '')
    + (attach ? `\n\n===== TEXT READ FROM THE PHOTO(S) THE STUDENT ATTACHED =====\n${attach.slice(0, 12000)}\n===== END OF PHOTO TEXT =====` : '')
    + (!paperText && !attach ? '\n\n(The paper could not be read right now. If the question is not typed out, ask the student to type it.)' : '')
    + `\n\nStudent: ${last.content}`;
  // free server ke liye chhota roop: sirf student wala page aur aas-paas, pichhli baat-cheet ke 2 message
  const pageNo = +body.page || 1;
  const near = paperText.split(/\n\n(?=--- Page \d+)/).filter(part => { const m = part.match(/^--- Page (\d+)/); return !m || Math.abs(+m[1] - pageNo) <= 1; }).join('\n\n').slice(0, 6000);
  const smallText = where + (near ? `\n\n===== TEXT OF THE PAPER (your memory) =====\n${near}\n===== END OF PAPER =====` : '')
    + (attach ? `\n\n===== TEXT READ FROM THE PHOTO(S) THE STUDENT ATTACHED =====\n${attach.slice(0, 4000)}\n===== END OF PHOTO TEXT =====` : '') + `\n\nStudent: ${last.content}`;
  const out = await first(chains(env, prefer).solver, { system: SOLVE, max: 4096, temp: 0.3, messages: [...history, { role: 'user', content: text }], small: [...history.slice(-2).map(m => ({ role: m.role, content: m.content.slice(0, 1500) })), { role: 'user', content: smallText }] }, true);
  if (!out.res) return json(503, { error: 'busy', message: 'AI abhi busy hai. Ek minute baad dobara pooch.', tried: out.tried.slice(0, 12) });
  // poora jawab aane ke baad cache mein rakh do (adhoora / bahut chhota nahi)
  let full = '';
  const dec = new TextDecoder();
  const stream = key ? toText(out.res, out.p.api).pipeThrough(new TransformStream({
    transform(chunk, ctl) { full += dec.decode(chunk, { stream: true }); ctl.enqueue(chunk); },
    async flush() { if (full.trim().length > 60) await cachePut(key, { text: full, by: `${out.p.name} ${out.model}` }); }
  })) : toText(out.res, out.p.api);
  return new Response(stream, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-ai': `${out.p.name} ${out.model}`.slice(0, 80), 'x-ai-reader': reader.slice(0, 80) }
  });
}
