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

export async function buildScholarshipPdf({ list, catLabel, liveAt, college, collegeLinks, report, news, now = Date.now() }) {
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
    g.font = `600 19px ${HEAD}`; g.fillStyle = SOFT; g.fillText(`${report ? 'My scholarship report' : 'Scholarship guide'}  /  RTU B.Tech  /  Session ${SCH_SESSION}`, L + 80, 143);
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
  // lambi URL: dikhne wala text kaato, link poora rahe
  const fit = (text, size, maxW) => { font(700, size); if (g.measureText(text).width <= maxW) return text; let t = text; while (t.length > 8 && g.measureText(t + '…').width > maxW) t = t.slice(0, -1); return t + '…'; };
  const measure = (text, size, weight, maxW) => { font(weight, size); return wrap(g, text, maxW).length; };
  function heading(text, sub) {
    ensure(110);
    y += 14; font(700, 30, HEAD); g.fillStyle = INK; g.fillText(text, L, y + 30);
    g.fillStyle = grad(g, L, L + 260); g.fillRect(L, y + 42, 120, 4); y += 60;
    if (sub) { para(sub, { size: 18, color: SOFT }); y += 6; }
  }

  newPage();
  // ----- title -----
  const TAGC = { 'You can apply': '#12805a', 'Check this': '#b26a00', 'Closed this year': FAINT };
  const tagOf = s => report && report.tags ? report.tags[s.id] : '';
  if (report) {
    font(700, 46, HEAD); g.fillStyle = INK; g.fillText('Your scholarship report', L, y + 46); y += 66;
    // profile box
    font(500, 19); const pl = wrap(g, report.profile, R - L - 48);
    const bh = 64 + pl.length * 27;
    g.fillStyle = TINT; g.fillRect(L, y, R - L, bh); g.fillStyle = grad(g, L, R); g.fillRect(L, y, 6, bh);
    font(700, 14); g.fillStyle = FAINT; g.fillText('YOUR ANSWERS', L + 24, y + 30);
    font(500, 19); g.fillStyle = INK; pl.forEach((ln, k) => g.fillText(ln, L + 24, y + 58 + k * 27)); y += bh + 22;
    // summary
    const cnt = t => list.filter(s => tagOf(s) === t).length;
    const sw = (R - L - 24) / 3;
    [['You can apply', 'match your answers'], ['Check this', 'one condition to confirm'], ['Closed this year', 'watch for next session']].forEach(([t, sub], i) => {
      const x = L + i * (sw + 12);
      g.strokeStyle = LINE; g.lineWidth = 2; g.strokeRect(x, y, sw, 92);
      g.fillStyle = TAGC[t]; g.fillRect(x, y, sw, 5);
      font(700, 38, HEAD); g.fillText(String(cnt(t)), x + 20, y + 54);
      font(700, 17); g.fillText(t, x + 80, y + 40); font(500, 15); g.fillStyle = SOFT; g.fillText(sub, x + 80, y + 64);
    });
    y += 112;
    para(`Scheme details checked on ${fmtDay(SCH_CHECKED)}.  Live check of official portals: ${liveAt ? istTime(liveAt) : 'not available when this PDF was made'}.  This report is a guide based on your answers; the portal decides final eligibility.`, { size: 16, color: SOFT });
    y += 14;
  } else {
  font(700, 46, HEAD); g.fillStyle = INK; g.fillText('Scholarships for RTU B.Tech students', L, y + 46); y += 66;
  para(`${catLabel === 'All' ? 'All categories' : 'Category: ' + catLabel + ' (plus schemes open to every category)'}  ·  ${list.length} schemes  ·  Session ${SCH_SESSION}`, { size: 20, color: SOFT });
  para(`Scheme details checked on ${fmtDay(SCH_CHECKED)}.  Live check of official portals: ${liveAt ? istTime(liveAt) : 'not available when this PDF was made'}.`, { size: 18, color: SOFT });
  y += 18;
  }

  // ----- at a glance -----
  heading('At a glance', report ? 'Best matches first. Days left are counted on the day this PDF was made.' : 'Nearest last date first. Days left are counted on the day this PDF was made.');
  const cols = [['Scholarship', 320], ['You get', 210], [report ? 'Your result' : 'For', 175], ['Income', 125], ['Last date', R - L - 830]];
  const KC = { rj: '#f08a24', in: '#2a8cf0', psu: '#7c5cff', pvt: '#7c5cff' };
  // cells: [{lines-text, color, weight}] — har cell wrap hoti hai
  const row = (cells, head, tint, dotColor) => {
    const lines = cells.map((c, i) => { font(head || i === 0 ? 700 : c.w || 500, 16); return wrap(g, c.t, cols[i][1] - 22); });
    const h = Math.max(...lines.map(l => l.length)) * 22 + 18;
    ensure(h);
    if (head) { g.fillStyle = '#e8efff'; g.fillRect(L, y, R - L, h); } else if (tint) { g.fillStyle = TINT; g.fillRect(L, y, R - L, h); }
    if (dotColor) { g.fillStyle = dotColor; g.fillRect(L, y, 5, h); }
    let x = L;
    cells.forEach((c, i) => {
      font(head || i === 0 ? 700 : c.w || 500, 16); g.fillStyle = c.color || (head ? SOFT : INK);
      lines[i].forEach((ln, k) => g.fillText(ln, x + 12, y + 28 + k * 22));
      x += cols[i][1];
    });
    g.fillStyle = LINE; g.fillRect(L, y + h, R - L, 1); y += h;
  };
  row(cols.map(c => ({ t: c[0] })), true);
  list.forEach((s, i) => {
    const dl = s.last ? daysLeft(s.last, now) : null;
    const last = !s.last ? { t: s.expect || 'Not announced yet', color: '#b26a00', w: 600 }
      : { t: fmtDay(s.last) + '  ·  ' + (dl < 0 ? 'Closed' : dl === 0 ? 'Closes today' : dl + (dl === 1 ? ' day left' : ' days left')), color: dl < 0 ? FAINT : dl <= 7 ? '#c62f43' : dl <= 15 ? '#b26a00' : '#12805a', w: 700 };
    row([{ t: s.name }, { t: s.amount, color: '#0f7a52', w: 700 }, report ? { t: tagOf(s) || '', color: TAGC[tagOf(s)] || INK, w: 700 } : { t: s.forShort }, { t: s.incomeShort }, last], false, i % 2 === 1, KC[s.kind]);
  });
  y += 8; para('Colour strip: orange = Govt of Rajasthan, blue = Govt of India / AICTE, purple = private, CSR or public sector (trusted, not government).', { size: 15, color: FAINT });
  y += 10; para('* Guides give different limits for this scheme; read the current guideline on the portal.', { size: 15, color: FAINT });

  // ----- details by group -----
  const GROUPS = report ? [
    ['yes', 'You can apply', 'These match every answer you gave. Apply before the last date.'],
    ['maybe', 'Check these', 'You may be eligible. Read the point marked in "Why" and confirm it on the portal.'],
    ['closed', 'Closed this year', 'You match, but this year\'s window has closed. Keep documents ready for the next session.']
  ] : SCH_GROUPS;
  const inGroup = (s, gid) => report ? tagOf(s) === { yes: 'You can apply', maybe: 'Check this', closed: 'Closed this year' }[gid] : s.group === gid;
  for (const [gid, gname, gsub] of GROUPS) {
    const items = list.filter(s => inGroup(s, gid));
    if (!items.length) continue;
    ensure(150); g.fillStyle = { rj: '#fff1e3', in: '#e9f3ff', yes: '#e3f7ee', maybe: '#fff3df', closed: '#eef0f5' }[gid] || '#f1edff'; g.fillRect(L, y + 10, R - L, 8); y += 4;
    heading(gname, gsub);
    for (const s of items) {
      ensure(260);
      g.fillStyle = KC[s.kind] || '#7c5cff'; g.fillRect(L, y + 4, 6, 34);
      para(s.name, { size: 25, weight: 700, x: L + 20, maxW: R - L - 30, lh: 1.36 });
      para(s.by + (s.open ? '  ·  Open to any category' : ''), { size: 17, color: SOFT, x: L + 20 }); y += 4;
      // key facts strip
      const kw = (R - L) / 3, ky = y;
      g.fillStyle = TINT; g.fillRect(L, ky, R - L, 64);
      const KINDS = { rj: 'Official · Govt of Rajasthan', in: 'Official · Govt of India', psu: 'Trusted · Public sector company', pvt: 'Trusted · Private / CSR' };
      const lastTxt = s.last ? fmtDay(s.last) + (daysLeft(s.last, now) < 0 ? ' (closed)' : '') : (s.expect || 'Not announced yet');
      [['YOU GET', s.amount], ['LAST DATE', lastTxt], ['INCOME LIMIT', s.incomeShort]].forEach(([k, v], i) => {
        font(700, 13); g.fillStyle = FAINT; g.fillText(k, L + 14 + i * kw, ky + 22);
        font(700, 18); g.fillStyle = i === 0 ? '#0f7a52' : INK; let t = v; while (g.measureText(t).width > kw - 24 && t.length > 4) t = t.slice(0, -2); g.fillText(t === v ? t : t + '…', L + 14 + i * kw, ky + 48);
      });
      font(700, 14); g.fillStyle = KC[s.kind]; g.textAlign = 'right'; g.fillText(KINDS[s.kind] || '', R, ky - 12); g.textAlign = 'left';
      y = ky + 78;
      const section = (title, list) => {
        if (!list || !list.length) return;
        ensure(60); font(700, 15); g.fillStyle = FAINT; g.fillText(title.toUpperCase(), L, y + 16); y += 26;
        for (const it of list) { font(500, 18); const n = wrap(g, it, R - L - 34).length; ensure(n * 26 + 6); g.fillStyle = '#7c5cff'; g.fillRect(L + 6, y + 11, 6, 6); para(it, { size: 18, x: L + 24, maxW: R - L - 34, color: '#2a3150' }); y += 4; }
        y += 6;
      };
      if (report && report.why && report.why[s.id] && report.why[s.id].length) {
        ensure(60); font(700, 15); g.fillStyle = TAGC[tagOf(s)] || FAINT; g.fillText(('Why: ' + tagOf(s)).toUpperCase(), L, y + 16); y += 26;
        for (const it of report.why[s.id]) { const warn = /^Only if|confirm|check|Needs|differ|Priority|Selection|limited|closed|Renewal|aptitude/i.test(it); font(500, 18); const n = wrap(g, it, R - L - 34).length; ensure(n * 26 + 6); g.fillStyle = warn ? '#b26a00' : '#12805a'; g.beginPath(); g.arc(L + 9, y + 14, 5, 0, 7); g.fill(); para(it, { size: 18, x: L + 24, maxW: R - L - 34, color: '#2a3150' }); y += 4; }
        y += 6;
      }
      section('Who can apply (eligibility)', s.elig || [s.who]);
      section("Who can't apply", s.notElig);
      section('What you get', s.benefits || [s.benefit]);
      if (s.select) section('How students are selected', [s.select]);
      section('Renewal (2nd year onwards)', s.renew);
      section('Documents for this scheme', s.docs);
      section('About the last date', [s.dateNote || [s.expect, s.prev].filter(Boolean).join('. ')]);
      ensure(80);
      if (s.apply) { font(700, 15); g.fillStyle = FAINT; g.fillText('APPLY HERE', L, y + 19); const at = s.apply.replace(/^https?:\/\//, '').replace(/\/$/, ''); const lw = link(fit(at, 19, R - L - 180), s.apply, L + 180, y); if (s.applyNote) { font(500, 16); const nt = '   (' + s.applyNote + ')'; if (L + 180 + lw + g.measureText(nt).width <= R) { g.fillStyle = SOFT; g.fillText(nt, L + 180 + lw, y + 19); } else { y += 30; para(s.applyNote, { size: 16, color: SOFT, x: L + 180, maxW: R - L - 180 }); y -= 26; } } y += 34; }
      if (s.info) { font(700, 15); g.fillStyle = FAINT; g.fillText('OFFICIAL DETAILS', L, y + 19); link(fit(s.info.replace(/^https?:\/\//, '').replace(/\/$/, ''), 17, R - L - 180), s.info, L + 180, y, 17); y += 34; }
      // info kaha se mila: har source clickable
      ensure(40); font(700, 15); g.fillStyle = FAINT; g.fillText('INFO FROM', L, y + 19);
      { let x = L + 180; for (const [lab, u] of s.src) { const t = lab; font(700, 16); const w = g.measureText(t).width; if (x + w > R) { x = L + 180; y += 28; ensure(30); } if (u) link(t, u, x, y, 16); else { g.fillStyle = INK; g.fillText(t, x, y + 16); } x += w + 26; } }
      y += 30; font(500, 14); g.fillStyle = FAINT; g.fillText(`Checked ${fmtDay(SCH_CHECKED)} · tap a blue link to open the page`, L + 180, y + 14); y += 34;
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

  // ----- live news (clickable, with source) -----
  const srcs = (news || []).filter(n => n.notices && n.notices.length).sort((a, b) => (a.type === 'trusted') - (b.type === 'trusted'));
  if (srcs.length) {
    heading('Latest scholarship news', `Read from the portals in the live check of ${liveAt ? istTime(liveAt) : 'rtuhub.in'}. "Official" = government or provider website. "Trusted" = scholarship guide website (confirm on the official site).`);
    for (const n of srcs.slice(0, 8)) {
      ensure(80);
      const kind = n.type === 'trusted' ? 'Trusted' : 'Official';
      const w = link(n.name, n.url, L, y, 19);
      font(700, 13); const kw = g.measureText(kind.toUpperCase()).width + 18;
      g.fillStyle = kind === 'Official' ? '#e3f7ee' : '#fff3df'; g.fillRect(L + w + 14, y + 2, kw, 22);
      g.fillStyle = kind === 'Official' ? '#12805a' : '#b26a00'; g.fillText(kind.toUpperCase(), L + w + 23, y + 18);
      font(500, 15); g.fillStyle = FAINT; g.fillText(n.site || '', L + w + kw + 26, y + 18);
      y += 34;
      for (const it of n.notices.slice(0, 4)) {
        font(500, 17); const lines = wrap(g, it.t, R - L - 40).slice(0, 3); ensure(lines.length * 25 + 26);
        g.fillStyle = '#7c5cff'; g.fillRect(L + 6, y + 10, 6, 6);
        if (it.u) lines.forEach((ln, k) => link(ln, it.u, L + 24, y + k * 25, 17));
        else { g.fillStyle = '#2a3150'; lines.forEach((ln, k) => g.fillText(ln, L + 24, y + 17 + k * 25)); }
        y += lines.length * 25 + 2; font(500, 13); g.fillStyle = FAINT;
        let host = n.site || ''; try { if (it.u) host = new URL(it.u).hostname.replace(/^www\./, ''); } catch (e) {}
        g.fillText('from ' + host, L + 24, y + 13); y += 24;
      }
      y += 8;
    }
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

  const jpegs = await Promise.all(pages.map(({ c }) => new Promise(done => c.toBlob(b => b.arrayBuffer().then(buf => done(new Uint8Array(buf))), 'image/jpeg', 0.84))));
  const name = report ? `rtuhub-my-scholarship-report-${SCH_SESSION}.pdf` : `rtuhub-scholarships-${SCH_SESSION}${catLabel === 'All' ? '' : '-' + catLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
  const blob = pdfFromJpegs(jpegs, pages.map(p => p.links), (report ? 'My scholarship report ' : 'RTU scholarships ') + SCH_SESSION);
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
