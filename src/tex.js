// =====================================================================
//  MATHS — AI ke jawab mein formula paper jaisa dikhe (2⁴, bhinn upar-neeche, ∫, √, matrix).
//  AI formula LaTeX mein likhta hai: $x^2$ (line ke andar) aur $$...$$ (alag line).
//  Chat mein KaTeX se sundar banta hai (pehli baar zaroorat padne par hi load hota hai).
//  Copy / Answer PDF ke liye texToText(): wahi formula saaf Unicode text mein (x², (a)/(b), √(x)).
// =====================================================================
const KATEX = 'https://cdn.jsdelivr.net/npm/katex@0.16/dist/';
let katexP = null;
export function loadKatex() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.katex) return Promise.resolve(window.katex);
  return katexP || (katexP = new Promise(ok => {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = KATEX + 'katex.min.css';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = KATEX + 'katex.min.js';
    s.onload = () => ok(window.katex || null);
    s.onerror = () => { katexP = null; ok(null); };
    document.head.appendChild(s);
  }));
}

// text ko hisson mein todna: [{ math: false, v }, { math: true, v: 'x^2', display }]
export function splitMath(text) {
  const out = [], re = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$(?!\s)((?:\\\$|[^$\n])+?)(?<!\s)\$(?!\d)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ math: false, v: text.slice(last, m.index) });
    const v = m[1] ?? m[2] ?? m[3] ?? m[4];
    out.push({ math: true, v: v.trim(), display: m[1] != null || m[2] != null });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ math: false, v: text.slice(last) });
  return out;
}

// ---------- LaTeX -> padhne layak Unicode (copy aur PDF ke liye) ----------
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ', x: 'ˣ', y: 'ʸ', a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', k: 'ᵏ', m: 'ᵐ', t: 'ᵗ', T: 'ᵀ', '∘': '°', '°': '°' };
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', a: 'ₐ', e: 'ₑ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', n: 'ₙ', o: 'ₒ', r: 'ᵣ', x: 'ₓ', m: 'ₘ', p: 'ₚ', s: 'ₛ', t: 'ₜ' };
const SYM = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'θ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠', approx: '≈', equiv: '≡', propto: '∝', sim: '~',
  infty: '∞', int: '∫', iint: '∬', iiint: '∭', oint: '∮', sum: 'Σ', prod: '∏', partial: '∂', nabla: '∇', degree: '°', circ: '∘', angle: '∠',
  rightarrow: '→', to: '→', Rightarrow: '⇒', implies: '⇒', leftarrow: '←', Leftarrow: '⇐', leftrightarrow: '↔', Leftrightarrow: '⇔', iff: '⇔', mapsto: '↦',
  in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', supset: '⊃', cup: '∪', cap: '∩', emptyset: '∅', forall: '∀', exists: '∃', neg: '¬', land: '∧', lor: '∨',
  therefore: '∴', because: '∵', perp: '⊥', parallel: '∥', ldots: '…', cdots: '⋯', dots: '…', prime: '′', hbar: 'ħ', ell: 'ℓ', Re: 'ℜ', Im: 'ℑ',
  lim: 'lim', log: 'log', ln: 'ln', exp: 'exp', sin: 'sin', cos: 'cos', tan: 'tan', cot: 'cot', sec: 'sec', csc: 'cosec', max: 'max', min: 'min', det: 'det',
  sinh: 'sinh', cosh: 'cosh', tanh: 'tanh', arcsin: 'sin⁻¹', arccos: 'cos⁻¹', arctan: 'tan⁻¹', quad: '  ', qquad: '    ', left: '', right: '', big: '', Big: '', displaystyle: '', limits: ''
};
// {..} wala pehla argument nikaalna
function arg(s, i) {
  while (s[i] === ' ') i++;
  if (s[i] !== '{') { const m = s.slice(i).match(/^\\[A-Za-z]+|^./s); return m ? [m[0], i + m[0].length] : ['', i]; }
  let d = 0, j = i;
  for (; j < s.length; j++) { if (s[j] === '{') d++; else if (s[j] === '}' && --d === 0) break; }
  return [s.slice(i + 1, j), j + 1];
}
const wrap = t => /^[A-Za-z0-9.]+$|^\(.*\)$/.test(t) ? t : '(' + t + ')';
const mapAll = (t, map) => [...t].every(c => map[c]) ? [...t].map(c => map[c]).join('') : null;

export function texToText(tex) {
  let s = String(tex).replace(/\\begin\{[pbvB]?matrix\}([\s\S]*?)\\end\{[pbvB]?matrix\}/g, (_, b) => '[' + b.split('\\\\').map(r => r.split('&').map(x => x.trim()).join('  ')).join(' ; ') + ']')
    .replace(/\\begin\{(cases|aligned|align\*?|array)\}(\{[^}]*\})?([\s\S]*?)\\end\{\1\}/g, (_, k, c, b) => b.split('\\\\').map(r => r.replace(/&/g, ' ').trim()).join(' ; '));
  let out = '';
  for (let i = 0; i < s.length;) {
    const c = s[i];
    if (c === '\\') {
      const m = s.slice(i + 1).match(/^[A-Za-z]+/);
      if (!m) { const n = s[i + 1]; out += n === '\\' ? ' ; ' : n === ',' || n === ';' || n === ' ' || n === '!' ? ' ' : n || ''; i += 2; continue; }
      const name = m[0]; i += 1 + name.length;
      if (name === 'frac' || name === 'dfrac' || name === 'tfrac') { const [a, j] = arg(s, i); const [b, k] = arg(s, j); out += wrap(texToText(a)) + '/' + wrap(texToText(b)); i = k; continue; }
      if (name === 'sqrt') {
        let n = ''; if (s[i] === '[') { const e = s.indexOf(']', i); n = s.slice(i + 1, e); i = e + 1; }
        const [a, j] = arg(s, i); out += (n ? mapAll(n, SUP) || n : '') + '√' + wrap(texToText(a)); i = j; continue;
      }
      if (name === 'binom') { const [a, j] = arg(s, i); const [b, k] = arg(s, j); out += `C(${texToText(a)}, ${texToText(b)})`; i = k; continue; }
      if (/^(text|mathrm|mathbf|mathit|operatorname|textbf|mathsf|boxed)$/.test(name)) { const [a, j] = arg(s, i); out += name === 'boxed' ? '[' + texToText(a) + ']' : texToText(a); i = j; continue; }
      if (/^(overline|bar|vec|hat|dot|ddot|tilde)$/.test(name)) {
        const [a, j] = arg(s, i), t = texToText(a), mark = { overline: '̅', bar: '̄', vec: '⃗', hat: '̂', dot: '̇', ddot: '̈', tilde: '̃' }[name];
        out += t.length === 1 ? t + mark : name === 'vec' ? t + '→' : name + '(' + t + ')'; i = j; continue;
      }
      out += SYM[name] != null ? SYM[name] : name;
      continue;
    }
    if (c === '^' || c === '_') {
      const [a, j] = arg(s, i + 1), t = texToText(a).replace(/\s+/g, '');
      const small = mapAll(t, c === '^' ? SUP : SUB);
      out += small != null ? small : (c === '^' ? '^' : '_') + wrap(t);
      i = j; continue;
    }
    if (c === '{' || c === '}') { i++; continue; }
    out += c; i++;
  }
  return out.replace(/[ \t]{2,}/g, ' ').trim();
}

// poore jawab mein se $..$ hata kar Unicode (copy / PDF)
export const plainMath = md => splitMath(String(md)).map(p => p.math ? (p.display ? '\n' + texToText(p.v) + '\n' : texToText(p.v)) : p.v).join('').replace(/\n{3,}/g, '\n\n');

// ---------- PDF ke liye: formula -> SVG photo (MathJax, sirf vector paths; koi font nahi chahiye) ----------
let mjP = null;
export function loadMathJax() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.MathJax && window.MathJax.tex2svg) return Promise.resolve(window.MathJax);
  return mjP || (mjP = new Promise(ok => {
    window.MathJax = { startup: { typeset: false }, svg: { fontCache: 'none' }, options: { enableMenu: false } };
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js'; s.async = true;
    s.onload = () => Promise.resolve(window.MathJax.startup && window.MathJax.startup.promise)
      .then(() => ok(window.MathJax.tex2svg ? window.MathJax : null), () => ok(null));
    s.onerror = () => { mjP = null; ok(null); };
    document.head.appendChild(s);
  }));
}
// size = aas-paas ke text ka font (px); lautata hai { img, w, h, depth } (depth = baseline ke neeche kitna)
export async function mathPicture(MJ, tex, display, size, color) {
  try {
    const svg = MJ.tex2svg(tex, { display: !!display }).querySelector('svg');
    if (!svg || svg.querySelector('[data-mjx-error]')) return null;
    const EX = size * 0.431, ex = v => parseFloat(v) * EX;
    const w = ex(svg.getAttribute('width')), h = ex(svg.getAttribute('height'));
    if (!(w > 0 && h > 0)) return null;
    const va = ((svg.getAttribute('style') || '').match(/vertical-align:\s*(-?[\d.]+)ex/) || [])[1];
    svg.setAttribute('width', w + 'px'); svg.setAttribute('height', h + 'px'); svg.removeAttribute('style');
    if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.outerHTML.replace(/currentColor/g, color));
    await img.decode();
    return { img, w, h, depth: va ? -parseFloat(va) * EX : 0 };
  } catch (e) { return null; }
}
