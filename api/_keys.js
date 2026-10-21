// =====================================================================
//  KEYS — AI ki saari keys yahin se padhi jaati hain.
//
//  !! Is file mein ya repo mein kahin bhi key MAT likhna (repo public hai, turant chori ho jayegi) !!
//
//  Keys rakhne ki private jagah:  Vercel > Project > Settings > Environment Variables, phir Redeploy.
//  Naam is format mein (har provider ki jitni chahe keys, _1 se _60 tak):
//     GROQ_API_KEY, GROQ_API_KEY_1, GROQ_API_KEY_2 ...        (ya GROQ_API_KEYS = key1,key2,...)
//     GEMINI_API_KEY, GEMINI_API_KEY_1 ... / GEMINI_API_KEYS
//     NVIDIA_API_KEY, CEREBRAS_API_KEY, OPENROUTER_API_KEY, OLLAMA_API_KEY, LLM7_API_KEY,
//     HF_API_KEY, POLLINATIONS_API_KEY, CF_AI_TOKEN + CF_ACCOUNT_ID,
//     TAVILY_API_KEY, TAVILY_API_KEY_1 ...                     (web research)
//  Purana tareeka bhi chalta hai: RTUHUB_KEYS mein saari keys ek saath (nvapi- / gsk_ / csk- / AQ. / AIza pehchaani jaati hain).
//  Ek hi key do jagah ho (GEMINI_API_KEY aur GEMINI_API_KEY_1) to ek hi gini jaati hai.
// =====================================================================
const NAMES = {
  groq: ['GROQ_API_KEY', 'GROQ_KEY', 'GROQ_KEYS'],
  gemini: ['GEMINI_API_KEY', 'GEMINI_KEY', 'GEMINI_KEYS', 'GOOGLE_API_KEY'],
  nvidia: ['NVIDIA_API_KEY', 'NVIDIA_KEY', 'NVIDIA_KEYS'],
  cerebras: ['CEREBRAS_API_KEY', 'CEREBRAS_KEY', 'CEREBRAS_KEYS'],
  openrouter: ['OPENROUTER_API_KEY', 'OPENROUTER_KEY'],
  ollama: ['OLLAMA_API_KEY', 'OLLAMA_KEY'],
  llm7: ['LLM7_API_KEY', 'LLM7_KEY'],
  hf: ['HF_API_KEY', 'HF_TOKEN', 'HUGGINGFACE_API_KEY'],
  pollinations: ['POLLINATIONS_API_KEY', 'POLLINATIONS_KEY'],
  cloudflare: ['CF_AI_TOKEN', 'CLOUDFLARE_AI_TOKEN'],
  tavily: ['TAVILY_API_KEY', 'TAVILY_KEY']
};
// key pehchaan (jahan format pakka hai). Ollama / LLM7 ka koi fix format nahi: unhe sirf naam se lete hain.
const SHAPE = {
  groq: /gsk_[A-Za-z0-9]{20,}/g,
  gemini: /AQ\.[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{30,}/g,
  nvidia: /nvapi-[A-Za-z0-9_-]{20,}/g,
  cerebras: /csk-[A-Za-z0-9]{20,}/g,
  openrouter: /sk-or-v1-[A-Za-z0-9]{20,}/g,
  hf: /hf_[A-Za-z0-9]{20,}/g,
  tavily: /tvly-[A-Za-z0-9_-]{20,}/g
};
import { RAW } from './_env.js';
const split = v => String(v || '').split(/[\s,;]+/).map(s => s.trim().replace(/^["']|["']$/g, '')).filter(s => s.length >= 12 && !/YAHAN|APNA|YOUR_|xxxx/i.test(s));

// kisi bhi variable mein poori .env file paste ho (GROQ_KEYS ke andar "NVIDIA_API_KEY=nvapi-..." wali lines), to wo bhi samjho
function pasted(values) {
  const virt = {};
  for (const v of values) for (const line of String(v || '').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]{1,60})\s*=\s*(.+?)\s*$/);
    if (m) virt[m[1]] = (virt[m[1]] ? virt[m[1]] + '\n' : '') + m[2].replace(/^["']|["']$/g, '');
  }
  return virt;
}

export function loadKeys(real = process.env) {
  const out = {};
  const live = real === process.env;
  const pool = live ? [...Object.values(RAW).flat(), RAW.cfAccount] : Object.values(real);
  const virt = pasted(pool);
  const env = new Proxy({}, { get: (_, n) => real[n] || virt[n], ownKeys: () => [...new Set([...Object.keys(virt), ...(() => { try { return Object.keys(real); } catch (e) { return []; } })()])], getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) });
  // naam se: X, X_0 ... X_60, XS
  for (const [id, names] of Object.entries(NAMES)) {
    const vals = [];
    for (const n of names) {
      vals.push(env[n], env[n + 'S']);
      for (let i = 0; i <= 60; i++) vals.push(env[n + '_' + i]);
    }
    if (live) vals.push(...(RAW[id] || []));   // Vercel edge: sirf seedhe likhe naam milte hain (api/_env.js)
    const raw = vals.flatMap(split);
    out[id] = SHAPE[id] ? raw.flatMap(s => s.match(SHAPE[id]) || []) : raw;
  }
  // purana tareeka: sab ek jagah, format se pehchaano
  // purana tareeka + har variable ki poori value: jahan bhi key ho (kisi bhi naam mein), format se pehchaano
  const blob = [...['RTUHUB_KEYS', 'AI_KEYS'].map(n => env[n] || ''), ...pool].filter(v => typeof v === 'string').join('\n');
  // koi aur naam (jaise GROQ_API_KEY_99) bhi pakad lo, agar runtime saare naam batata ho
  let extra = '';
  try { extra = Object.keys(env).filter(n => /API_KEY|_KEYS?$|TOKEN/i.test(n) && !/^(R2_|SYLLABUS_|RTUHUB_SECRET|VERCEL)/.test(n)).map(n => env[n]).join('\n'); } catch (e) {}
  for (const [id, re] of Object.entries(SHAPE)) out[id] = [...out[id], ...((blob + '\n' + extra).match(re) || [])];
  for (const id of Object.keys(out)) out[id] = [...new Set(out[id])];
  const acc = String(env.CF_ACCOUNT_ID || env.CLOUDFLARE_ACCOUNT_ID || (live ? RAW.cfAccount : '') || '').trim().split(/\s+/)[0];
  out.cfAccount = /^[a-f0-9]{32}$/i.test(acc) ? acc : '';      // "YAHAN_APNA..." jaisa placeholder = Cloudflare band
  if (!out.cfAccount) out.cloudflare = [];
  return out;
}
