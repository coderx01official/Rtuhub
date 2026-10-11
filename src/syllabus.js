// =====================================================================
//  SYLLABUS — Cloudflare R2 bucket "syllabus" (private) se.
//  Bucket ki list /api/syllabus?list=1 se aati hai, file /api/syllabus?p=...
//  Folder jaise bhi hon, ye file khud samajh leti hai:
//    CSE/2nd Year/CSE FULL SYLLABUS 2ND YEAR.pdf
//    CSE/2nd Year/Subject Wise Syllabus/Subjects/3CS4-05 Digital Electronics.jpg
//    CSE/2nd Year/Subject Wise Syllabus/Lab/3CS4-21 Data Structures Lab.jpg
//    1ST YEAR/...   (1st year sabke liye ek)
// =====================================================================
import { BRANCH_CODES, branches, slug } from './data.js';

const EXT = /\.(pdf|jpe?g|png|webp)$/i;
const norm = s => s.toUpperCase().replace(/&/g, ' AND ').replace(/[^A-Z0-9()]+/g, ' ').replace(/\s+/g, ' ').trim();
const squash = s => norm(s).replace(/[^A-Z0-9]/g, '');

// folder ke naam se branch: "CSE", "CSE (AI)", "COMPUTER SCIENCE AND ENGINEERING", "CE", "MECH" ...
const ALIAS = {
  CSENORMAL: 'COMPUTER SCIENCE AND ENGINEERING', CSECORE: 'COMPUTER SCIENCE AND ENGINEERING', CSEREGULAR: 'COMPUTER SCIENCE AND ENGINEERING',
  CSE: 'COMPUTER SCIENCE AND ENGINEERING', CS: 'COMPUTER SCIENCE AND ENGINEERING', COMPUTERSCIENCE: 'COMPUTER SCIENCE AND ENGINEERING',
  CSEAI: 'COMPUTER SCIENCE AND ENGINEERING (AI)', CSAI: 'COMPUTER SCIENCE AND ENGINEERING (AI)', CSEARTIFICIALINTELLIGENCE: 'COMPUTER SCIENCE AND ENGINEERING (AI)',
  AIDS: 'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE', AIANDDS: 'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE', AID: 'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE', AIDATASCIENCE: 'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE',
  IT: 'INFORMATION TECHNOLOGY', EE: 'ELECTRICAL ENGINEERING', ELECTRICAL: 'ELECTRICAL ENGINEERING',
  EEE: 'ELECTRICAL AND ELECTRONICS ENGINEERING', EX: 'ELECTRICAL AND ELECTRONICS ENGINEERING',
  ECE: 'ELECTRONICS AND COMMUNICATION ENGINEERING', EC: 'ELECTRONICS AND COMMUNICATION ENGINEERING', ELECTRONICS: 'ELECTRONICS AND COMMUNICATION ENGINEERING',
  EIC: 'ELECTRONICS INSTRUMENTATION AND CONTROL ENGINEERING', EI: 'ELECTRONICS INSTRUMENTATION AND CONTROL ENGINEERING',
  ME: 'MECHANICAL ENGINEERING', MECH: 'MECHANICAL ENGINEERING', MECHANICAL: 'MECHANICAL ENGINEERING',
  MT: 'MECHATRONICS ENGINEERING', MECHATRONICS: 'MECHATRONICS ENGINEERING',
  CE: 'CIVIL ENGINEERING', CIVIL: 'CIVIL ENGINEERING',
  CH: 'CHEMICAL ENGINEERING', CHE: 'CHEMICAL ENGINEERING', CHEMICAL: 'CHEMICAL ENGINEERING',
  PC: 'PETROCHEMICAL ENGINEERING', PCE: 'PETROCHEMICAL ENGINEERING', PETROCHEMICAL: 'PETROCHEMICAL ENGINEERING',
  PE: 'PETROLEUM ENGINEERING', PETROLEUM: 'PETROLEUM ENGINEERING',
  AE: 'AERONAUTICAL ENGINEERING', AERO: 'AERONAUTICAL ENGINEERING', AERONAUTICAL: 'AERONAUTICAL ENGINEERING',
  AG: 'AGRICULTURAL ENGINEERING', AGRI: 'AGRICULTURAL ENGINEERING', AGRICULTURE: 'AGRICULTURAL ENGINEERING', AGRICULTURAL: 'AGRICULTURAL ENGINEERING',
  AU: 'AUTOMOBILE ENGINEERING', AUTO: 'AUTOMOBILE ENGINEERING', AUTOMOBILE: 'AUTOMOBILE ENGINEERING',
  CR: 'CERAMIC ENGINEERING', CERAMIC: 'CERAMIC ENGINEERING',
  MI: 'MINING ENGINEERING', MINING: 'MINING ENGINEERING',
  PI: 'PRODUCTION AND INDUSTRIAL ENGINEERING', PIE: 'PRODUCTION AND INDUSTRIAL ENGINEERING', PRODUCTION: 'PRODUCTION AND INDUSTRIAL ENGINEERING'
};
for (const b of branches) { ALIAS[squash(b)] = b; ALIAS[squash(BRANCH_CODES[b])] = b; ALIAS[squash(b.replace(/ ENGINEERING$/, ''))] = b; }
export function branchOf(folder) {
  const s = squash(folder);
  return ALIAS[s] || ALIAS[s.replace(/BTECH|ENGG|ENGINEERING|BRANCH|SYLLABUS/g, '')] || null;
}

// "2nd Year", "2ND_YEAR", "Second Yr", "II Year", "FY", "1st-yr", "Year 2"
const yearOf = seg => {
  const t = seg.replace(/[_.-]+/g, ' ');
  const m = t.match(/\b([1-4])\s*(?:ST|ND|RD|TH)?\s*(?:YEAR|YR)S?\b/i) || t.match(/\b(?:YEAR|YR)\s*([1-4])\b/i)
    || t.match(/\b(FIRST|SECOND|THIRD|FOURTH|FINAL|I{1,3}|IV)\s*(?:YEAR|YR)S?\b/i);
  if (m) return +m[1] || { FIRST: 1, SECOND: 2, THIRD: 3, FOURTH: 4, FINAL: 4, I: 1, II: 2, III: 3, IV: 4 }[m[1].toUpperCase()];
  if (/^\s*(FY|FE|FIRST)\s*$/i.test(t) || /\bFIRST\s*YEAR|FRESHER|COMMON\s*(?:SYLLABUS|YEAR)\b/i.test(t)) return 1;
  return 0;
};
const semOf = s => {
  const m = s.match(/\bSEM(?:ESTER)?\s*[-_.]?\s*([1-8])\b/i) || s.match(/\b([1-8])\s*(?:ST|ND|RD|TH)?\s*SEM(?:ESTER)?\b/i) || s.match(/\b(?:SEM(?:ESTER)?\s*)?(I{1,3}|IV|V|VI{1,3})\s*SEM(?:ESTER)?\b/i);
  if (!m) return 0;
  return +m[1] || { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 }[m[1].toUpperCase()] || 0;
};
// RTU subject code: 3CS4-05, 4ME3-21, 1FY2-01 -> pehla ank = semester
const CODE = /\b([1-8])([A-Z]{2,4})\s?(\d)\s?[-–]\s?(\d{2})\b/i;
const isLab = s => /\b(LAB|LABS|LABORATORY|PRACTICAL|PRACTICALS|WORKSHOP|PRACTICE)\b/i.test(s);

// file ka saaf naam: "02_3CS4-05 Digital electronics (page 2).jpg" -> { name: 'Digital Electronics', code: '3CS4-05', page: 2 }
function cleanName(file) {
  let s = file.replace(EXT, '').trim();
  let page = 0;
  // "(2)", "_2", "-2", "page 2", "pg-2", "part 2" end mein = page number
  const pm = s.match(/\s*(?:\(\s*(\d{1,2})\s*\)|[_-]\s*(\d{1,2})|[\s_-]*(?:PAGE|PG|PART|IMG|IMAGE|P)\s*[-_]?\s*(\d{1,2}))$/i);
  if (pm && pm.index > 0) { page = +(pm[1] || pm[2] || pm[3]); s = s.slice(0, pm.index).trim(); }
  s = s.replace(/_+/g, ' ').trim();
  s = s.replace(/^\d{1,3}\s*[.)\-]\s*/, '').replace(/^\d{1,3}\s+(?=[A-Z])/i, '');
  const cm = s.match(CODE);
  let code = '';
  if (cm) { code = `${cm[1]}${cm[2].toUpperCase()}${cm[3]}-${cm[4]}`; s = (s.slice(0, cm.index) + ' ' + s.slice(cm.index + cm[0].length)).replace(/^[\s:.\-–]+|[\s:.\-–]+$/g, '').replace(/\s+/g, ' '); }
  return { name: s || code || file, code, page };
}

const KEEP = /^(?:[IVX]+|AI|IT|CSE|RTU|VLSI|CAD|CAM|CNC|IOT|DBMS|OOP|OS|ML|DSA|GIS|IC|UHV|PPS|MEFA|[A-Z]\d*)$/;
const SMALL = new Set(['AND', 'OF', 'FOR', 'IN', 'TO', 'THE', 'ON', 'WITH', 'BY']);
export const title = s => s.replace(/[A-Za-z0-9]+/g, (w, i) => {
  const u = w.toUpperCase();
  if (i && SMALL.has(u)) return u.toLowerCase();
  if (KEEP.test(u)) return u;
  return u[0] + u.slice(1).toLowerCase();
});

// bucket list -> { "<branch>|<year>": { full: [...], subjects: [...], labs: [...] } }
export function buildSyllabus(files) {
  const out = {};
  const box = k => out[k] || (out[k] = { full: [], subjects: [], labs: [], groups: {} });
  // Bucket mein ab tak jo CSE folder hai wo asal mein CSE (AI) ka syllabus hai.
  // CSE (normal) sirf: "CSE FULL SYLLABUS SEMESTER 3.pdf" jaise naam, ya "CSE NORMAL" / "CSE CORE" folder.
  const CSE = 'COMPUTER SCIENCE AND ENGINEERING';
  const cseNormal = seg => /\b(NORMAL|CORE|REGULAR)\b/i.test(seg[0]) || /^CSE FULL SYLLABUS SEMESTER \d/i.test(seg[seg.length - 1]);
  for (const [key, size] of files) {
    if (!EXT.test(key)) continue;
    const seg = key.split('/').filter(Boolean);
    let year = 0, branch = null, yi = -1;
    seg.slice(0, -1).forEach((s, i) => { const y = yearOf(s); if (y && yi < 0) { year = y; yi = i; } });
    for (const s of seg.slice(0, -1)) { const b = branchOf(s); if (b) { branch = b; break; } }
    if (!year) { const y = yearOf(seg[seg.length - 1]); if (y) year = y; }
    if (!year) { const sm = semOf(key); if (sm) { year = Math.ceil(sm / 2); yi = seg.findIndex(s => semOf(s)); if (yi === seg.length - 1) yi = -1; } }
    if (branch === CSE && !cseNormal(seg)) branch = CSE + ' (AI)';
    if (year === 1) branch = 'COMMON';
    if (!branch || !year) continue;
    const b = box(branch + '|' + year);
    const inner = seg.slice(yi + 1, -1), file = seg[seg.length - 1];
    const subjectWise = inner.some(s => /SUBJECT|LAB|PRACTICAL|THEORY|PAPER/i.test(s));
    const semHint = semOf(inner.join(' ')) || semOf(file);
    if (!subjectWise && (/FULL|COMPLETE|SYLLABUS|SCHEME|YEAR/i.test(file) || !inner.length && year > 1)) {
      const n = cleanName(file);
      const nm = branch === CSE + ' (AI)' ? n.name.replace(/^CSE\b(?!\s*\(?\s*AI)/i, 'CSE (AI)') : n.name;
      b.full.push({ key, size, name: nm, sem: semHint, kind: /\.pdf$/i.test(file) ? 'pdf' : 'img' });
      continue;
    }
    // subject wise: Lab / Subjects folder; subject ka apna folder ho to wahi naam
    const labFolder = inner.some(s => isLab(s) && !/SUBJECT/i.test(s));
    const folderIdx = inner.findIndex(s => /^(LAB|LABS|LABORATORY|PRACTICALS?|SUBJECTS?|THEORY)$/i.test(s.trim()));
    const own = folderIdx >= 0 && inner.length > folderIdx + 1 ? inner[inner.length - 1] : '';
    const n = cleanName(own || file);
    const page = own ? (cleanName(file).page || +(file.replace(EXT, '').match(/(\d+)\D*$/) || [])[1] || 0) : n.page;
    const lab = labFolder || isLab(n.name);
    const gid = (lab ? 'L|' : 'S|') + squash(n.name);
    let g = b.groups[gid];
    if (!g) {
      g = b.groups[gid] = { name: title(n.name.replace(/\s+/g, ' ')), code: n.code, sem: n.code ? +n.code[0] : semHint, lab, pages: [], kind: 'img' };
      (lab ? b.labs : b.subjects).push(g);
    }
    if (!g.code && n.code) { g.code = n.code; g.sem = +n.code[0]; }
    if (!g.sem && semHint) g.sem = semHint;
    g.pages.push({ key, page, size });
    if (/\.pdf$/i.test(file)) g.kind = g.pages.length > 1 ? 'mixed' : 'pdf';
  }
  for (const b of Object.values(out)) {
    for (const g of [...b.subjects, ...b.labs]) {
      g.pages.sort((x, y) => x.page - y.page || x.key.localeCompare(y.key, undefined, { numeric: true }));
      if (g.kind === 'mixed') g.kind = g.pages.every(p => /\.pdf$/i.test(p.key)) ? 'pdfs' : 'img';
    }
    const order = (x, y) => (x.sem || 9) - (y.sem || 9) || (x.code || '~').localeCompare(y.code || '~', undefined, { numeric: true }) || x.name.localeCompare(y.name);
    b.subjects.sort(order); b.labs.sort(order);
    b.full.sort((x, y) => (x.sem || 0) - (y.sem || 0) || x.name.localeCompare(y.name));
    // URL ke liye slug (same naam do baar ho to -2)
    const seen = {};
    for (const g of [...b.full, ...b.subjects, ...b.labs]) {
      let s = slug(g.name) || 'syllabus';
      if (g.lab && !/lab/.test(s)) s += '-lab';
      seen[s] = (seen[s] || 0) + 1;
      g.slug = seen[s] > 1 ? s + '-' + seen[s] : s;
    }
    delete b.groups;
  }
  return out;
}

// ---------- browser: list ek baar laao ----------
let listing = null;
export function loadSyllabus() {
  if (listing) return listing;
  return (listing = fetch('/api/syllabus?list=1', { credentials: 'same-origin' })
    .then(r => r.json())
    .then(d => ({ ready: !!d.ready, data: buildSyllabus(d.files || []) }))
    .catch(() => { listing = null; return { ready: false, data: {}, failed: true }; }));
}
export const sylFileUrl = (key, dl) => '/api/syllabus?p=' + encodeURIComponent(key) + (dl ? '&dl=1' : '');

// PYQ subject <-> syllabus subject: naam se milao
const STOP = new Set(['AND', 'OF', 'THE', 'IN', 'FOR', 'TO', 'ENGINEERING', 'LAB', 'I', 'II', 'SYSTEM', 'SYSTEMS']);
const words = s => norm(s).replace(/[()]/g, ' ').split(' ').filter(w => w && !STOP.has(w)).map(w => w.replace(/S$/, ''));
export function matchScore(a, b) {
  const A = words(a), B = new Set(words(b));
  if (!A.length || !B.size) return 0;
  const hit = A.filter(w => B.has(w)).length;
  const roman = s => (norm(s).match(/\b(I{1,3}|IV|1|2|3)\s*$/) || [])[1] || '';
  if (roman(a) !== roman(b) && roman(a) && roman(b)) return 0;
  return hit / Math.max(A.length, B.size);
}
export function findSyllabusFor(box, name) {
  if (!box) return null;
  let best = null, score = 0;
  for (const g of box.subjects) { const s = matchScore(name, g.name); if (s > score) { score = s; best = g; } }
  return score >= 0.6 ? best : null;
}
