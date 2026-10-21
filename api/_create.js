// =====================================================================
//  CREATE — "brain": student kya banwana chahta hai (text / image / slides / audio / pdf / video),
//  sabse tez chhota model decide karta hai, phir us kaam ka sahi model chalta hai.
//    image  : NVIDIA FLUX.1 schnell -> Gemini image (Nano Banana) -> Cloudflare FLUX -> Hugging Face -> Pollinations
//    audio  : Groq Orpheus (TTS)  -> Pollinations audio
//    slides : AI JSON likhta hai, page par .pptx banta hai (pptxgenjs)
//    pdf    : normal jawab, page par PDF khulta hai
//    video  : Pollinations (Pollen chahiye) — warna saaf message
//  Koi key / model chal na paye to agla; sab fail to saaf wajah.
// =====================================================================
const MEDIA = {
  image: /\b(image|images|photo|pic|pics|picture|drawing|diagram|poster|logo|wallpaper|illustration|sketch|tasveer|tasvir|chitra|art|artwork|cartoon|thumbnail|banner|icon)\b/i,
  slides: /\b(ppt|pptx|powerpoint|slides?|presentation|deck)\b/i,
  audio: /\b(audio|voice|awaaz|aawaz|awaz|speech|mp3|wav|bol ?kar|bolke|sunao|suna do|narrat\w*|podcast|tts|read aloud)\b/i,
  video: /\b(video|videos|animation|animated|reel|clip|gif)\b/i,
  pdf: /\bpdf\b/i
};
const VERB = /(bana|banao|banado|bana do|banaiye|generate|create|make|draw|design|render|likh|convert|chahiye|de do|dedo|kar do|kardo|kro\b|karo\b|bnao|bna do|bnado|produce|give me|send)/i;

const b64 = buf => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
async function get(url, init = {}, ms = 30000) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctl.signal }); } finally { clearTimeout(t); }
}
const pickKeys = (list, n) => [...list].sort(() => Math.random() - 0.5).slice(0, n);

// ---------- 1. brain: kya banana hai ----------
// llm(system, user, max) -> text  (ai.js deta hai: sabse tez models ka chain)
export async function decide(q, llm) {
  const hits = Object.entries(MEDIA).filter(([, re]) => re.test(q)).map(([k]) => k);
  if (!hits.length) return { kind: 'text' };
  // seedha sawaal ("image processing kya hai") aur banane ka koi shabd nahi -> text, brain ko bhi mat jagao
  if (!VERB.test(q) && /\b(kya hai|kya hota|kya hoti|kya hote|what is|what are|how does|how do|explain|samjhao|samjha do|define|definition|difference|meaning|matlab|kaise kaam)\b/i.test(q)) return { kind: 'text' };
  const sys = `You route a student's request in a study app. Decide what the student wants the app to PRODUCE right now.
Reply with ONLY minified JSON: {"kind":"text|image|slides|audio|pdf|video","prompt":"..."}
- image: they want a picture/diagram/poster generated. prompt = a vivid, specific English image prompt (max 60 words). Keep text out of the image unless asked.
- slides: they want a PPT / presentation made. prompt = the topic in English.
- audio: they want something spoken / a voice / audio file. prompt = the exact text to speak (keep their language; if they gave no text, write a short fitting script, max 400 characters, in Roman Hinglish).
- pdf: they want notes / an answer as a PDF. prompt = what the PDF should contain.
- video: they want a video / animation generated. prompt = vivid English video prompt (max 50 words).
- text: anything else, including QUESTIONS ABOUT these topics (e.g. "what is image processing", "how to make a ppt").`;
  let out = '';
  try { out = await llm(sys, q.slice(0, 1500), 260); } catch (e) {}
  const m = String(out).match(/\{[\s\S]*\}/);
  if (m) { try { const j = JSON.parse(m[0]); if (['text', 'image', 'slides', 'audio', 'pdf', 'video'].includes(j.kind)) return { kind: j.kind, prompt: String(j.prompt || '').slice(0, 1500), by: 'brain' }; } catch (e) {} }
  // brain na chale: shabdon se andaaza (banane wala shabd ho tabhi)
  return VERB.test(q) ? { kind: hits[0], prompt: q } : { kind: 'text' };
}

// ---------- 2. image ----------
export async function makeImage(prompt, k) {
  const tried = [];
  const ok = (data, mime, by) => ({ images: [`data:${mime};base64,${data}`], by });
  // NVIDIA FLUX.1 schnell (4 step, tez)
  for (const key of pickKeys(k.nvidia, 2)) {
    try {
      const r = await get('https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell', { method: 'POST', headers: { authorization: 'Bearer ' + key, accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ prompt, width: 1024, height: 1024, steps: 4, seed: 0, cfg_scale: 0, mode: 'base' }) }, 40000);
      if (r.ok) {
        const j = await r.json().catch(() => ({}));
        const a = (j.artifacts && j.artifacts[0]) || (j.data && j.data[0]) || j;
        const d = a.base64 || a.b64_json || a.image;
        if (d) return ok(d, 'image/jpeg', 'NVIDIA · FLUX.1 schnell');
        tried.push('nvidia:empty');
      } else tried.push('nvidia:' + r.status);
    } catch (e) { tried.push('nvidia:timeout'); }
  }
  // Gemini image (Nano Banana) — generateContent
  for (const model of ['gemini-3.1-flash-lite-image', 'gemini-nano-banana-2.1', 'gemini-2.5-flash-image']) {
    let done = false;
    for (const key of pickKeys(k.gemini, 3)) {
      try {
        const r = await get(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }) }, 45000);
        if (r.ok) {
          const j = await r.json().catch(() => ({}));
          const part = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).find(p => p.inlineData || p.inline_data);
          const d = part && (part.inlineData || part.inline_data);
          if (d && d.data) return ok(d.data, d.mimeType || d.mime_type || 'image/png', 'Gemini · ' + model);
          tried.push('gemini:empty');
        } else { tried.push('gemini:' + r.status); if (r.status === 404 || r.status === 400) { done = true; break; } }
      } catch (e) { tried.push('gemini:timeout'); }
    }
    if (done) continue;
  }
  // Cloudflare Workers AI
  if (k.cfAccount) for (const key of pickKeys(k.cloudflare, 1)) {
    try {
      const r = await get(`https://api.cloudflare.com/client/v4/accounts/${k.cfAccount}/ai/run/@cf/black-forest-labs/flux-1-schnell`, { method: 'POST', headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' }, body: JSON.stringify({ prompt, steps: 4 }) }, 40000);
      const j = r.ok ? await r.json().catch(() => ({})) : {};
      if (j.result && j.result.image) return ok(j.result.image, 'image/jpeg', 'Cloudflare · FLUX.1 schnell');
      tried.push('cloudflare:' + r.status);
    } catch (e) { tried.push('cloudflare:timeout'); }
  }
  // Hugging Face
  for (const model of ['black-forest-labs/FLUX.1-schnell', 'stabilityai/stable-diffusion-3-medium-diffusers']) for (const key of pickKeys(k.hf, 1)) {
    try {
      const r = await get('https://router.huggingface.co/hf-inference/models/' + model, { method: 'POST', headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json', accept: 'image/png' }, body: JSON.stringify({ inputs: prompt }) }, 45000);
      const ct = r.headers.get('content-type') || '';
      if (r.ok && ct.startsWith('image/')) return ok(b64(await r.arrayBuffer()), ct.split(';')[0], 'Hugging Face · ' + model.split('/').pop());
      tried.push('hf:' + r.status);
    } catch (e) { tried.push('hf:timeout'); }
  }
  // Pollinations (Pollen balance chahiye)
  for (const key of pickKeys(k.pollinations, 1)) {
    try {
      const r = await get(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt.slice(0, 900))}?model=flux&width=1024&height=1024&nologo=true`, { headers: { authorization: 'Bearer ' + key } }, 45000);
      const ct = r.headers.get('content-type') || '';
      if (r.ok && ct.startsWith('image/')) return ok(b64(await r.arrayBuffer()), ct.split(';')[0], 'Pollinations · FLUX');
      tried.push('pollinations:' + r.status);
    } catch (e) { tried.push('pollinations:timeout'); }
  }
  return { error: 'Image abhi nahi ban payi (saare image models busy / band).', tried };
}

// ---------- 3. audio (TTS) ----------
// Orpheus ek baar mein 200 akshar: text ko tod kar har tukda bolwao, phir WAV jod do
function splitText(t, n = 190) {
  const out = [];
  let cur = '';
  for (const w of String(t).replace(/\s+/g, ' ').trim().split(' ')) {
    if ((cur + ' ' + w).trim().length > n) { if (cur) out.push(cur); cur = w.slice(0, n); } else cur = (cur + ' ' + w).trim();
  }
  if (cur) out.push(cur);
  return out;
}
function joinWav(bufs) {
  const parts = bufs.map(b => new Uint8Array(b)).map(u => {
    // "data" chunk dhundo (header 44 byte se bada bhi ho sakta hai)
    for (let i = 12; i < u.length - 8; i++) if (u[i] === 100 && u[i + 1] === 97 && u[i + 2] === 116 && u[i + 3] === 97) return { fmt: u.slice(0, i), pcm: u.slice(i + 8) };
    return { fmt: u.slice(0, 44), pcm: u.slice(44) };
  });
  const len = parts.reduce((a, p) => a + p.pcm.length, 0), head = parts[0].fmt;
  const out = new Uint8Array(head.length + 8 + len);
  out.set(head);
  const v = new DataView(out.buffer);
  v.setUint32(4, out.length - 8, true);
  out.set([100, 97, 116, 97], head.length); v.setUint32(head.length + 4, len, true);
  let o = head.length + 8;
  for (const p of parts) { out.set(p.pcm, o); o += p.pcm.length; }
  return out.buffer;
}
export async function makeSpeech(text, k, voice = 'troy') {
  const chunks = splitText(text).slice(0, 8), tried = [];
  for (const key of pickKeys(k.groq, 3)) {
    try {
      const bufs = [];
      for (const c of chunks) {
        const r = await get('https://api.groq.com/openai/v1/audio/speech', { method: 'POST', headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' },
          body: JSON.stringify({ model: 'canopylabs/orpheus-v1-english', voice, input: c, response_format: 'wav' }) }, 30000);
        if (!r.ok) { tried.push('groq:' + r.status); throw new Error('x'); }
        bufs.push(await r.arrayBuffer());
      }
      return { audio: 'data:audio/wav;base64,' + b64(bufs.length > 1 ? joinWav(bufs) : bufs[0]), by: 'Groq · Orpheus TTS', text: chunks.join(' ') };
    } catch (e) {}
  }
  for (const key of pickKeys(k.pollinations, 1)) {
    try {
      const r = await get('https://gen.pollinations.ai/v1/chat/completions', { method: 'POST', headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'openai-audio', modalities: ['text', 'audio'], audio: { voice: 'alloy', format: 'mp3' }, messages: [{ role: 'user', content: 'Read this exactly: ' + text.slice(0, 1500) }] }) }, 40000);
      const j = r.ok ? await r.json().catch(() => ({})) : {};
      const d = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.audio && j.choices[0].message.audio.data;
      if (d) return { audio: 'data:audio/mpeg;base64,' + d, by: 'Pollinations · audio', text };
      tried.push('pollinations:' + r.status);
    } catch (e) { tried.push('pollinations:timeout'); }
  }
  return { error: 'Audio abhi nahi ban paya.', tried };
}

// ---------- 4. slides ----------
export async function makeSlides(topic, llm) {
  const sys = `You make clear, exam-friendly presentation slides for RTU B.Tech students.
Reply with ONLY minified JSON: {"title":"...","subtitle":"...","slides":[{"title":"...","bullets":["...","..."],"notes":"..."}]}
8 to 12 slides. 3 to 6 short bullets each (max 14 words per bullet). Include an intro, the core concepts, an example or diagram description, advantages/disadvantages if relevant, and a summary slide. English unless the student wrote in Hindi/Hinglish.`;
  const out = await llm(sys, 'Topic: ' + topic.slice(0, 1500), 3500);
  const m = String(out).match(/\{[\s\S]*\}/);
  try { const j = JSON.parse(m[0]); if (Array.isArray(j.slides) && j.slides.length) return { slides: { title: String(j.title || topic).slice(0, 120), subtitle: String(j.subtitle || '').slice(0, 160), slides: j.slides.slice(0, 20).map(s => ({ title: String(s.title || '').slice(0, 120), bullets: (Array.isArray(s.bullets) ? s.bullets : []).slice(0, 8).map(b => String(b).slice(0, 220)), notes: String(s.notes || '').slice(0, 600) })) } }; } catch (e) {}
  return { error: 'Slides nahi ban payi, dobara try karo.' };
}

// ---------- 5. video ----------
export async function makeVideo(prompt, k) {
  const tried = [];
  for (const key of pickKeys(k.pollinations, 1)) for (const model of ['seedance', 'veo']) {
    try {
      const r = await get(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt.slice(0, 800))}?model=${model}&duration=5`, { headers: { authorization: 'Bearer ' + key } }, 55000);
      const ct = r.headers.get('content-type') || '';
      if (r.ok && ct.startsWith('video/')) { const buf = await r.arrayBuffer(); if (buf.byteLength < 4000000) return { video: `data:${ct.split(';')[0]};base64,` + b64(buf), by: 'Pollinations · ' + model }; tried.push(model + ':big'); }
      else tried.push(model + ':' + r.status);
    } catch (e) { tried.push(model + ':timeout'); }
  }
  return { error: 'Video banane wale models free nahi hain (Pollinations ko Pollen chahiye, Gemini Veo paid hai). Image ya slides bana sakta hu.', tried };
}
