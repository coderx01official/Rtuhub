// =====================================================================
//  RTU HUB AI — paper viewer ka chatbot. Do model milkar kaam karte hain:
//    1. READER  : photo / scan ko text mein badalta hai   (NVIDIA -> Gemini -> Groq)
//    2. SOLVER  : us text se sawaal hal karta hai          (Cerebras -> Groq -> NVIDIA -> Gemini -> LLM7)
//  Kisi ki limit lag jaye to apne aap agla model / agli key.
//  Student neeche se provider chunta hai (Auto / Groq / Gemini / Cerebras / NVIDIA / OpenRouter / Ollama / HuggingFace /
//  Cloudflare / Pollinations / LLM7) aur chahe to us provider ka koi bhi model (live list: /api/ai?models=groq).
//  Wahi pehle chalta hai; uski saari keys khatam hon tabhi baaki providers (taaki jawab phir bhi mile).
//  RESEARCH button: Tavily se web search (sources + images), AI unhi se [1] [2] citation ke saath jawab deta hai.
//  Keys baant kar chalti hain: jis key par pichhle 1 minute mein sabse kam kaam hua, wahi agle student ko.
//  Ek hi sawaal ka jawab ek baar banta hai, phir sabko cache se (api/_cache.js).
//  Keys: api/_keys.js dekho (Vercel env GROQ_API_KEY_1, GEMINI_API_KEYS, TAVILY_API_KEY_1 ...). Sirf rtuhub.in ke page se chalta hai (api/_auth.js).
//  Jaanch:  /api/ai?diag=1   (kaunsa model chal raha hai; keys kabhi nahi dikhata)
// =====================================================================
import { COOKIE, checkToken, fromThisSite, readCookie, deny } from './_auth.js';
import { loadKeys } from './_keys.js';
import { setNames } from './_env.js';
import { gatherConnectors, verifyConnector } from './_connect.js';
import { vaultTokens } from './_vault.js';
import { cacheKey, cacheGet, cachePut } from './_cache.js';

export const config = { runtime: 'edge' };

const SOLVE = `You are RTU Hub AI, the study buddy inside rtuhub.in for RTU (Rajasthan Technical University) B.Tech students.
You work in two places: (1) inside a previous year question paper the student has open, and (2) as the "AI Assistant" on the dashboard, where no single paper is open but you get a small map of what rtuhub.in has (subjects, paper years, page links) and, when the student names a paper or syllabus, the relevant page(s) of it.
When a paper (or its page) is given, treat it as your memory: when the student says "Q8" or "Part B Q2", find that question in it yourself. The text is read from the PDF, so it can have small spelling mistakes. Never ask the student to type a question that is in the paper or in an attached photo.
You are NOT limited to the paper. The student can ask anything else too: definitions, concepts, doubts, a program ("linked list ka program do"), comparisons, exam tips, career or college questions. Answer those like a normal expert tutor, fully and correctly, without forcing the paper into it. For a program give complete working code in a \`\`\` code block (C by default unless the student names a language), then 3 to 5 lines explaining it.

Tone: talk like a helpful elder brother who has already cleared this exam. Friendly, direct, a little casual ("dekh bhai", "simple hai"), never rude. Reply in the language the student uses (Hindi, Hinglish or English).

For a question FROM THE PAPER, answer length follows the marks of the question. Read the marks from the paper (for example "10x2=20" means each question is 2 marks, "5x4=20" means 4 marks each):
- 2 marks: 3 to 4 lines.
- 4 or 5 marks: 6 to 7 lines.
- 10 marks or more: 12 to 13 lines, with a small example or a described diagram where it helps.
- Marks not clear: guess from the part (Part A short, Part B medium, Part C long) and say which you assumed.
If the student asks for a different length, follow the student.

Format every paper-question answer like this:
1. First line: the question, as "Q8 (2 marks): <question text>".
2. Then the answer, exam-ready, as short numbered points or lines.
- Straight to the point: no greeting, no "great question", no repeating what the student said, no closing lines like "hope this helps" or "all the best". Stop when the answer is complete.
- You are given only the page(s) where the question is. Answer from them; do not ask for other pages unless the question is truly missing.
- For a scanned paper you get PHOTOS of those page(s) instead of text: read the photos yourself, find the asked question, and answer it.
- Numerical, derivation or any maths/physics/electrical problem: write it the way a topper writes it in the exam copy, simple and easy to follow:
  **Given:** the values with units, one per line.
  **To find:** what is asked.
  **Formula:** the formula on its own line.
  **Solution:** one step per line, each step on its own line as a formula, with a few plain words saying what you did ("put the values", "both sides divide karo").
  **Answer:** the final result with unit, on its own line, like $$\\boxed{F = 20\\ \\text{N}}$$
- Explain in simple, friendly words, like a senior explaining to a junior. No heavy words when a simple one works.
- Same question number in two parts (Part A Q1 and Part B Q1): answer the one from the part on the student's current page, and mention the other in one line.
- A question number that is really not in the given paper or photo: say so in one line and ask which paper or page.
- When you mention something on rtuhub.in, link it with its path from the site map, like [DSA PYQ](/2ndyear/cse/pyq/data-structures-and-algorithms). Only use paths from the site map; never invent links, never give file or storage links.
- Write EVERY formula, equation, power, fraction, root, integral, matrix or unit with maths in LaTeX so it shows like a printed paper: inside a line use $...$ (for example $2^4 = 16$, $v = u + at$, $\\frac{1}{2}mv^2$); a main formula or a step goes on its own line as $$...$$. Never write powers as 2^4 or fractions as a/b outside $...$. Use \\frac, \\sqrt, \\int, \\sum, \\theta, \\times, ^{} and _{} as normal LaTeX. Do not use $ for money; write Rs or ₹.
- Simple Markdown only: **bold**, - lists, 1. lists, ## for a heading when the answer is long.
- Help with anything a student reasonably asks. Refuse only harmful or unsafe requests, politely.`;

const READ = `You are an exact reader for exam papers and study material. Copy out EVERYTHING written in this image as plain text, in reading order.
Keep question numbers, part names, marks (like [8] or 10x2=20), formulas and tables. Write maths in plain text with Unicode (x², √, θ, π).
For a diagram, circuit or graph, add one line in square brackets describing it, for example [Diagram: RC circuit with R = 2 Ω and C = 1 F in series].
Do not solve anything, do not add comments. If the image has no readable text, reply exactly: NO TEXT`;

const TINY = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAAgACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD06iiigAooooAKKKKACiiigD//2Q==';   // jaanch ke liye chhoti safed photo

const cool = new Map();      // key -> timestamp jab tak ise chhod do
const goodModel = new Map(); // provider -> model jo chal gaya
const used = new Map();      // key -> pichhle 1 minute ke kaam (timestamps)
const slow = new Map();      // "key|model" -> kab tak us MODEL ki limit lagi hai (429). Groq/Gemini mein har model ki limit alag hoti hai.
const dead = new Map();      // server id (key + endpoint) -> kab tak band hai (401 / API enable nahi)
const blocked = new Map();   // "key|model" -> kab tak ye model is key ko nahi milega (403 "denied access", 404 "not available to new users")
const resolved = new Map();  // provider tag -> modelsFor ne jo models diye (status ke liye)
const tagOf = p => p.name + p.api + (p.pick ? p.pick.source : '') + (p.amc ? '|' + p.models[0] : '');
// har model ka haal (chat ke neeche dikhta hai):
//   down = us provider ki SAARI keys band (401/403)  -> "Unavailable"
//   busy = jo keys chal rahi hain, un sab ke SAARE models limit par (429)  -> "High traffic"
function busyList(env) {
  const now = Date.now(), out = {}, sol = chains(env).solver;
  for (const { id } of PROVIDERS) {
    const mine = sol.filter(p => p.prov === id);
    if (!mine.length) continue;
    const keys = [...new Set(mine.map(p => p.key))];
    if (id === 'llm7' && !loadKeys(env).llm7.length) { out[id] = { keys: 0, down: false, busy: false }; continue; }
    const up = p => (dead.get(p.id) || 0) <= now;
    const usable = (p, k) => (resolved.get(tagOf(p)) || p.models).filter(m => (blocked.get(k + '|' + m) || 0) <= now);
    const alive = keys.filter(k => mine.some(p => p.key === k && up(p) && usable(p, k).length));
    const free = alive.filter(k => mine.some(p => p.key === k && up(p) && usable(p, k).some(m => (slow.get(k + '|' + m) || 0) <= now)));
    out[id] = { keys: keys.length, down: keys.length > 0 && !alive.length, busy: alive.length > 0 && !free.length };
  }
  return out;
}
// har key + model ka alag hisaab (Groq / Gemini mein limit har model ki alag hoti hai)
const usedM = new Map();
const recentM = id => { const now = Date.now(), list = (usedM.get(id) || []).filter(t => now - t < 60000); usedM.set(id, list); return list.length; };
const markM = id => { if (usedM.size > 3000) usedM.clear(); usedM.set(id, [...(usedM.get(id) || []), Date.now()]); };
const fnv = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const recent = key => { const now = Date.now(), list = (used.get(key) || []).filter(t => now - t < 60000); used.set(key, list); return list.length; };
const markUsed = key => { if (used.size > 600) used.clear(); if (slow.size > 2000) slow.clear(); if (blocked.size > 2000) blocked.clear(); used.set(key, [...(used.get(key) || []), Date.now()]); };
const hits = new Map();      // ip -> request times (halka rate limit)

// ---------- saare providers (chat ke neeche isi kram mein dikhte hain; jinki key nahi, wo chhup jaate hain) ----------
export const PROVIDERS = [
  { id: 'groq', name: 'Groq', tip: 'Fast', icon: 'bolt' },
  { id: 'gemini', name: 'Gemini', tip: 'Math + vision', icon: 'gem' },
  { id: 'cerebras', name: 'Cerebras', tip: 'Fastest', icon: 'rocket' },
  { id: 'nvidia', name: 'NVIDIA', tip: 'Large models', icon: 'microchip' },
  { id: 'openrouter', name: 'OpenRouter', tip: 'Free models', icon: 'route' },
  { id: 'ollama', name: 'Ollama', tip: 'Cloud models', icon: 'cloud' },
  { id: 'hf', name: 'Hugging Face', tip: 'Open models', icon: 'smile' },
  { id: 'cloudflare', name: 'Cloudflare', tip: 'Workers AI', icon: 'cloud-sun' },
  { id: 'pollinations', name: 'Pollinations', tip: 'Extra', icon: 'seedling' },
  { id: 'llm7', name: 'LLM7', tip: 'Backup', icon: 'life-ring' }
];
const AUTO_ORDER = ['groq', 'gemini', 'cerebras', 'nvidia', 'openrouter', 'ollama', 'hf', 'cloudflare', 'pollinations', 'llm7'];
// ===== AMC (Automatic Model Choice) — smart baantna =====
// Har (key, model) ek "lane". Groq sabse tez -> pehli tier; Gemini (sabse zyada keys) -> doosri; Cerebras -> teesri.
// Lane ka number = tier + us lane par pichhle 1 min ka kaam + student ke IP ka hash.
// Isse 20+ students (alag IP) apne-aap alag key + alag model par bat jaate hain; har student apni lane par tikta hai,
// aur limit (429) lagi lane chhod kar agli. Live model list mein jo model nahi, wo lane chhod di jaati hai.
const AMC_LANES = [
  { tier: 0, prov: 'groq', models: ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'qwen/qwen3-32b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b'] },
  { tier: 1, prov: 'gemini', models: ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash'] },
  { tier: 2, prov: 'cerebras', models: ['gpt-oss-120b', 'qwen-3-235b-a22b-instruct-2507'] }
];
const okExact = m => typeof m === 'string' && /^[\w.:/@+\-]{2,120}$/.test(m) ? m : '';

// ---------- kaun-kaun se AI server, kis kram mein ----------
function chains(env, prefer = '', exact = '', seed = '') {
  if (env.AI_TEST_BASE) {
    const test = { id: 'test', name: 'test', prov: 'groq', api: 'openai', url: env.AI_TEST_BASE, key: 'test', models: ['test-model'] };
    return { reader: env.AI_TEST_VISION === '0' ? [] : [test], solver: [test], seer: [test] };
  }
  const k = loadKeys(env);
  // sabse khaali key pehle (ek saath 10 students = alag-alag keys); barabar ho to koi bhi
  const rotate = list => list.map(key => [key, recent(key), Math.random()]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(x => x[0]);
  const make = (prov, list, name, url, models, pick, listUrl) => rotate(list).map(key => ({ id: name + pick.source.length + key, prov, name, api: 'openai', url, key, models, pick, listUrl }));
  const NV = 'https://integrate.api.nvidia.com/v1/', GQ = 'https://api.groq.com/openai/v1/', CB = 'https://api.cerebras.ai/v1/';
  const OR = 'https://openrouter.ai/api/v1/', OL = 'https://ollama.com/', HF = 'https://router.huggingface.co/v1/', PO = 'https://gen.pollinations.ai/v1/';
  const nvRead = make('nvidia', k.nvidia, 'NVIDIA', NV + 'chat/completions',
    ['meta/llama-4-maverick-17b-128e-instruct', 'meta/llama-3.2-90b-vision-instruct', 'google/gemma-3-27b-it', 'microsoft/phi-4-multimodal-instruct', 'meta/llama-3.2-11b-vision-instruct'],
    /vision|llama-4|gemma-3-(12|27)b|multimodal|pixtral|-vl-/i, NV + 'models');
  const nvSolve = make('nvidia', k.nvidia, 'NVIDIA', NV + 'chat/completions',
    ['openai/gpt-oss-120b', 'meta/llama-3.3-70b-instruct', 'moonshotai/kimi-k2-instruct', 'qwen/qwen3-235b-a22b', 'meta/llama-3.1-70b-instruct'],
    /gpt-oss-120b|llama-3\.3-70b|kimi-k2|qwen3-235b/i, NV + 'models');
  const gqRead = make('groq', k.groq, 'Groq', GQ + 'chat/completions', ['meta-llama/llama-4-scout-17b-16e-instruct', 'meta-llama/llama-4-maverick-17b-128e-instruct'], /scout|maverick|vision/i, GQ + 'models');
  const gqSolve = make('groq', k.groq, 'Groq', GQ + 'chat/completions', ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'moonshotai/kimi-k2-instruct', 'qwen/qwen3-32b', 'openai/gpt-oss-20b'], /gpt-oss|llama-3\.3-70b|llama-4|kimi|qwen|deepseek/i, GQ + 'models');
  const cbSolve = make('cerebras', k.cerebras, 'Cerebras', CB + 'chat/completions', ['gpt-oss-120b', 'llama-3.3-70b', 'qwen-3-235b-a22b-instruct-2507', 'llama3.1-8b'], /gpt-oss|llama-3\.3|qwen-3|llama3\.1/i, CB + 'models');
  // OpenRouter: sirf ":free" models (paisa kabhi nahi katega)
  const orSolve = make('openrouter', k.openrouter, 'OpenRouter', OR + 'chat/completions',
    ['openai/gpt-oss-120b:free', 'deepseek/deepseek-chat-v3.1:free', 'meta-llama/llama-3.3-70b-instruct:free', 'qwen/qwen3-235b-a22b:free', 'z-ai/glm-4.5-air:free'], /:free$/, OR + 'models');
  const olSolve = make('ollama', k.ollama, 'Ollama', OL + 'v1/chat/completions',
    ['gpt-oss:120b', 'deepseek-v3.1:671b', 'qwen3-coder:480b', 'kimi-k2:1t', 'gemma4:31b'], /gpt-oss|deepseek|qwen|kimi|gemma|glm|llama|mistral/i, OL + 'api/tags');
  const hfSolve = make('hf', k.hf, 'HuggingFace', HF + 'chat/completions',
    ['openai/gpt-oss-120b', 'deepseek-ai/DeepSeek-V3.1', 'Qwen/Qwen3-235B-A22B-Instruct-2507', 'meta-llama/Llama-3.3-70B-Instruct'], /gpt-oss|deepseek|qwen3|llama-3\.3|kimi|glm/i, HF + 'models');
  const poSolve = make('pollinations', k.pollinations, 'Pollinations', PO + 'chat/completions', ['openai', 'openai-fast', 'mistral', 'deepseek'], /openai|mistral|deepseek|qwen|llama|gemini/i, PO + 'models');
  const cfSolve = k.cfAccount ? rotate(k.cloudflare).map(key => ({ id: 'cf' + key, prov: 'cloudflare', name: 'Cloudflare', api: 'openai', key,
    url: `https://api.cloudflare.com/client/v4/accounts/${k.cfAccount}/ai/v1/chat/completions`, models: ['@cf/openai/gpt-oss-120b', '@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/qwen/qwq-32b'] })) : [];
  // AIza... = AI Studio key (generativelanguage), AQ.... = Vertex express key (aiplatform): har key pehle apne endpoint par.
  // Galat endpoint 403 de to sirf wahi endpoint band hota hai, key nahi (dekho `dead`).
  // Models Google ki live list se: jo naam band ho jaye (jaise 2.5-flash naye users ke liye) wo apne aap hat jata hai.
  const GM = 'https://generativelanguage.googleapis.com/v1beta/openai/';
  const GEM = ['gemini-3-flash-preview', 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'];
  const gemini = rotate(k.gemini).flatMap(key => [
    { id: 'gem' + key, prov: 'gemini', name: 'Gemini', api: 'openai', url: GM + 'chat/completions', key, models: GEM, pick: /^gemini-[\d.]+-flash(-lite)?(-preview)?$|^gemini-flash(-lite)?-latest$/, listUrl: GM + 'models' },
    { id: 'vtx' + key, prov: 'gemini', name: 'Gemini', api: 'gemini', key, models: ['gemini-2.5-flash', 'gemini-flash-latest'] }
  ]);
  // LLM7: aakhri sahara (key ho to wahi, warna bina key). Ise kabhi "band" nahi karte, chhota message bhejte hain.
  const llm7 = { id: 'llm7', prov: 'llm7', name: 'LLM7', api: 'openai', url: 'https://api.llm7.io/v1/chat/completions', key: k.llm7[0] || 'unused', last: true,
    models: ['default', 'fast', 'gpt-4.1-nano-2025-04-14'], pick: /gpt|mistral|llama|qwen|deepseek|gemini/i, listUrl: 'https://api.llm7.io/v1/models' };
  const solvers = { cerebras: cbSolve, groq: gqSolve, nvidia: nvSolve, gemini, openrouter: orSolve, ollama: olSolve, hf: hfSolve, cloudflare: cfSolve, pollinations: poSolve, llm7: [llm7] };
  // student ka chuna hua provider sabse pehle (aur uska chuna hua model us provider mein sabse pehle); baaki Auto kram mein
  const want = solvers[prefer] ? prefer : '';
  const pin = exact && want ? list => list.map(p => ({ ...p, exact })) : list => list;
  // AMC: lanes ko load + IP ke hisaab se kram mein, phir baaki providers (purana kram) fallback
  const amc = () => {
    const base = { groq: { url: GQ + 'chat/completions', list: GQ + 'models', name: 'Groq' }, gemini: { url: GM + 'chat/completions', list: GM + 'models', name: 'Gemini' }, cerebras: { url: CB + 'chat/completions', list: CB + 'models', name: 'Cerebras' } };
    const lanes = [];
    for (const L of AMC_LANES) for (const key of k[L.prov] || []) L.models.forEach((m, mi) => {
      const b = base[L.prov];
      lanes.push({ score: L.tier * 4 + mi * 0.35 + recentM(key + '|' + m) * 1.2 + recent(key) * 0.15 + fnv(seed + '|' + key + '|' + m) * 1.5,
        p: { id: 'amc' + L.prov + key + m, prov: L.prov, name: b.name, api: 'openai', url: b.url, key, models: [m], pick: /^$/, listUrl: b.list, amc: true } });
    });
    return lanes.sort((a, b) => a.score - b.score).map(x => x.p);
  };
  const solver = want ? [...pin(solvers[want]), ...AUTO_ORDER.filter(id => id !== want).flatMap(id => solvers[id])]
    : [...amc(), ...AUTO_ORDER.flatMap(id => solvers[id])];
  // seer: scan page ki PHOTO dekh kar seedha jawab (padhna + hal ek hi call mein). Gemini sabse tez aur sahi.
  if (want === 'gemini') return { reader: [...gemini, ...nvRead, ...gqRead], solver, seer: [...pin(gemini), ...nvRead, ...gqRead] };
  if (want === 'groq') return { reader: [...nvRead, ...gemini, ...gqRead], solver, seer: [...gqRead, ...gemini, ...nvRead] };
  return {
    reader: [...nvRead, ...gemini, ...gqRead],    // photo padhne wale (key zaroori)
    solver,                                        // hal karne wale: tez pehle, aakhir mein LLM7
    seer: [...gemini, ...nvRead, ...gqRead]
  };
}

// provider ke paas abhi kaunse model hain (ek baar pooch kar yaad rakho)
const lists = new Map();
function liveList(p) {
  if (!p.listUrl) return Promise.resolve(null);
  if (!lists.has(p.listUrl)) {
    lists.set(p.listUrl, fetchStart(p.listUrl, { headers: p.key && p.key !== 'unused' ? { authorization: 'Bearer ' + p.key } : {} }, 4000)
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        const rows = j && (Array.isArray(j.data) ? j.data : Array.isArray(j.models) ? j.models : null);   // Ollama: { models: [{ name }] }
        return rows ? rows.map(m => String(m.id || m.name || m.model || '').replace(/^models\//, '')).filter(Boolean) : null;   // Gemini 'models/...' deta hai
      }).catch(() => null)
      .then(v => { if (!v) setTimeout(() => lists.delete(p.listUrl), 60000); return v; }));
  }
  return lists.get(p.listUrl);
}
const NOT_CHAT = /orpheus|reward|detector|calibration|deplot|diffusion|nano-banana|guard|whisper|tts|embed|rerank|safety|nemoguard|imagen|veo|-image|image-|audio|speech|transcri|moderation|-live|clip|bge|retriever|parse|ocr|nv-embed|aqa|robotics|computer-use/i;
async function modelsFor(p) {
  const tag = tagOf(p);
  const known = goodModel.get(tag);
  let models = p.models;
  const live = await liveList(p);
  if (live) {
    const have = p.models.filter(m => live.includes(m));
    const extra = live.filter(m => p.pick.test(m) && !have.includes(m) && !NOT_CHAT.test(m));
    // free server ke "default"/"fast" naam list mein nahi hote par chalte hain: unhe pehle rakho
    if (p.last) models = [...p.models.slice(0, 2), ...extra.slice(0, 4)];
    else if (have.length || extra.length) models = [...have, ...extra].slice(0, 5);
    else if (!p.exact) return [];                     // is provider ke paas aisa model hi nahi (jaise Groq par photo wala): seedha chhodo
  }
  resolved.set(tag, models);
  if (p.exact) return [p.exact, ...models.filter(m => m !== p.exact)];   // student ka chuna hua model sabse pehle
  return known && models.includes(known) ? [known, ...models.filter(m => m !== known)] : models;
}

// ---------- WEB RESEARCH (Tavily): sources + images ----------
const webCache = new Map();   // sawaal -> { at, data }
async function research(env, q, deep = false) {
  const query = q.replace(/\s+/g, ' ').trim().slice(0, 380);
  const ck = (deep ? 'deep|' : '') + query.toLowerCase();
  const hit = webCache.get(ck);
  if (hit && Date.now() - hit.at < 15 * 60000) return hit.data;
  const keys = loadKeys(env).tavily.map(key => [key, recent(key), Math.random()]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(x => x[0]);
  for (const key of keys) {
    if ((cool.get('tv' + key) || 0) > Date.now()) continue;
    markUsed(key);
    let res;
    try {
      res = await fetchStart('https://api.tavily.com/search', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
        body: JSON.stringify({ query, search_depth: deep ? 'advanced' : 'basic', max_results: deep ? 10 : 6, ...(deep ? { chunks_per_source: 3 } : {}), include_images: true, include_image_descriptions: true, include_answer: false, topic: 'general' }) }, deep ? 20000 : 12000);
    } catch (e) { cool.set('tv' + key, Date.now() + 30000); continue; }
    if (!res.ok) { cool.set('tv' + key, Date.now() + (res.status === 401 || res.status === 403 ? 6 * 3600000 : res.status === 429 ? 60000 : 3600000)); continue; }   // 432/433 = mahine ki limit
    const j = await res.json().catch(() => null);
    if (!j) continue;
    const safe = u => typeof u === 'string' && /^https:\/\/[^\s"'<>]{4,600}$/.test(u);
    const sources = (j.results || []).filter(r => safe(r.url)).slice(0, deep ? 10 : 6).map(r => ({ t: String(r.title || r.url).slice(0, 110), u: r.url, c: String(r.content || '').replace(/\s+/g, ' ').slice(0, deep ? 1600 : 900) }));
    const images = (j.images || []).map(x => typeof x === 'string' ? { url: x } : x).filter(x => x && safe(x.url)).slice(0, 8).map(x => ({ u: x.url, d: String(x.description || '').replace(/\s+/g, ' ').slice(0, 140) }));
    const data = { sources, images, deep };
    if (webCache.size > 300) webCache.clear();
    webCache.set(ck, { at: Date.now(), data });
    return data;
  }
  return null;
}
const WEB_RULE = `\n\nWEB RESEARCH MODE: live web results are given below the student's message as numbered sources [1], [2] ... Use them for facts, dates, numbers and anything recent; cite the source number right after the fact, like "RTU ne result 12 Oct ko jaari kiya [2]". Combine several sources into one clear answer; do not just list them. If the sources do not cover the question, say so in one line and answer from your own knowledge. Images found on the web are shown to the student below your answer automatically: never paste image or source URLs yourself.`;
const DEEP_RULE = `\n\nDEEP RESEARCH MODE: the student wants a thorough, well organised report, not a quick reply. Structure it as: a 2 to 3 line summary first; then ## sections covering every important angle (what, why, how, numbers/dates, comparisons, pros and cons where relevant); then "## Key takeaways" as 3 to 6 bullet points. Use as many of the sources as are relevant and cite each fact with its number [n]. Point out when sources disagree. Length can be long (400 to 900 words) when the topic needs it.`;
const CONN_RULE = `\n\nCONNECTORS: live data from GitHub, Vercel or YouTube is given below the student's message. Treat it as the source of truth: explain code from the real files, debug failed builds from the real log lines, summarise videos from the transcript (with [m:ss] time marks for key points). Say clearly if something could not be read. Never print tokens or secrets.`;
const webBlock = (web, short) => !web || !web.sources.length ? '' : `\n\n===== WEB RESEARCH (live search results) =====\n${web.sources.map((s, i) => `[${i + 1}] ${s.t} — ${s.u}\n${s.c.slice(0, short ? 300 : 900)}`).join('\n\n')}${web.images.length ? `\n(Images found: ${web.images.map(x => x.d).filter(Boolean).slice(0, 4).join('; ') || web.images.length})` : ''}\n===== END OF WEB RESEARCH =====`;
const b64 = s => { let x = ''; for (const c of new TextEncoder().encode(s)) x += String.fromCharCode(c); return btoa(x); };
const webHeader = web => web ? { 'x-ai-web': b64(JSON.stringify({ s: web.sources.map(({ t, u }) => ({ t, u })), i: web.images, d: web.deep ? 1 : 0 })) } : {};

// itne second mein jawab shuru na ho to chhod do (shuru hone ke baad koi time limit nahi)
function fetchStart(url, init, ms = 15000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  return fetch(url, { ...init, signal: ctl.signal }).finally(() => clearTimeout(timer));
}

// ---------- ek server ko request ----------
function call(p, model, input, stream) {
  if (!p.last) { markUsed(p.key); markM(p.key + '|' + model); }
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
async function restFor(res, why) {
  if (res.status === 401 || res.status === 403) return 1800000;                // key galat / project block: 30 min (redeploy par phir se try)
  if (res.status !== 429) return 20000;                                        // server overload (503 "high demand") / gadbad: 20 s
  const after = parseFloat(res.headers.get('retry-after') || '');
  if (/per.?day|daily|RPD|TPD|PerDay/i.test(why)) return 3600000;
  const delay = (why.match(/retryDelay"?\s*:\s*"(\d+)/) || [])[1];
  const sec = after > 0 ? after : delay ? +delay : 45;
  return Math.min(Math.max(sec, 5), 6 * 3600) * 1000;
}

// chain mein se pehla server jo haan bole
async function first(chain, input, stream) {
  const tried = [], gone = new Set(), tooBig = new Set();   // tooBig: is request ke liye jis provider ne "bahut bada" (413) bola   // is request mein jo model "nahi hai" bola, use doosri key par dobara mat pucho
  let attempts = 0;
  for (const p of chain) {
    if ((cool.get(p.id) || 0) > Date.now() || (dead.get(p.id) || 0) > Date.now() || tooBig.has(p.name)) continue;
    for (const model of await modelsFor(p)) {
      if (gone.has(p.name + p.api + model)) continue;
      if (!p.last && ((slow.get(p.key + '|' + model) || 0) > Date.now() || (blocked.get(p.key + '|' + model) || 0) > Date.now())) continue;   // is key par ye model abhi nahi: bina call kiye agla
      if (++attempts > 24) return { tried };                 // bahut keys ho sakti hain: 24 koshish tak
      let res;
      try { res = await call(p, model, input, stream); } catch (e) { tried.push(`${p.name}:timeout`); if (p.last) continue; cool.set(p.id, Date.now() + 30000); break; }
      if (res.ok && res.body) {
        if (!p.exact) goodModel.set(tagOf(p), model);
        return { res, p, model, tried };
      }
      tried.push(`${p.name}:${res.status}`);
      if (res.status === 413) { tooBig.add(p.name); break; }                                                 // itna lamba message is provider ki limit se bahar: agla provider
      if (res.status === 400 || res.status === 422) { gone.add(p.name + p.api + model); continue; }            // is request ka format ye model nahi leta: agla model
      if (p.last) { await new Promise(done => setTimeout(done, 1200)); continue; }                            // aakhri sahara: thoda ruk kar agla model
      const why = await res.text().catch(() => '');
      // 404 = is KEY ko ye model nahi milta (Gemini: "no longer available to new users"): 6 ghante ke liye sirf ye key+model chhodo
      if (res.status === 404) { blocked.set(p.key + '|' + model, Date.now() + 6 * 3600000); continue; }
      const rest = await restFor(res, why);
      if (res.status === 429 || res.status >= 500) { slow.set(p.key + '|' + model, Date.now() + rest); continue; }   // limit / Google overload: sirf ISI model ko aaram, isi key ka agla model
      // 403: endpoint hi band (API enable nahi / key galat) -> poora endpoint; warna sirf ye model is project ko mana hai ("denied access")
      if (res.status === 401 || (res.status === 403 && /not been used|is disabled|not enabled|SERVICE_DISABLED|API_KEY_INVALID|API key not valid/i.test(why))) { dead.set(p.id, Date.now() + rest); break; }
      if (res.status === 403) { blocked.set(p.key + '|' + model, Date.now() + rest); continue; }
      cool.set(p.id, Date.now() + rest);                                                                       // kuch aur gadbad: thoda aaram, agli key
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
    if (url.searchParams.get('caps')) {   // koi AI call nahi, sirf haal: kaunse providers hain (key wale), kaun busy, research hai ya nahi
      const st = busyList(env);
      return json(200, { vision: chains(env).reader.length > 0, models: st, research: loadKeys(env).tavily.length > 0, stt: loadKeys(env).groq.length > 0,
        providers: PROVIDERS.filter(p => st[p.id]).map(p => ({ ...p, keys: st[p.id].keys })) });
    }
    // ek provider ke SAARE chat models (student dropdown se koi bhi chun sake):  /api/ai?models=groq
    const want = url.searchParams.get('models');
    if (want) {
      const p = chains(env).solver.find(x => x.prov === want && x.listUrl);
      const fixed = chains(env).solver.filter(x => x.prov === want).flatMap(x => x.models);
      let all = p ? await liveList(p) : null;
      if (all) all = all.filter(m => !NOT_CHAT.test(m) && (want !== 'openrouter' || /:free$/.test(m)) && (want !== 'gemini' || /^(gemini|gemma)/.test(m)));   // OpenRouter: sirf free
      const list = [...new Set(all && all.length ? all : fixed)].sort().slice(0, 150);   // live list na mile to apni default list
      return json(200, { provider: want, models: list }, { 'cache-control': 'public, s-maxage=1800' });
    }

    // jaanch: HAR key alag se, uske apne model list ke saath (key kabhi nahi dikhti, sirf number + status):  /api/ai?diag=keys
    if (url.searchParams.get('diag') === 'keys') {
      const k = loadKeys(env), input = { system: 'Reply with just: OK', max: 16, temp: 0, messages: [{ role: 'user', content: 'Reply with just: OK' }] };
      const short = async res => res.ok ? '' : (await res.text().catch(() => '')).replace(/[A-Za-z0-9_\-.]{24,}/g, '***').replace(/\s+/g, ' ').slice(0, 110);
      const list = async (u, key) => { try { const r = await fetchStart(u, { headers: { authorization: 'Bearer ' + key } }, 5000); const j = r.ok ? await r.json() : null; return j && Array.isArray(j.data) ? j.data.map(m => String(m.id).replace(/^models\//, '')) : null; } catch (e) { return null; } };
      const late = ms => new Promise(done => setTimeout(() => done(null), ms));
      const test = async (p, model) => { try { const res = await Promise.race([call(p, model, input, false), late(9000)]); return res ? [model, res.status, await short(res)] : [model, 'slow', '']; } catch (e) { return [model, 'timeout', '']; } };
      const onlyP = url.searchParams.get('p'), onlyK = +url.searchParams.get('k') || 0;   // ?diag=keys&p=gemini&k=3 : sirf ek provider / ek key
      const pickK = (arr, prov) => (onlyP && onlyP !== prov ? [] : arr).map((key, i) => [key, i]).filter(([, i]) => !onlyK || i + 1 === onlyK);
      const GQ = 'https://api.groq.com/openai/v1/', GM = 'https://generativelanguage.googleapis.com/v1beta/openai/';
      const rows = await Promise.all([
        ...pickK(k.groq, 'groq').map(async ([key, i]) => {
          const have = await list(GQ + 'models', key);
          const p = { name: 'Groq', api: 'openai', url: GQ + 'chat/completions', key, last: true };
          const want = ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'moonshotai/kimi-k2-instruct', 'qwen/qwen3-32b'].filter(m => !have || have.includes(m));
          return { provider: 'Groq', key: i + 1, listed: have ? have.length : 'list failed', tests: await Promise.all(want.map(m => test(p, m))) };
        }),
        ...pickK(k.gemini, 'gemini').map(async ([key, i]) => {
          const have = await list(GM + 'models', key);
          const p = { name: 'Gemini', api: 'openai', url: GM + 'chat/completions', key, last: true };
          const flash = (have || []).filter(m => /flash/.test(m) && !/image|tts|audio|live|embed|exp|thinking|8b/.test(m)).slice(0, 8);
          const want = [...new Set(['gemini-flash-latest', 'gemini-2.5-flash', ...flash])].slice(0, 6);
          return { provider: 'Gemini', key: i + 1, type: key.startsWith('AQ.') ? 'vertex-express' : 'ai-studio', listed: have ? flash : 'list failed', tests: await Promise.all(want.map(m => test(p, m))) };
        })
      ]);
      return json(200, { checked: new Date().toISOString(), rows }, { 'cache-control': 'public, s-maxage=600' });
    }

    // jaanch: Vercel par kaunse key-NAAM set hain (sirf naam, value kabhi nahi):  /api/ai?diag=names
    if (url.searchParams.get('diag') === 'names') return json(200, { names: setNames(), build: String(process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7), env: process.env.VERCEL_ENV || '', keysLen: String(process.env.RTUHUB_KEYS || '').length });

    // jaanch: har provider ka pehla model chala kar dekhna
    if (url.searchParams.get('diag')) {
      const k = loadKeys(env);
      const report = { keys: Object.fromEntries(Object.entries(k).filter(([, v]) => Array.isArray(v)).map(([id, v]) => [id, v.length])), cloudflareAccount: !!k.cfAccount, secretSet: !!env.RTUHUB_SECRET, reader: [], solver: [] };
      const c = chains(env);
      for (const kind of ['reader', 'solver']) {
        const seen = new Set();
        const input = kind === 'reader'
          ? { system: 'Reply with just: OK', max: 32, temp: 0, messages: [{ role: 'user', content: [{ type: 'text', text: 'Reply with just: OK' }, { type: 'image_url', image_url: { url: TINY } }] }] }
          : { system: 'Reply with just: OK', max: 32, temp: 0, messages: [{ role: 'user', content: 'Reply with just: OK' }] };
        for (const p of c[kind]) {
          if (seen.has(p.name + p.api) || seen.size > 12) continue;
          seen.add(p.name + p.api);
          const t = Date.now();
          let line = { provider: p.name, api: p.api };
          try {
            const models = await modelsFor(p);
            if (!models.length) { report[kind].push({ ...line, status: 'skip', note: 'is provider par aisa model nahi' }); continue; }
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
  const prefer = PROVIDERS.some(p => p.id === body.model) ? body.model : '';   // student ka chuna hua provider ('' = Auto)
  const exact = prefer ? okExact(body.exact) : '';
  const ipSeed = (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '').split(',')[0].trim();   // AMC: har student alag lane                              // aur us provider ka chuna hua model (khaali = sabse accha apne aap)

  // ---------- VOICE: mic ki recording -> text (Groq Whisper; Hindi / Hinglish / English) ----------
  if (body.transcribe) {
    if (limited(request, 'a', 15)) return json(429, { error: 'slow', message: 'Thoda ruk, 1 minute mein 15 voice message.' });
    const m = String(body.transcribe).match(/^data:(audio\/[\w.+-]+)(?:;[^,]*)?;base64,([A-Za-z0-9+/=]+)$/);
    if (!m || m[2].length > 5500000) return json(400, { error: 'bad', message: 'Recording bahut lambi hai (3 min tak).' });
    const bin = atob(m[2]), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const ext = /mp4|m4a|aac/.test(m[1]) ? 'm4a' : /ogg/.test(m[1]) ? 'ogg' : /wav/.test(m[1]) ? 'wav' : /mpeg|mp3/.test(m[1]) ? 'mp3' : 'webm';
    const lang = body.lang === 'en' || body.lang === 'hi' ? body.lang : '';
    const hint = lang === 'hi' ? 'भाई, लिंक्ड लिस्ट का प्रोग्राम दो और डेडलॉक समझाओ।'
      : 'Bhai, linked list ka program do aur deadlock samjhao. RTU PYQ, syllabus, Part A Q1, DBMS, OS, DSA.';   // Hinglish: Roman script mein
    const keys = loadKeys(env).groq.map(k => [k, recent(k), Math.random()]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(x => x[0]);
    for (const model of ['whisper-large-v3-turbo', 'whisper-large-v3']) {
      for (const key of keys) {
        if ((slow.get(key + '|' + model) || 0) > Date.now() || (dead.get('stt' + key) || 0) > Date.now()) continue;
        markUsed(key);
        const fd = new FormData();
        fd.append('file', new Blob([bytes], { type: m[1].split(';')[0] }), 'voice.' + ext);
        fd.append('model', model); fd.append('response_format', 'json'); fd.append('temperature', '0'); fd.append('prompt', hint);
        if (lang) fd.append('language', lang);
        let res;
        try { res = await fetchStart('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { authorization: 'Bearer ' + key }, body: fd }, 25000); } catch (e) { continue; }
        if (res.ok) { const j = await res.json().catch(() => ({})); return json(200, { text: String(j.text || '').trim(), by: model }); }
        const why = await res.text().catch(() => '');
        if (res.status === 429) slow.set(key + '|' + model, Date.now() + await restFor(res, why));
        else if (res.status === 401 || res.status === 403) dead.set('stt' + key, Date.now() + 1800000);
        else if (res.status === 400) return json(422, { error: 'audio', message: 'Awaaz samajh nahi aayi, dobara bolo.' });
      }
    }
    return json(503, { error: 'busy', message: 'Voice abhi busy hai, thodi der baad try karo.' });
  }

  // ---------- connector token jaanch (GitHub / Vercel): sirf account ka naam wapas ----------
  if (body.verify === 'github' || body.verify === 'vercel') {
    if (limited(request, 'v', 10)) return json(429, { ok: false, error: 'slow' });
    return json(200, await verifyConnector(body.verify, body.token));
  }

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
    .map((m, i, all) => ({ role: m.role, content: m.content.slice(0, i === all.length - 1 ? 30000 : 6000) }));   // naya sawaal kitna bhi lamba (30k akshar tak)
  if (!history.length || history[history.length - 1].role !== 'user') return json(400, { error: 'bad' });

  // CACHE: seedha "Part A Q1 ka answer" jaisa sawaal, photo nahi -> pehle saved jawab dekho (AI request bachti hai)
  const c = body.cache && typeof body.cache === 'object' ? body.cache : null;
  const wantWeb = body.research === true || body.research === 'deep', deep = body.research === 'deep';
  const plain = !wantWeb && !exact && !body.connectors && c && /^[ABC]?$/.test(c.part || '') && Number.isInteger(c.no) && c.no > 0 && c.no < 30 && (c.lang === 'hi' || c.lang === 'en')
    && typeof body.paperText === 'string' && body.paperText.trim().length > 20 && !(Array.isArray(body.images) && body.images.length) && !body.image && !body.attachText;
  const key = plain ? await cacheKey({ prefer, lang: c.lang, part: c.part || '', no: c.no, question: body.paperText.replace(/^--- Page \d+[^\n]*---\n/gm, '').slice(0, 16000) }) : '';
  if (key) {
    const hit = await cacheGet(key);
    if (hit) return new Response(hit.text, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-ai': `${hit.by || 'AI'}`.slice(0, 80), 'x-ai-cache': '1' } });
  }

  // ---------- RESEARCH: web se sources + images (Tavily) ----------
  let web = null, webErr = '';
  if (wantWeb) {
    if (limited(request, 'w', deep ? 3 : 6)) webErr = 'slow';
    else if (!loadKeys(env).tavily.length) webErr = 'nokey';
    else { web = await research(env, history[history.length - 1].content, deep); if (!web) webErr = 'fail'; }
  }
  // ---------- CONNECTORS: GitHub / Vercel / YouTube (link ya account se live data) ----------
  let conn = null;
  if (body.connectors && typeof body.connectors === 'object' && !limited(request, 'c', 12)) {
    try {
      // "Authorize" se jude account (encrypted cookie) — paste kiye token se pehle
      const v = await vaultTokens(request), cfg = { ...body.connectors };
      if (v.github && !cfg.github) cfg.github = v.github.t;
      if (v.vercel && !cfg.vercel) { cfg.vercel = v.vercel.t; cfg.vercelTeam = v.vercel.team || ''; }
      conn = await gatherConnectors(history[history.length - 1].content, cfg, env);
    } catch (e) { conn = null; }
  }
  const connBlock = conn ? `\n\n===== CONNECTOR DATA (fetched live just now from the student's connected apps / links) =====\n${conn.text}\n===== END OF CONNECTOR DATA =====` : '';
  const sys = SOLVE + (web && web.sources.length ? WEB_RULE + (deep ? DEEP_RULE : '') : '') + (conn ? CONN_RULE : '');
  const maxOut = deep && web ? 7000 : 4096;
  // chuna hua model nahi chala (limit / key band / model nahi mila) to page ko batao kyun, kisne jawab diya
  const fallH = (o) => {
    const h = { 'x-ai-prov': o.p.prov || '', 'x-ai-model': String(o.model).slice(0, 120) };
    if (!prefer || (o.p.prov === prefer && (!exact || o.model === exact))) return h;
    const want = (PROVIDERS.find(x => x.id === prefer) || {}).name || prefer;
    const mine = o.tried.filter(t => t.startsWith(want + ':')).map(t => t.split(':')[1]);
    const st = busyList(env)[prefer] || {};
    const why = mine.some(x => x === '429') || st.busy ? 'limit' : mine.some(x => x === '401' || x === '403') || st.down ? 'key'
      : mine.some(x => x === '404' || x === '400' || x === '422') ? 'unavailable' : mine.some(x => x === 'timeout' || +x >= 500) ? 'busy' : 'limit';
    return { ...h, 'x-ai-fallback': why };
  };
  const webH = { ...webHeader(web), ...(webErr ? { 'x-ai-web-err': webErr } : {}), ...(conn && conn.cards.length ? { 'x-ai-conn': b64(JSON.stringify(conn.cards)) } : {}) };

  // ---------- TEZ RAASTA: scan paper ke page ki photo + sawaal -> seedha jawab (ek hi AI call) ----------
  const shots = (Array.isArray(body.pageImages) ? body.pageImages : []).filter(okImage).slice(0, 3);
  if (shots.length) {
    const nos = (Array.isArray(body.pageNos) ? body.pageNos : []).map(Number).filter(n => n > 0 && n < 100).slice(0, 3);
    const c2 = body.cache && typeof body.cache === 'object' ? body.cache : null;
    const pid = typeof body.pid === 'string' ? body.pid.slice(0, 300) : '';
    const okc = c2 && pid && /^[ABC]?$/.test(c2.part || '') && Number.isInteger(c2.no) && c2.no > 0 && c2.no < 30 && (c2.lang === 'hi' || c2.lang === 'en');
    const skey = okc ? await cacheKey({ prefer, lang: c2.lang, part: c2.part || '', no: c2.no, question: `img|${pid}|${nos.join(',')}` }) : '';
    if (skey) {
      const hit = await cacheGet(skey);
      if (hit) return new Response(hit.text, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-ai': `${hit.by || 'AI'}`.slice(0, 80), 'x-ai-cache': '1' } });
    }
    const seer = chains(env, prefer, exact, ipSeed).seer;
    if (!seer.length) return json(422, { error: 'novision' });               // photo dekhne wala model hi nahi: phone par padh ke bhejo
    const what = typeof body.opened === 'string' && body.opened ? body.opened.slice(0, 220) : String(body.paper || 'RTU question paper').slice(0, 160);
    const map = body.assistant === true && typeof body.catalog === 'string' ? `\n\n===== RTU HUB SITE MAP =====\n${body.catalog.slice(0, 4000)}\n===== END =====` : '';
    const say = `${body.assistant === true ? 'RTU Hub AI Assistant. Opened for this question' : 'Paper'}: ${what}. It is scanned, so photos of page ${nos.join(', ') || '?'} are attached. Find what the student asks in them.${map}\n\nStudent: ${history[history.length - 1].content}${webBlock(web)}${connBlock}`;
    const content = [{ type: 'text', text: say }, ...shots.map(url => ({ type: 'image_url', image_url: { url } }))];
    const outS = await first(seer, { system: sys, max: maxOut, temp: 0.3, messages: [...history.slice(0, -1), { role: 'user', content }] }, true);
    const busyS = Object.entries(busyList(env)).filter(([, v]) => v.busy).map(([id]) => id).join(',');
    if (!outS.res) return json(503, { error: 'busy', busy: busyS, message: 'AI abhi busy hai. Ek minute baad dobara pooch.', tried: outS.tried.slice(0, 12) });
    let fullS = '';
    const decS = new TextDecoder();
    const streamS = skey ? toText(outS.res, outS.p.api).pipeThrough(new TransformStream({
      transform(chunk, ctl) { fullS += decS.decode(chunk, { stream: true }); ctl.enqueue(chunk); },
      async flush() { if (fullS.trim().length > 60) await cachePut(skey, { text: fullS, by: `${outS.p.name} ${outS.model}` }); }
    })) : toText(outS.res, outS.p.api);
    return new Response(streamS, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-ai': `${outS.p.name} ${outS.model}`.slice(0, 80), 'x-ai-busy': busyS, ...webH, ...fallH(outS) } });
  }

  // MODEL 1: attach ki hui photos (aur zaroorat ho to page ki photo) padho
  const images = [...(Array.isArray(body.images) ? body.images : []), body.image].filter(okImage).slice(0, 3);
  let attach = typeof body.attachText === 'string' ? body.attachText.slice(0, 60000).trim() : '', reader = '';   // attach ki hui files ka text
  if (images.length) {
    const read = await Promise.all(images.map(img => readImage(env, img, prefer)));
    const got = read.filter(r => r.text);
    if (!got.length && !attach && Array.isArray(body.images) && body.images.length) return json(422, { error: 'noread', message: 'Photo read nahi ho payi.' });
    attach = [attach, ...got.map((r, i) => `[Photo ${i + 1}]\n${r.text}`)].filter(Boolean).join('\n\n');
    reader = got[0] ? got[0].by : '';
  }

  // MODEL 2: hal karo
  const assistant = body.assistant === true, general = body.general === true;
  const site = assistant && typeof body.catalog === 'string' ? `\n\n===== RTU HUB SITE MAP (what rtuhub.in has for this student) =====\n${body.catalog.slice(0, 6000)}\n===== END OF SITE MAP =====` : '';
  const opened = typeof body.opened === 'string' ? body.opened.slice(0, 220) : '';
  const where = assistant
    ? `The student is using the RTU Hub AI Assistant on the dashboard.${opened ? ` For this question I opened: ${opened}.` : general ? ' No paper was opened for this question: answer it as a normal tutor (use the site map if they ask what rtuhub.in has).' : ''}${site}`
    : `Paper: ${String(body.paper || 'RTU question paper').slice(0, 160)}. ${body.page ? `The student is on page ${+body.page || 1} of ${+body.pages || '?'}.` : ''}${general ? ' This question is not about the paper: answer it as a normal tutor.' : ''}`;
  const paperText = typeof body.paperText === 'string' ? body.paperText.slice(0, 16000).trim() : '';
  const last = history.pop();
  const text = where
    + (paperText ? `\n\n===== TEXT OF THE PAPER (your memory) =====\n${paperText}\n===== END OF PAPER =====` : '')
    + (attach ? `\n\n===== FILES / PHOTOS THE STUDENT ATTACHED (read them fully; answer about them) =====\n${attach.slice(0, 60000)}\n===== END OF ATTACHMENTS =====` : '')
    + (!paperText && !attach && !general && !assistant ? '\n\n(The paper could not be read right now. If the question is not typed out, ask the student to type it.)' : '')
    + `\n\nStudent: ${last.content}` + webBlock(web) + connBlock;
  // free server ke liye chhota roop: sirf student wala page aur aas-paas, pichhli baat-cheet ke 2 message
  const pageNo = +body.page || 1;
  const near = paperText.split(/\n\n(?=--- Page \d+)/).filter(part => { const m = part.match(/^--- Page (\d+)/); return !m || Math.abs(+m[1] - pageNo) <= 1; }).join('\n\n').slice(0, 6000);
  const smallText = where + (near ? `\n\n===== TEXT OF THE PAPER (your memory) =====\n${near}\n===== END OF PAPER =====` : '')
    + (attach ? `\n\n===== FILES / PHOTOS THE STUDENT ATTACHED =====\n${attach.slice(0, 4000)}\n===== END OF ATTACHMENTS =====` : '') + `\n\nStudent: ${last.content.slice(0, 4000)}` + webBlock(web, true) + connBlock.slice(0, 5000);
  const out = await first(chains(env, prefer, exact, ipSeed).solver, { system: sys, max: maxOut, temp: 0.3, messages: [...history, { role: 'user', content: text }], small: [...history.slice(-2).map(m => ({ role: m.role, content: m.content.slice(0, 1500) })), { role: 'user', content: smallText }] }, true);
  const busy = Object.entries(busyList(env)).filter(([, v]) => v.busy).map(([id]) => id).join(',');
  if (!out.res) return json(503, { error: 'busy', busy, message: 'AI abhi busy hai. Ek minute baad dobara pooch.', tried: out.tried.slice(0, 12) });
  // poora jawab aane ke baad cache mein rakh do (adhoora / bahut chhota nahi)
  let full = '';
  const dec = new TextDecoder();
  const stream = key ? toText(out.res, out.p.api).pipeThrough(new TransformStream({
    transform(chunk, ctl) { full += dec.decode(chunk, { stream: true }); ctl.enqueue(chunk); },
    async flush() { if (full.trim().length > 60) await cachePut(key, { text: full, by: `${out.p.name} ${out.model}` }); }
  })) : toText(out.res, out.p.api);
  return new Response(stream, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-ai': `${out.p.name} ${out.model}`.slice(0, 80), 'x-ai-reader': reader.slice(0, 80), 'x-ai-busy': busy, ...webH, ...fallH(out) }
  });
}
