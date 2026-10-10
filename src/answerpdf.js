// =====================================================================
//  ANSWER PDF — AI ke jawab ka asli PDF, rtuhub.in ki branding ke saath.
//  Page pehle canvas par banta hai (isliye Hindi, √ θ π sab sahi dikhte hain),
//  phir un pages se PDF file banti hai. Koi bahar ki library nahi.
// =====================================================================
const W = 1240, H = 1754;                 // A4, 150 dpi
const LEFT = 118, RIGHT = W - 118, TOP = 250, BOTTOM = H - 150;
const INK = '#141a2e', SOFT = '#5a6482';
const HEAD = '"Chakra Petch", "Segoe UI", system-ui, sans-serif', BODY = 'Manrope, "Segoe UI", system-ui, sans-serif';

const grad = (g, x0, y0, x1, y1) => { const k = g.createLinearGradient(x0, y0, x1, y1); k.addColorStop(0, '#2aa9f5'); k.addColorStop(0.5, '#7c5cff'); k.addColorStop(1, '#f03fc4'); return k; };

// har page ka frame: kata hua kona, kinare par "rtuhub.in", upar logo, neeche page number
function chrome(g, title, n) {
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  // halka grid + watermark
  g.strokeStyle = 'rgba(60, 110, 220, 0.045)'; g.lineWidth = 1;
  for (let x = 62; x < W - 40; x += 44) { g.beginPath(); g.moveTo(x, 40); g.lineTo(x, H - 40); g.stroke(); }
  for (let y = 62; y < H - 40; y += 44) { g.beginPath(); g.moveTo(40, y); g.lineTo(W - 40, y); g.stroke(); }
  g.save(); g.translate(W / 2, H / 2); g.rotate(-Math.PI / 5); g.font = `700 150px ${HEAD}`; g.textAlign = 'center'; g.fillStyle = 'rgba(90, 110, 255, 0.045)'; g.fillText('rtuhub.in', 0, 50); g.restore();
  // frame (upar-daayen aur neeche-baayen kona kata hua)
  const a = 40, c = 54;
  g.beginPath(); g.moveTo(a, a); g.lineTo(W - a - c, a); g.lineTo(W - a, a + c); g.lineTo(W - a, H - a); g.lineTo(a + c, H - a); g.lineTo(a, H - a - c); g.closePath();
  g.lineWidth = 5; g.strokeStyle = grad(g, 0, 0, W, H); g.stroke();
  g.beginPath(); g.moveTo(a + 14, a + 14); g.lineTo(W - a - c - 6, a + 14); g.lineTo(W - a - 14, a + c + 6); g.lineTo(W - a - 14, H - a - 14); g.lineTo(a + c + 6, H - a - 14); g.lineTo(a + 14, H - a - c - 6); g.closePath();
  g.lineWidth = 1; g.strokeStyle = 'rgba(124, 92, 255, 0.35)'; g.stroke();
  // kinare par branding (frame ki line ke beech mein)
  const label = (x, y, rot) => {
    g.save(); g.translate(x, y); g.rotate(rot); g.font = `700 21px ${HEAD}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const text = 'R T U H U B . I N', w = g.measureText(text).width + 40;
    g.fillStyle = '#fff'; g.fillRect(-w / 2, -14, w, 28); g.fillStyle = '#5b4bd6'; g.fillText(text, 0, 1); g.restore();
  };
  label(a, H / 2, -Math.PI / 2); label(W - a, H / 2, Math.PI / 2); label(W / 2, H - a, 0);
  // logo: hexagon + R
  g.save(); g.translate(LEFT - 8, 86); g.scale(1.45, 1.45);
  g.beginPath(); [[32, 6], [54.5, 19], [54.5, 45], [32, 58], [9.5, 45], [9.5, 19]].forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
  g.fillStyle = '#0e1630'; g.fill(); g.lineWidth = 3.5; g.lineJoin = 'round'; g.strokeStyle = grad(g, 9, 6, 55, 58); g.stroke();
  g.beginPath(); g.moveTo(25, 45); g.lineTo(25, 20); g.lineTo(33.5, 20); g.arc(33.5, 27.25, 7.25, -Math.PI / 2, Math.PI / 2); g.lineTo(25, 34.5); g.moveTo(33, 34.5); g.lineTo(40.5, 45);
  g.lineWidth = 4.6; g.lineCap = 'round'; g.strokeStyle = '#fff'; g.stroke();
  g.beginPath(); g.arc(54.5, 19, 3.6, 0, 7); g.fillStyle = '#ffb84d'; g.fill(); g.restore();
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.font = `700 46px ${HEAD}`; g.fillStyle = grad(g, LEFT + 90, 0, LEFT + 330, 0); g.fillText('rtuhub.in', LEFT + 92, 128);
  g.font = `600 20px ${HEAD}`; g.fillStyle = SOFT; g.fillText('RTU Hub AI  /  Answer sheet', LEFT + 94, 160);
  g.textAlign = 'right'; g.font = `600 19px ${BODY}`; g.fillStyle = SOFT; g.fillText(new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), RIGHT, 128);
  g.textAlign = 'left'; g.font = `600 23px ${BODY}`; g.fillStyle = INK;
  let t = title; while (g.measureText(t).width > RIGHT - LEFT && t.length > 10) t = t.slice(0, -2); g.fillText(t === title ? t : t + '…', LEFT, 206);
  g.fillStyle = grad(g, LEFT, 0, RIGHT, 0); g.fillRect(LEFT, 222, RIGHT - LEFT, 3);
  g.font = `600 18px ${BODY}`; g.fillStyle = SOFT; g.fillText('www.rtuhub.in   RTU B.Tech PYQ, notes and AI answers', LEFT, H - 92);
  g.textAlign = 'right'; g.fillText('Page ' + n, RIGHT, H - 92); g.textAlign = 'left';
}

// Markdown -> blocks -> runs (bold / code ke saath)
function blocks(md) {
  const out = [];
  let code = false;
  for (const raw of String(md).replace(/\r/g, '').split('\n')) {
    if (raw.trim().startsWith('```')) { code = !code; continue; }
    if (code) { out.push({ type: 'code', text: raw }); continue; }
    const h = raw.match(/^(#{1,4})\s+(.*)/), ul = raw.match(/^\s*[-*•]\s+(.*)/), ol = raw.match(/^\s*(\d+)[.)]\s+(.*)/);
    if (h) out.push({ type: 'h', text: h[2] });
    else if (ul) out.push({ type: 'li', mark: '•', text: ul[1] });
    else if (ol) out.push({ type: 'li', mark: ol[1] + '.', text: ol[2] });
    else if (raw.trim()) out.push({ type: 'p', text: raw.trim() });
    else out.push({ type: 'gap' });
  }
  return out;
}
const runs = text => String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean)
  .map(p => p.startsWith('**') && p.length > 4 ? { t: p.slice(2, -2), b: true } : p.startsWith('`') && p.length > 2 ? { t: p.slice(1, -1), b: true } : { t: p });

// shabdon ko line mein todna (bold aur normal milakar)
function wrap(g, parts, size, width, family, weight) {
  const lines = [[]];
  let x = 0;
  for (const r of parts) {
    g.font = `${r.b ? 700 : weight} ${size}px ${family}`;
    for (const word of r.t.split(/(\s+)/)) {
      if (!word) continue;
      const w = g.measureText(word).width;
      if (x + w > width && x > 0 && word.trim()) { lines.push([]); x = 0; }
      if (!word.trim() && x === 0) continue;
      lines[lines.length - 1].push({ t: word, b: r.b, w });
      x += w;
    }
  }
  return lines;
}

// items: [{ q: 'sawaal', a: 'jawab (markdown)' }]
export async function buildAnswerPdf(title, items) {
  try { await Promise.all([document.fonts.load(`700 40px ${HEAD}`), document.fonts.load(`500 24px ${BODY}`), document.fonts.load(`700 24px ${BODY}`)]); } catch (e) {}
  const pages = [];
  let canvas, g, y;
  const newPage = () => { canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; g = canvas.getContext('2d'); pages.push(canvas); chrome(g, title, pages.length); y = TOP + 26; };
  const room = h => { if (y + h > BOTTOM) newPage(); };
  const draw = (lines, size, lh, x, family, weight, color) => {
    for (const line of lines) {
      room(lh);
      let cx = x;
      for (const w of line) { g.font = `${w.b ? 700 : weight} ${size}px ${family}`; g.fillStyle = w.b ? INK : color; g.fillText(w.t, cx, y + size); cx += w.w; }
      y += lh;
    }
  };
  newPage();
  items.forEach((item, i) => {
    if (i) y += 26;
    // sawaal: rangeen patti wala box
    const qLines = wrap(g, [{ t: item.q }], 25, RIGHT - LEFT - 58, BODY, 700);
    const boxH = qLines.length * 36 + 30;
    room(boxH + 20);
    g.fillStyle = '#eef3ff'; g.fillRect(LEFT, y, RIGHT - LEFT, boxH);
    g.fillStyle = grad(g, 0, y, 0, y + boxH); g.fillRect(LEFT, y, 7, boxH);
    const save = y; y += 13;
    for (const line of qLines) { let cx = LEFT + 30; for (const w of line) { g.font = `700 25px ${BODY}`; g.fillStyle = INK; g.fillText(w.t, cx, y + 25); cx += w.w; } y += 36; }
    y = save + boxH + 22;
    // jawab
    for (const b of blocks(item.a)) {
      if (b.type === 'gap') { y += 10; continue; }
      if (b.type === 'h') { y += 10; draw(wrap(g, runs(b.text), 28, RIGHT - LEFT, HEAD, 700), 28, 40, LEFT, HEAD, 700, '#3b2fc0'); y += 4; continue; }
      if (b.type === 'code') { draw(wrap(g, [{ t: b.text || ' ' }], 21, RIGHT - LEFT - 30, 'ui-monospace, Consolas, monospace', 500), 21, 31, LEFT + 20, 'ui-monospace, Consolas, monospace', 500, '#27304d'); continue; }
      if (b.type === 'li') {
        const lines = wrap(g, runs(b.text), 24, RIGHT - LEFT - 46, BODY, 500);
        room(36); g.font = `700 24px ${BODY}`; g.fillStyle = '#5b4bd6'; g.fillText(b.mark, LEFT + 6, y + 24);
        draw(lines, 24, 36, LEFT + 46, BODY, 500, '#232a42'); y += 5; continue;
      }
      draw(wrap(g, runs(b.text), 24, RIGHT - LEFT, BODY, 500), 24, 36, LEFT, BODY, 500, '#232a42'); y += 8;
    }
  });
  // har page par "Page n of N" theek karna
  pages.forEach((c, i) => { const k = c.getContext('2d'); k.fillStyle = '#fff'; k.fillRect(RIGHT - 220, H - 116, 222, 34); k.font = `600 18px ${BODY}`; k.fillStyle = SOFT; k.textAlign = 'right'; k.fillText(`Page ${i + 1} of ${pages.length}`, RIGHT, H - 92); });

  const jpegs = await Promise.all(pages.map(c => new Promise(done => c.toBlob(b => b.arrayBuffer().then(buf => done(new Uint8Array(buf))), 'image/jpeg', 0.9))));
  const blob = new Blob([pdfFromJpegs(jpegs, W, H, title)], { type: 'application/pdf' });
  const name = ('RTU Hub AI - ' + title).replace(/[^\w .,()-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) + '.pdf';
  return { blob, name, file: typeof File === 'function' ? new File([blob], name, { type: 'application/pdf' }) : null, previews: pages.map(c => c.toDataURL('image/jpeg', 0.85)) };
}

// JPEG pages -> PDF file (PDF 1.4, har page ek image)
function pdfFromJpegs(jpegs, w, h, title) {
  const enc = new TextEncoder(), chunks = [], offsets = [];
  let size = 0;
  const push = part => { const b = typeof part === 'string' ? enc.encode(part) : part; chunks.push(b); size += b.length; };
  const obj = (n, body) => { offsets[n] = size; push(`${n} 0 obj\n`); body(); push('\nendobj\n'); };
  const safe = String(title).replace(/[^\x20-\x7E]/g, '').replace(/[\\()]/g, '');
  const N = jpegs.length;
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push(`<< /Type /Pages /Count ${N} /Kids [${jpegs.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>`));
  jpegs.forEach((jpg, i) => {
    const page = 3 + i * 3, content = page + 1, image = page + 2, stream = `q 595 0 0 842 0 0 cm /Im0 Do Q`;
    obj(page, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${content} 0 R >>`));
    obj(content, () => push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));
    obj(image, () => { push(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`); push(jpg); push('\nendstream'); });
  });
  const info = 3 + N * 3;
  obj(info, () => push(`<< /Title (${safe}) /Author (rtuhub.in) /Creator (RTU Hub AI) /Producer (rtuhub.in) >>`));
  const xref = size;
  push(`xref\n0 ${info + 1}\n0000000000 65535 f \n`);
  for (let n = 1; n <= info; n++) push(String(offsets[n]).padStart(10, '0') + ' 00000 n \n');
  push(`trailer\n<< /Size ${info + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks);
}
