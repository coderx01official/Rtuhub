// =====================================================================
//  SCHOLARSHIP PDF — rtuhub.in branding wala A4 guide (canvas se pages, phir PDF).
//  Official form links PDF me bhi click hote hain (link annotations).
// =====================================================================
import { SCH_GROUPS, SCH_STEPS, SCH_DOCS, SCH_CHECKED, SCH_SESSION } from './scholarships.js';

const W = 1240, H = 1754;                  // A4 @150 dpi
const L = 96, R = W - 96, TOP = 238, BOT = H - 150;
const HEAD = '"Chakra Petch", "Segoe UI", system-ui, sans-serif', BODY = 'Manrope, "Segoe UI", system-ui, sans-serif';
const INK = '#141a2e', SOFT = '#5a6482', FAINT = '#8a93ad', LINE = '#dbe2f2', BLUE = '#1662c4', TINT = '#f2f6ff';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = ymd => { const [y, m, d] = ymd.split('-').map(Number); return `${d} ${MON[m - 1]} ${y}`; };
const daysLeft = (ymd, now) => { const end = new Date(ymd + 'T23:59:59+05:30').getTime(); return end < now ? -1 : Math.floor((end - now) / 86400000); };
const istTime = t => new Date(t).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const grad = (g, x0, x1) => { const k = g.createLinearGradient(x0, 0, x1, 0); k.addColorStop(0, '#2aa9f5'); k.addColorStop(0.5, '#7c5cff'); k.addColorStop(1, '#f03fc4'); return k; };

function wrap(g, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const t = line ? line + ' ' + word : word;
      if (g.measureText(t).width <= maxW || !line) line = t; else { out.push(line); line = word; }
    }
    out.push(line);
  }
  return out;
}

export async function buildScholarshipPdf({ list, catLabel, liveAt, college, collegeLinks, now = Date.now() }) {
  try { await Promise.all([document.fonts.load(`700 40px ${HEAD}`), document.fonts.load(`500 22px ${BODY}`), document.fonts.load(`700 22px ${BODY}`)]); } catch (e) {}
  const pages = [];
  let g, y, page;
  const made = istTime(now);

  function newPage() {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    g = c.getContext('2d'); page = { c, links: [] }; pages.push(page);
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    // header
    g.fillStyle = grad(g, 0, W); g.fillRect(0, 0, W, 10);
    g.save(); g.translate(L - 6, 70); g.scale(1.2, 1.2);
    g.beginPath(); [[32, 6], [54.5, 19], [54.5, 45], [32, 58], [9.5, 45], [9.5, 19]].forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath();
    g.fillStyle = '#0e1630'; g.fill(); g.lineWidth = 3.5; g.lineJoin = 'round'; g.strokeStyle = grad(g, 9, 55); g.stroke();
    g.beginPath(); g.moveTo(25, 45); g.lineTo(25, 20); g.lineTo(33.5, 20); g.arc(33.5, 27.25, 7.25, -Math.PI / 2, Math.PI / 2); g.lineTo(25, 34.5); g.moveTo(33, 34.5); g.lineTo(40.5, 45);
    g.lineWidth = 4.6; g.lineCap = 'round'; g.strokeStyle = '#fff'; g.stroke(); g.restore();
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = `700 42px ${HEAD}`; g.fillStyle = grad(g, L + 80, L + 300); g.fillText('rtuhub.in', L + 78, 112);
    g.font = `600 19px ${HEAD}`; g.fillStyle = SOFT; g.fillText(`Scholarship guide  /  RTU B.Tech  /  Session ${SCH_SESSION}`, L + 80, 143);
    g.textAlign = 'right'; g.font = `600 17px ${BODY}`; g.fillStyle = SOFT; g.fillText('Made ' + made, R, 112);
    g.fillText('www.rtuhub.in/scholarships', R, 140); g.textAlign = 'left';
    g.fillStyle = LINE; g.fillRect(L, 176, R - L, 2);
    // footer
    g.fillStyle = LINE; g.fillRect(L, H - 112, R - L, 1);
    g.font = `500 16px ${BODY}`; g.fillStyle = FAINT;
    g.fillText(`Scheme details checked ${fmtDay(SCH_CHECKED)}. Rules and dates can change: confirm on the official portal before applying.`, L, H - 82);
    g.fillText('rtuhub.in is a student-made site, not a government website.', L, H - 58);
    y = TOP;
  }
  const ensure = h => { if (y + h > BOT) newPage(); };
  const font = (w, s, f = BODY) => { g.font = `${w} ${s}px ${f}`; };
  function para(text, { size = 20, weight = 500, color = INK, x = L, maxW = R - L, lh = 1.45, f = BODY } = {}) {
    font(weight, size, f); const lines = wrap(g, text, maxW);
    g.fillStyle = color; for (const ln of lines) { g.fillText(ln, x, y + size); y += Math.round(size * lh); }
    return lines.length;
  }
  function link(text, url, x, yy, size = 19) {
    font(700, size); g.fillStyle = BLUE; g.fillText(text, x, yy + size);
    const w = g.measureText(text).width; g.fillRect(x, yy + size + 4, w, 1.5);
    page.links.push({ x, y: yy - 2, w, h: size + 10, url });
    return w;
  }
  const measure = (text, size, weight, maxW) => { font(weight, size); return wrap(g, text, maxW).length; };
  function heading(text, sub) {
    ensure(110);
    y += 14; font(700, 30, HEAD); g.fillStyle = INK; g.fillText(text, L, y + 30);
    g.fillStyle = grad(g, L, L + 260); g.fillRect(L, y + 42, 120, 4); y += 60;
    if (sub) { para(sub, { size: 18, color: SOFT }); y += 6; }
  }

  newPage();
  // ----- title -----
  font(700, 46, HEAD); g.fillStyle = INK; g.fillText('Scholarships for RTU B.Tech students', L, y + 46); y += 66;
  para(`${catLabel === 'All' ? 'All categories' : 'Category: ' + catLabel + ' (plus schemes open to every category)'}  ·  ${list.length} schemes  ·  Session ${SCH_SESSION}`, { size: 20, color: SOFT });
  para(`Scheme details checked on ${fmtDay(SCH_CHECKED)}.  Live check of official portals: ${liveAt ? istTime(liveAt) : 'not available when this PDF was made'}.`, { size: 18, color: SOFT });
  y += 18;

  // ----- at a glance -----
  heading('At a glance', 'Nearest last date first. Days left are counted on the day this PDF was made.');
  const cols = [['Scholarship', 380], ['For', 210], ['Income limit', 170], ['Last date', 150], ['Status', R - L - 910]];
  const row = (cells, head, tint) => {
    font(head ? 700 : 600, 17); const nameLines = wrap(g, cells[0], cols[0][1] - 20);
    font(head ? 700 : 500, 17); const forLines = wrap(g, cells[1], cols[1][1] - 20);
    const h = Math.max(nameLines.length, forLines.length) * 24 + 18;
    ensure(h);
    if (head) { g.fillStyle = '#e8efff'; g.fillRect(L, y, R - L, h); } else if (tint) { g.fillStyle = TINT; g.fillRect(L, y, R - L, h); }
    let x = L;
    cells.forEach((cell, i) => {
      const lines = i === 0 ? nameLines : i === 1 ? forLines : [cell.text || cell];
      font(head || i === 0 ? 700 : 500, 17); g.fillStyle = cell.color || (head ? SOFT : INK);
      lines.forEach((ln, k) => g.fillText(ln, x + 10, y + 30 + k * 24));
      x += cols[i][1];
    });
    g.fillStyle = LINE; g.fillRect(L, y + h, R - L, 1); y += h;
  };
  row(cols.map(c => c[0]), true);
  list.forEach((s, i) => {
    const dl = s.last ? daysLeft(s.last, now) : null;
    const st = !s.last ? { text: '—', color: SOFT } : dl < 0 ? { text: 'Closed', color: FAINT } : dl === 0 ? { text: 'Closes today', color: '#c62f43' }
      : { text: dl + (dl === 1 ? ' day left' : ' days left'), color: dl <= 7 ? '#c62f43' : dl <= 15 ? '#b26a00' : '#12805a' };
    row([s.name, s.forShort, s.incomeShort, s.last ? fmtDay(s.last) : (s.lastLabel || '—'), st], false, i % 2 === 1);
  });
  y += 10; para('* Guides give different limits for this scheme; read the current guideline on the portal.', { size: 15, color: FAINT });

  // ----- details by group -----
  for (const [gid, gname, gsub] of SCH_GROUPS) {
    const items = list.filter(s => s.group === gid);
    if (!items.length) continue;
    heading(gname, gsub);
    for (const s of items) {
      ensure(260);
      g.fillStyle = gid === 'rj' ? '#f0a020' : gid === 'in' ? '#2a8cf0' : '#7c5cff'; g.fillRect(L, y + 4, 6, 34);
      para(s.name, { size: 25, weight: 700, x: L + 20, maxW: R - L - 30, lh: 1.36 });
      para(s.by + (s.open ? '  ·  Open to any category' : ''), { size: 17, color: SOFT, x: L + 20 }); y += 4;
      // key facts strip
      const kw = (R - L) / 3, ky = y;
      g.fillStyle = TINT; g.fillRect(L, ky, R - L, 64);
      [['LAST DATE', s.last ? fmtDay(s.last) : (s.lastLabel || 'Not announced')], ['INCOME LIMIT', s.incomeShort], ['FOR', s.forShort]].forEach(([k, v], i) => {
        font(700, 13); g.fillStyle = FAINT; g.fillText(k, L + 14 + i * kw, ky + 22);
        font(700, 18); g.fillStyle = INK; let t = v; while (g.measureText(t).width > kw - 24 && t.length > 4) t = t.slice(0, -2); g.fillText(t === v ? t : t + '…', L + 14 + i * kw, ky + 48);
      });
      y = ky + 78;
      const section = (title, list) => {
        if (!list || !list.length) return;
        ensure(60); font(700, 15); g.fillStyle = FAINT; g.fillText(title.toUpperCase(), L, y + 16); y += 26;
        for (const it of list) { font(500, 18); const n = wrap(g, it, R - L - 34).length; ensure(n * 26 + 6); g.fillStyle = '#7c5cff'; g.fillRect(L + 6, y + 11, 6, 6); para(it, { size: 18, x: L + 24, maxW: R - L - 34, color: '#2a3150' }); y += 4; }
        y += 6;
      };
      section('Who can apply (eligibility)', s.elig || [s.who]);
      section("Who can't apply", s.notElig);
      section('What you get', s.benefits || [s.benefit]);
      if (s.select) section('How students are selected', [s.select]);
      section('Renewal (2nd year onwards)', s.renew);
      section('Documents for this scheme', s.docs);
      section('About the last date', [s.dateNote]);
      ensure(80);
      if (s.apply) { font(700, 15); g.fillStyle = FAINT; g.fillText('APPLY HERE', L, y + 19); const lw = link(s.apply.replace(/^https?:\/\//, ''), s.apply, L + 180, y); if (s.applyNote) { font(500, 16); g.fillStyle = SOFT; g.fillText('   (' + s.applyNote + ')', L + 180 + lw, y + 19); } y += 34; }
      if (s.info) { font(700, 15); g.fillStyle = FAINT; g.fillText('OFFICIAL DETAILS', L, y + 19); link(s.info.replace(/^https?:\/\//, '').slice(0, 80), s.info, L + 180, y, 17); y += 34; }
      font(500, 15); g.fillStyle = FAINT; g.fillText('Source: ' + s.src.map(x => x[0]).join(', ') + `  ·  checked ${fmtDay(SCH_CHECKED)}`, L, y + 16); y += 34;
      g.fillStyle = LINE; g.fillRect(L, y, R - L, 2); y += 22;
    }
  }

  // ----- your college -----
  if (college) {
    heading(`Scholarships at ${college.label}`, `All government scholarships above are open to ${college.label} students too, if they meet the category, income and marks conditions.`);
    if (collegeLinks && collegeLinks.length) {
      para(`From the college website (${college.host}), live check ${liveAt ? istTime(liveAt) : ''}:`, { size: 17, color: SOFT }); y += 4;
      for (const l of collegeLinks.slice(0, 8)) {
        font(500, 18); const lines = wrap(g, l.t, R - L - 40); ensure(lines.length * 26 + 10);
        g.fillStyle = '#2a8cf0'; g.fillRect(L + 6, y + 12, 6, 6);
        if (l.u) { lines.forEach((ln, k) => link(ln, l.u, L + 24, y + k * 26, 18)); }
        else { g.fillStyle = INK; lines.forEach((ln, k) => g.fillText(ln, L + 24, y + 18 + k * 26)); }
        y += lines.length * 26 + 10;
      }
    } else para(`No scholarship notice was found on ${college.host || 'the college website'} in the last check.`, { size: 18, color: SOFT });
  }

  // ----- how to apply + documents -----
  heading('How to apply');
  SCH_STEPS.forEach(([hd, t], i) => {
    font(500, 18); const n = wrap(g, t, R - L - 70).length; ensure(34 + n * 26);
    g.fillStyle = grad(g, L, L + 40); g.beginPath(); g.arc(L + 18, y + 16, 16, 0, 7); g.fill();
    font(700, 17, HEAD); g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(String(i + 1), L + 18, y + 22); g.textAlign = 'left';
    font(700, 20); g.fillStyle = INK; g.fillText(hd, L + 50, y + 22); y += 32;
    para(t, { size: 18, x: L + 50, maxW: R - L - 60, color: '#2a3150' }); y += 8;
  });
  heading('Documents to keep ready');
  for (const d of SCH_DOCS) {
    ensure(34); g.strokeStyle = '#7c5cff'; g.lineWidth = 2; g.strokeRect(L + 4, y + 4, 18, 18);
    para(d, { size: 18, x: L + 38, maxW: R - L - 40, color: '#2a3150' }); y += 4;
  }

  // page numbers
  pages.forEach(({ c }, i) => { const k = c.getContext('2d'); k.font = `600 16px ${BODY}`; k.fillStyle = SOFT; k.textAlign = 'right'; k.fillText(`Page ${i + 1} of ${pages.length}`, R, H - 82); });

  const jpegs = await Promise.all(pages.map(({ c }) => new Promise(done => c.toBlob(b => b.arrayBuffer().then(buf => done(new Uint8Array(buf))), 'image/jpeg', 0.9))));
  const name = `rtuhub-scholarships-${SCH_SESSION}${catLabel === 'All' ? '' : '-' + catLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
  const blob = pdfFromJpegs(jpegs, pages.map(p => p.links), 'RTU scholarships ' + SCH_SESSION);
  return { blob, name };
}

const safeUri = u => { try { return encodeURI(decodeURI(u)); } catch { return encodeURI(u); } };

// JPEG pages + clickable links -> PDF 1.4
function pdfFromJpegs(jpegs, links, title) {
  const enc = new TextEncoder(), chunks = [], offsets = [];
  let size = 0, next = 3;
  const push = part => { const b = typeof part === 'string' ? enc.encode(part) : part; chunks.push(b); size += b.length; };
  const obj = (n, body) => { offsets[n] = size; push(`${n} 0 obj\n`); body(); push('\nendobj\n'); };
  const pdfStr = s => '(' + String(s).replace(/[^\x20-\x7E]/g, c => encodeURIComponent(c)).replace(/[\\()]/g, '\\$&') + ')';
  const sx = 595 / W, sy = 842 / H;
  // numbers pehle tay
  const plan = jpegs.map((_, i) => { const p = { page: next++, content: next++, image: next++, annots: [] }; for (const l of links[i]) p.annots.push({ n: next++, l }); return p; });
  const info = next++;
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push(`<< /Type /Pages /Count ${jpegs.length} /Kids [${plan.map(p => `${p.page} 0 R`).join(' ')}] >>`));
  plan.forEach((p, i) => {
    const stream = 'q 595 0 0 842 0 0 cm /Im0 Do Q';
    const annots = p.annots.length ? ` /Annots [${p.annots.map(a => `${a.n} 0 R`).join(' ')}]` : '';
    obj(p.page, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${p.image} 0 R >> >> /Contents ${p.content} 0 R${annots} >>`));
    obj(p.content, () => push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));
    obj(p.image, () => { push(`<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegs[i].length} >>\nstream\n`); push(jpegs[i]); push('\nendstream'); });
    for (const { n, l } of p.annots) {
      const x1 = (l.x * sx).toFixed(1), x2 = ((l.x + l.w) * sx).toFixed(1), y1 = (842 - (l.y + l.h) * sy).toFixed(1), y2 = (842 - l.y * sy).toFixed(1);
      obj(n, () => push(`<< /Type /Annot /Subtype /Link /Rect [${x1} ${y1} ${x2} ${y2}] /Border [0 0 0] /A << /S /URI /URI ${pdfStr(safeUri(l.url))} >> >>`));
    }
  });
  obj(info, () => push(`<< /Title ${pdfStr(title)} /Author (rtuhub.in) /Creator (rtuhub.in) /Producer (rtuhub.in) >>`));
  const xref = size;
  push(`xref\n0 ${info + 1}\n0000000000 65535 f \n`);
  for (let n = 1; n <= info; n++) push(String(offsets[n]).padStart(10, '0') + ' 00000 n \n');
  push(`trailer\n<< /Size ${info + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: 'application/pdf' });
}
