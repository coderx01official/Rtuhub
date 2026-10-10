// =====================================================================
//  TOOLS — RTU SGPA Calculator + Scientific Calculator (React)
// =====================================================================
import { useEffect, useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { loadPdfLib } from './viewer.jsx';
import {
  GRADE_POINTS, SEMS, MIN_PASS, PASS_MARKS, MARK_BANDS, CREDITS_TILL,
  gradeFromMarks, parseResult, itemsToLines
} from './data.js';

const round = n => String(Math.round(n * 100) / 100);
const predMarks = r => r.predMarks === undefined ? PASS_MARKS : r.predMarks;
const predGrade = r => r.predict || MIN_PASS;
const totalOf = r => r.total !== undefined ? r.total : (r.marks && r.marks.length ? r.marks.reduce((s, v) => s + (+v), 0) : null);

// Result PDF padhna. Wahi pdf.js jo paper viewer chalata hai (site par hi rakha hai),
// isliye "API version does not match Worker version" wali galti ab nahi aa sakti.
async function readPdf(file) {
  let pdfjs;
  try { pdfjs = await loadPdfLib(); } catch (e) { throw new Error('The PDF reader did not load. Check your internet and reload the page.'); }
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data, verbosity: 0 });
  const pdf = await task.promise;
  let lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    lines = lines.concat(itemsToLines(tc.items));
  }
  try { task.destroy(); } catch (e) {}
  return lines;
}

// ---------------------------------------------------------------------
//  MINI TUTORIAL — pehli baar SGPA calculator kholne par apne aap chalta hai
//  (story jaisa: 4 scene, har ek ~4 second). Demo mein naam / roll number chhupa hai.
// ---------------------------------------------------------------------
const TOUR = [
  ['Download your result', 'Open the official RTU result page and save your result as a PDF.'],
  ['Tap "Upload result PDF"', 'Choose the PDF you just saved. No typing needed.'],
  ['It is read on your device', 'Your name and roll number stay private. The file is never sent to any server.'],
  ['Your SGPA, instantly', 'Credits are filled from the RTU scheme. Change any grade to see how your SGPA moves.']
];
const SCENE_MS = 4200;

function CountUp({ to }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t0 = Date.now() + 500;
    const t = setInterval(() => {
      const k = Math.min(Math.max((Date.now() - t0) / 1300, 0), 1);
      setV(to * (1 - Math.pow(1 - k, 3)));
      if (k === 1) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, []);
  return v.toFixed(2);
}

function Scene({ n }) {
  if (n === 0) return (
    <div className="tour-art a1">
      <div className="tour-url"><i className="fas fa-lock" aria-hidden="true"></i> rtu.ac.in  ›  Result</div>
      <div className="tour-doc"><b></b><i></i><i></i><i></i><i></i></div>
      <div className="tour-key"><i className="fas fa-download" aria-hidden="true"></i> Download PDF<u></u></div>
      <div className="tour-file"><i className="fas fa-file-pdf" aria-hidden="true"></i> result.pdf</div>
    </div>
  );
  if (n === 1) return (
    <div className="tour-art a2">
      <div className="tour-drop"><b>Upload result PDF</b><span>Tap here and choose your file</span><u></u></div>
      <div className="tour-file"><i className="fas fa-file-pdf" aria-hidden="true"></i> result.pdf</div>
    </div>
  );
  if (n === 2) return (
    <div className="tour-art a3">
      <div className="tour-sheet">
        <div className="tour-hide"><span>Name</span><em>hidden</em></div>
        <div className="tour-hide"><span>Roll No</span><em>hidden</em></div>
        {['A+', 'B+', 'A++', 'A', 'B+'].map((g, i) => <div className="tour-row" key={i} style={{ '--i': i }}><i style={{ width: 46 + (i * 17) % 34 + '%' }}></i><b>{g}</b></div>)}
        <u></u>
      </div>
      <div className="tour-safe"><i className="fas fa-shield-alt" aria-hidden="true"></i> On your device only</div>
    </div>
  );
  return (
    <div className="tour-art a4">
      <div className="tour-ring"><small>Your SGPA</small><b><CountUp to={8.42} /></b><em>PASS</em></div>
      <div className="tour-stats"><span><b>20.5</b>credits</span><span><b>0</b>backlogs</span></div>
    </div>
  );
}

function Tour({ close, upload }) {
  const [n, setN] = useState(0);
  const last = n === TOUR.length - 1;
  useEffect(() => {
    if (last) return;
    const t = setTimeout(() => setN(n + 1), SCENE_MS);
    return () => clearTimeout(t);
  }, [n]);
  useEffect(() => {
    const esc = e => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);
  return createPortal(
    <div className="tour" id="sgpaTour" role="dialog" aria-modal="true" aria-label="How the SGPA calculator works">
      <div className="tour-card">
        <div className="tour-bars" aria-hidden="true">
          {TOUR.map((_, i) => <span key={i} className={i < n ? 'full' : i === n ? 'run' : ''}><i key={n} style={{ animationDuration: SCENE_MS + 'ms' }}></i></span>)}
        </div>
        <div className="tour-top"><span>How it works</span><button type="button" id="tourSkip" onClick={close}>Skip <i className="fas fa-times" aria-hidden="true"></i></button></div>
        <div className="tour-stage" key={n} onClick={() => !last && setN(n + 1)}><Scene n={n} /></div>
        <div className="tour-text" key={'t' + n} aria-live="polite">
          <small>Step {n + 1} of {TOUR.length}</small>
          <h3>{TOUR[n][0]}</h3>
          <p>{TOUR[n][1]}</p>
        </div>
        <div className="tour-nav">
          <button type="button" className="tour-back" disabled={n === 0} onClick={() => setN(n - 1)}>Back</button>
          {last
            ? <button type="button" className="tour-go" id="tourUpload" onClick={upload}><i className="fas fa-upload" aria-hidden="true"></i> Upload my result</button>
            : <button type="button" className="tour-go" id="tourNext" onClick={() => setN(n + 1)}>Next</button>}
        </div>
      </div>
    </div>, document.body);
}

function GradeSelect({ value, blank, ...rest }) {
  return (
    <select value={value} {...rest}>
      {blank && <option value="">–</option>}
      {Object.keys(GRADE_POINTS).map(k => <option key={k} value={k}>{k}</option>)}
    </select>
  );
}

// RTU formula: SGPA = sum(credit x grade point) / sum(credit).
// A failed subject (F) gives 0 grade points but its credits stay in the total.
function compute(rows) {
  let pts = 0, cred = 0, earned = 0, missing = 0, extra = 0;
  const fails = [];
  rows.forEach(r => {
    if (r.credits == null || !(r.grade in GRADE_POINTS)) { missing++; return; }
    pts += GRADE_POINTS[r.grade] * r.credits; cred += r.credits;
    if (r.grade === 'F') { fails.push(r); extra += GRADE_POINTS[predGrade(r)] * r.credits; }
    else earned += r.credits;
  });
  return { pts, cred, earned, missing, fails, backlogs: fails.length, sg: cred > 0 ? pts / cred : null, nsg: cred > 0 ? (pts + extra) / cred : null };
}

function Row({ r, i, byMarks, changed, remove }) {
  const name = r.title || 'subject';
  const fail = r.grade === 'F';
  const badGrade = !(r.grade in GRADE_POINTS);
  const pm = useRef(null);
  const mk = r.marks && r.marks.length ? (r.marks.length === 2 ? 'Mid ' + r.marks[0] + ', End ' + r.marks[1] : 'Marks ' + r.marks.join(', ')) : '';
  const meta = [r.code, mk].filter(Boolean).join('  ·  ');
  const total = totalOf(r), pmv = predMarks(r);
  return (
    <div className={'row' + (fail ? ' failrow' : '')}>
      <div>
        {r.custom
          ? <input className="t-in" type="text" placeholder="Subject name" defaultValue={r.title} aria-label="Subject name"
              onInput={e => { r.title = e.target.value; changed(); }} />
          : <><div className="t">{r.title}</div>{meta && <div className="c">{meta}</div>}</>}
        {!r.sure && !r.custom && <div className="flag">{r.credits == null ? 'Enter credits from your scheme' : 'Check credits with your scheme'}</div>}
        <div className="flag" hidden={!fail}>Backlog: 0 grade points, credits still counted</div>
      </div>
      <input type="number" step="0.5" min="0" inputMode="decimal" className={r.credits == null ? 'bad' : undefined}
        defaultValue={r.credits == null ? '' : r.credits} aria-label={'Credits for ' + name}
        onInput={e => { const v = parseFloat(e.target.value); r.credits = isNaN(v) ? null : v; changed(); }} />
      {byMarks
        ? <div className="mk">
            <input type="number" min="0" max="100" inputMode="numeric" placeholder="0-100" className={badGrade ? 'bad' : undefined}
              defaultValue={total == null ? '' : total} aria-label={'Total marks for ' + name}
              onInput={e => { const v = parseFloat(e.target.value); r.total = isNaN(v) ? null : v; r.grade = isNaN(v) ? '' : gradeFromMarks(v); changed(); }} />
            <div className={'gl' + (fail ? ' f' : '')}>{r.grade || ''}</div>
          </div>
        : <GradeSelect blank value={badGrade ? '' : r.grade} className={badGrade ? 'bad' : undefined} aria-label={'Grade for ' + name}
            onChange={e => { r.grade = e.target.value; changed(); }} />}
      <button className="x" type="button" aria-label={'Remove ' + name} onClick={remove}>×</button>
      {/* re-exam prediction, shown only on a failed subject */}
      <div className="pred" hidden={!fail}>
        <label htmlFor={'pm' + i}>If you score</label>
        <input ref={pm} type="number" id={'pm' + i} min="0" max="100" inputMode="numeric" placeholder="marks" defaultValue={pmv == null ? '' : pmv}
          onInput={e => {
            const v = parseFloat(e.target.value);
            if (isNaN(v)) r.predMarks = null; else { r.predMarks = v; r.predict = gradeFromMarks(v); }
            changed();
          }} />
        <span className="or">marks, or get grade</span>
        <GradeSelect value={predGrade(r)} aria-label={'Expected grade after re-exam for ' + name}
          onChange={e => { r.predict = e.target.value; r.predMarks = null; pm.current.value = ''; changed(); }} />
      </div>
    </div>
  );
}

export function Sgpa() {
  // rows: {title, code, credits, grade, sure, custom, marks, total, predict, predMarks}
  const st = useRef({ rows: [], info: { name: '', roll: '', sem: null }, ver: 0 }).current;
  const [tick, changed] = useReducer(n => n + 1, 0);
  const [on, setOn] = useState(false);
  const [byMarks, setByMarks] = useState(false);
  const [status, setStatus] = useState(['', '']);
  const [note, setNote] = useState('');
  const [sem, setSem] = useState('');
  const [cSem, setCSem] = useState('2');
  const [over, setOver] = useState(false);
  const [cgpa, setCgpa] = useState('');
  const [tour, setTour] = useState(false);
  // pehli baar aane wale ko tutorial apne aap dikhao (sirf ek baar)
  useEffect(() => { try { if (localStorage.getItem('rtuhub_sgpa_tour') !== '1') setTour(true); } catch (e) {} }, []);
  const endTour = () => { setTour(false); try { localStorage.setItem('rtuhub_sgpa_tour', '1'); } catch (e) {} };
  const resultEl = useRef(null), fileEl = useRef(null), cPrev = useRef(null), cCur = useRef(null);

  // rows ko naye sire se draw karna (purane render() jaisa)
  const redraw = () => { st.ver++; setOn(true); changed(); };

  const c = compute(st.rows);
  const { sg, nsg, backlogs, missing, fails } = c;
  const sgTxt = sg == null ? '–' : sg.toFixed(2);

  useEffect(() => { if (sg != null && missing === 0 && cCur.current) cCur.current.value = sg.toFixed(2); }, [tick]);
  useEffect(() => {
    window.__sgpa = { loadParsed(res) { st.info = { name: res.name, roll: res.roll, sem: res.sem }; st.rows = res.rows.map(r => ({ ...r })); redraw(); } };
  }, []);

  function loadManual(n) {
    st.info = { name: '', roll: '', sem: n };
    st.rows = Object.entries(SEMS[n - 1]).map(([title, credits]) => ({ title, code: '', credits, grade: '', sure: true }));
    setNote(n >= 3 ? 'Semesters 3 to 8 are listed with the CSE scheme. Change subjects or credits if your branch differs.' : 'Your subjects may differ by group. Remove or add subjects to match your result.');
    if (n >= 2) setCSem(String(n));
    setStatus(['', '']);
    redraw();
  }

  async function handleFile(file) {
    if (!file) return;
    if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) { setStatus(['That is not a PDF. Upload the PDF you downloaded from the RTU result page.', 'err']); return; }
    setStatus(['Reading ' + file.name + '…', '']);
    try {
      const lines = await readPdf(file);
      const res = parseResult(lines);
      if (!res.rows.length) {
        setStatus([lines.length ? 'No subjects found in this PDF. It may not be an RTU grading result.' : 'This PDF has no readable text (it looks like a photo or scan). Use the PDF from the RTU result page, or fill by hand.', 'err']);
        return;
      }
      st.info = { name: res.name, roll: res.roll, sem: res.sem };
      st.rows = res.rows.map(r => ({ title: r.title, code: r.code, credits: r.credits, grade: r.grade, sure: r.sure, marks: r.marks }));
      setSem('');
      setNote('Credits come from the RTU scheme. Change any credit, grade or marks and the SGPA updates. A failed subject (F) counts as 0 grade points with its full credits.');
      if (res.sem >= 2) setCSem(String(res.sem));
      setStatus(['Filled ' + st.rows.length + ' subjects from ' + file.name + '.', 'ok']);
      redraw();
      setTimeout(() => resultEl.current && resultEl.current.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (e) {
      setStatus([e && e.name === 'PasswordException' ? 'This PDF is password protected.' : (e.message || 'Could not read this PDF.'), 'err']);
    }
  }

  function clearAll() {
    st.rows = []; st.info = { name: '', roll: '', sem: null };
    setSem(''); setStatus(['', '']); setOn(false); changed();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function calcCgpa() {
    const s = +cSem, prev = parseFloat(cPrev.current.value), cur = parseFloat(cCur.current.value);
    if (isNaN(prev) || isNaN(cur)) { setCgpa("Enter both your last CGPA and this semester's SGPA."); return; }
    const before = CREDITS_TILL[s - 1], now = CREDITS_TILL[s] - before;
    setCgpa('Your CGPA is ' + ((prev * before + cur * now) / (before + now)).toFixed(2));
  }

  // what the SGPA becomes once the failed subjects are cleared
  let after = null;
  if (sg != null && backlogs > 0) {
    const stillFail = fails.filter(r => predGrade(r) === 'F');
    let lead, showNum = true;
    if (backlogs === 1) {
      const r = fails[0], t = r.title || 'this subject', m = predMarks(r), g = predGrade(r);
      if (g === 'F') { lead = (m != null ? m + ' marks' : 'Grade F') + ' in ' + t + ' is still a fail. You need at least ' + PASS_MARKS + ' marks to pass.'; showNum = false; }
      else if (m != null) lead = 'If you score ' + m + ' marks in ' + t + ' (grade ' + g + '), your SGPA becomes ';
      else lead = 'If you clear ' + t + ' with grade ' + g + ', your SGPA becomes ';
    } else {
      lead = 'If you clear your ' + backlogs + ' backlogs with the marks set below, your SGPA becomes ';
    }
    let tail = 'That is +' + (nsg - sg).toFixed(2) + '. Marks mean mid-term + end-term total out of 100.';
    if (backlogs > 1 && stillFail.length) tail = stillFail.length + ' of them would still be a fail with those marks. ' + tail;
    after = <>{lead}{showNum && <><b>{nsg.toFixed(2)}</b>.<small>{tail}</small></>}</>;
  }
  const who = [st.info.name, st.info.roll, st.info.sem ? 'Semester ' + st.info.sem : ''].filter(Boolean).join('  |  ');

  return (
    <>
      <div className="panel" id="panelUp">
        <label className={'drop' + (over ? ' over' : '')} id="drop" htmlFor="file" tabIndex="0"
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileEl.current.click(); } }}
          onDragEnter={e => { e.preventDefault(); setOver(true); }} onDragOver={e => { e.preventDefault(); setOver(true); }}
          onDragLeave={e => { e.preventDefault(); setOver(false); }}
          onDrop={e => { e.preventDefault(); setOver(false); handleFile(e.dataTransfer.files[0]); }}>
          <strong>Upload result PDF</strong>
          <span>Download your result from the official RTU website, upload it here and see your SGPA instantly.</span>
          <em><i className="fas fa-shield-alt" aria-hidden="true"></i> Read on your device. Never sent anywhere.</em>
        </label>
        <button type="button" className="tour-open" id="tourOpen" onClick={() => setTour(true)}><i className="fas fa-play-circle" aria-hidden="true"></i> Watch how it works <small>15 sec</small></button>
        {tour && <Tour close={endTour} upload={() => { endTour(); fileEl.current.click(); }} />}
        <input ref={fileEl} type="file" id="file" accept="application/pdf,.pdf" onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} />
      </div>

      <div className="panel manual" id="panelMan">
        <label htmlFor="sem">Or fill by hand: choose your semester</label>
        <select id="sem" value={sem} onChange={e => { setSem(e.target.value); if (e.target.value) loadManual(+e.target.value); }}>
          <option value="">Choose semester</option>
          {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map((s, i) => <option key={s} value={i + 1}>{s} semester</option>)}
        </select>
        <p>Subjects and credits load on their own. Pick your grade for each one, or edit any row below.</p>
      </div>
      <div className={'status' + (status[1] ? ' ' + status[1] : '')} id="status" role="status" aria-live="polite">{status[0]}</div>

      <section ref={resultEl} className={'result' + (on ? ' on' : '')} id="result" aria-live="polite">
        <div className="who" id="who" style={{ display: who ? '' : 'none' }}>{who}</div>
        <div className="score">
          <span className="lbl">Your SGPA</span>
          <span className="num pop" id="sgpa" key={sgTxt}>{sgTxt}</span>
          <span className={'chip' + (sg == null ? '' : backlogs ? ' fail' : missing ? '' : ' pass')} id="chip">{backlogs ? 'FAIL' : 'PASS'}</span>
        </div>
        <div className="stats">
          <div><b id="stEarn">{sg == null ? '–' : round(c.earned)}</b>credits earned</div>
          <div><b id="stTotal">{sg == null ? '–' : round(c.cred)}</b>total credits</div>
          <div><b id="stBack" className={backlogs > 0 ? 'red' : undefined}>{sg == null ? '–' : backlogs}</b>backlogs</div>
        </div>
        <div className="math" id="math">{sg == null ? '' : round(c.pts) + ' grade points ÷ ' + round(c.cred) + ' credits'}</div>
        <div className={'after' + (after ? ' on' : '')} id="after">{after}</div>
        <div className={'need' + (missing > 0 ? ' on' : '')} id="need">
          {missing ? missing + (missing === 1 ? ' subject is' : ' subjects are') + ' missing credits or a ' + (byMarks ? 'mark' : 'grade') + ', so ' + (missing === 1 ? 'it is' : 'they are') + ' not counted yet.' : ''}
        </div>
      </section>

      <section className={'rows' + (on ? ' on' : '')} id="rowsBox">
        <div className="mini" id="mini" aria-hidden="true">
          {sg != null ? <>SGPA <b>{sg.toFixed(2)}</b>{backlogs > 0 && <span>After re-exam <b>{nsg.toFixed(2)}</b></span>}</> : 'SGPA –'}
        </div>
        <div className="mode">
          <span id="modeLbl">Enter each subject by</span>
          <div className="seg" role="tablist" aria-labelledby="modeLbl">
            <button type="button" role="tab" id="byGrade" aria-selected={!byMarks} onClick={() => { setByMarks(false); redraw(); }}>Grade</button>
            <button type="button" role="tab" id="byMarks" aria-selected={byMarks} onClick={() => { setByMarks(true); redraw(); }}>Marks</button>
          </div>
        </div>
        <div className="head"><span>Subject</span><span style={{ textAlign: 'center' }}>Credits</span><span style={{ textAlign: 'center' }} id="colHead">{byMarks ? 'Marks' : 'Grade'}</span><span></span></div>
        <div id="rows">
          {st.rows.map((r, i) => <Row key={st.ver + '-' + i} r={r} i={i} byMarks={byMarks} changed={changed} remove={() => { st.rows.splice(i, 1); redraw(); }} />)}
        </div>
        <div className="actions">
          <button className="add" id="add" type="button" onClick={() => { st.rows.push({ title: '', code: '', credits: null, grade: '', sure: true, custom: true }); redraw(); }}>Add a subject</button>
          <button className="add quiet" id="clear" type="button" onClick={clearAll}>Clear all</button>
        </div>
        <details className="table">
          <summary>Which marks give which grade?</summary>
          <ul id="bands">
            {MARK_BANDS.map(([min, g], i) => <li key={g}><b>{g}</b>{min + (i ? '–' + (MARK_BANDS[i - 1][0] - 1) : '+')}</li>)}
            <li><b>F</b>{'below ' + PASS_MARKS}</li>
          </ul>
          <p>Marks are the total of mid-term and end-term out of 100. This table is worked out from recent RTU results, not an official list, so a grade right on a border can differ by a mark or two.</p>
        </details>
        <p className="note" id="rowsNote">{note}</p>
      </section>

      <section className="cgpa">
        <h2 style={{ fontSize: '1.15rem', marginBottom: 12 }}>CGPA after this semester</h2>
        <div className="grid">
          <div className="full">
            <label htmlFor="cSem">This semester</label>
            <select id="cSem" value={cSem} onChange={e => setCSem(e.target.value)}>
              {['2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map((s, i) => <option key={s} value={i + 2}>{s}</option>)}
            </select>
          </div>
          <div><label htmlFor="cPrev">CGPA till last semester</label><input ref={cPrev} type="number" id="cPrev" inputMode="decimal" step="0.01" min="0" max="10" /></div>
          <div><label htmlFor="cCur">SGPA this semester</label><input ref={cCur} type="number" id="cCur" inputMode="decimal" step="0.01" min="0" max="10" /></div>
        </div>
        <button className="go" id="cGo" type="button" onClick={calcCgpa}>Calculate CGPA</button>
        <div id="cgpaOut" aria-live="polite">{cgpa}</div>
      </section>

      <footer>The web result is provisional. The mark-sheet issued by RTU is final.</footer>
    </>
  );
}

// ---------------------------------------------------------------------
//  SCIENTIFIC CALCULATOR
//  Poora sawaal screen par likho (brackets ke saath), "=" dabao.
//  BODMAS sahi chalta hai: 2 + 3 × 4 = 14.  Apna parser hai, eval() nahi.
// ---------------------------------------------------------------------
const SHOW = { '*': '×', '/': '÷', '-': '−', pi: 'π', sq: '²', cube: '³', inv: '⁻¹', 'asin(': 'sin⁻¹(', 'acos(': 'cos⁻¹(', 'atan(': 'tan⁻¹(', 'sqrt(': '√(', 'cbrt(': '∛(' };
const BINARY = ['+', '-', '*', '/', '^'];
const POSTFIX = ['!', '%', 'sq', 'cube', 'inv'];
const COMBO = { '10x': ['1', '0', '^', '('], exp: ['e', '^', '('], root: ['^', '(', '1', '/'] };   // ek button = kai token
const isNum = t => /^[0-9.]$/.test(t);
const isOpen = t => t !== undefined && t.endsWith('(');
const snap = x => Math.abs(x) < 1e-13 ? 0 : x;
const fail = msg => { throw new Error(msg); };

const FN = {
  'sin(': (v, deg) => deg ? (v % 180 === 0 ? 0 : snap(Math.sin(v * Math.PI / 180))) : snap(Math.sin(v)),
  'cos(': (v, deg) => deg ? ((v - 90) % 180 === 0 ? 0 : snap(Math.cos(v * Math.PI / 180))) : snap(Math.cos(v)),
  'tan(': (v, deg) => {
    if (deg && v % 180 === 0) return 0;
    if (deg ? (v - 90) % 180 === 0 : snap(Math.cos(v)) === 0) fail('tan is not defined here');
    return snap(Math.tan(deg ? v * Math.PI / 180 : v));
  },
  'asin(': (v, deg) => Math.asin(v) * (deg ? 180 / Math.PI : 1),
  'acos(': (v, deg) => Math.acos(v) * (deg ? 180 / Math.PI : 1),
  'atan(': (v, deg) => Math.atan(v) * (deg ? 180 / Math.PI : 1),
  'sqrt(': v => Math.sqrt(v), 'cbrt(': v => Math.cbrt(v),
  'log(': v => v > 0 ? Math.log10(v) : NaN, 'ln(': v => v > 0 ? Math.log(v) : NaN,
  '(': v => v
};
function factorial(v) {
  if (v < 0 || v > 170 || Math.round(v) !== v) fail('n! needs a whole number, 0 to 170');
  let r = 1; for (let i = 2; i <= v; i++) r *= i;
  return r;
}

// tokens -> number.  Galti ho to Error (message screen par dikhta hai).
export function calcEval(tokens, ans = 0, deg = true) {
  const out = [];
  for (let i = 0; i < tokens.length;) {
    if (!isNum(tokens[i])) { out.push(tokens[i++]); continue; }
    let s = '';
    while (isNum(tokens[i])) s += tokens[i++];
    if (tokens[i] === 'E') {   // 1.5E-3 = 1.5 × 10⁻³
      s += 'e'; i++;
      if (tokens[i] === '-' || tokens[i] === '+') s += tokens[i++];
      while (/^[0-9]$/.test(tokens[i])) s += tokens[i++];
    }
    if (!/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(s)) fail('Syntax error');
    out.push({ n: parseFloat(s) });
  }
  let p = 0;
  const starts = t => t !== undefined && (typeof t === 'object' || t === 'pi' || t === 'e' || t === 'Ans' || FN[t]);
  const expr = () => {
    let v = term();
    while (out[p] === '+' || out[p] === '-') {
      const plus = out[p++] === '+', r = term(), sum = plus ? v + r : v - r;
      v = Math.abs(sum) < 1e-13 * Math.max(Math.abs(v), Math.abs(r)) ? 0 : sum;   // 0.1 + 0.2 − 0.3 = 0
    }
    return v;
  };
  const term = () => {
    let v = unary();
    for (;;) {
      const t = out[p];
      if (t === '*') { p++; v *= unary(); }
      else if (t === '/') { p++; const r = unary(); if (r === 0) fail("Can't divide by 0"); v /= r; }
      else if (starts(t)) v *= power();   // 2π, 3(4+1), 2sin(30)
      else return v;
    }
  };
  const unary = () => out[p] === '-' ? (p++, -unary()) : out[p] === '+' ? (p++, unary()) : power();
  const power = () => {
    const v = postfix();
    if (out[p] !== '^') return v;
    p++;
    return Math.pow(v, unary());
  };
  const postfix = () => {
    let v = primary();
    for (;; p++) {
      const t = out[p];
      if (t === '!') v = factorial(v);
      else if (t === '%') v /= 100;
      else if (t === 'sq') v *= v;
      else if (t === 'cube') v = v * v * v;
      else if (t === 'inv') { if (v === 0) fail("Can't divide by 0"); v = 1 / v; }
      else return v;
    }
  };
  const primary = () => {
    const t = out[p++];
    if (t === undefined) fail('Syntax error');
    if (typeof t === 'object') return t.n;
    if (t === 'pi') return Math.PI;
    if (t === 'e') return Math.E;
    if (t === 'Ans') return ans;
    if (!FN[t]) fail('Syntax error');
    const v = expr();
    if (out[p] === ')') p++; else if (p < out.length) fail('Syntax error');   // aakhri bracket band karna bhool gaye to chalega
    return FN[t](v, deg);
  };
  const v = expr();
  if (p < out.length) fail('Syntax error');
  if (!Number.isFinite(v)) fail(Number.isNaN(v) ? 'Math error' : 'Number too big');
  return v;
}

// number -> screen par dikhne wala text (12 digit tak, faltu 0.30000000000000004 nahi)
export function calcFmt(v) {
  if (v === 0) return '0';
  const a = Math.abs(v);
  let s;
  if (a >= 1e12 || a < 1e-6) {
    const [m, e] = v.toExponential(9).split('e');
    s = String(parseFloat(m)) + 'E' + (+e);
  } else s = String(parseFloat(v.toPrecision(12)));
  return s.replace(/-/g, '−');
}
export const calcShow = tokens => tokens.map(t => SHOW[t] || t).join('');

// abhi jo number likha ja raha hai (jaise "12.5" ya "3E-4")
function numberAtEnd(t) {
  let i = t.length;
  while (i > 0 && (isNum(t[i - 1]) || t[i - 1] === 'E' || ((t[i - 1] === '-' || t[i - 1] === '+') && t[i - 2] === 'E'))) i--;
  return t.slice(i).join('');
}

// ek button dabane par tokens mein kya judega (galat cheez judne hi nahi deta)
function typeKey(tokens, key, fresh) {
  const add = COMBO[key] || [key], first = add[0];
  let t = tokens.slice();
  const last = t[t.length - 1];
  const value = last !== undefined && !BINARY.includes(last) && !isOpen(last) && last !== 'E';   // number / π / ) / ² ke baad
  const needsLeft = BINARY.includes(first) || POSTFIX.includes(first);

  if (!t.length) {
    if (first === '-') return ['-'];
    if (needsLeft) t = [fresh ? '0' : 'Ans'];
  } else if (BINARY.includes(first)) {
    if (last === 'E') return first === '-' ? [...t, '-'] : t;            // 2E−3
    if (isOpen(last)) return first === '-' ? [...t, '-'] : t;            // (−5
    if (BINARY.includes(last)) {
      if (first === '-' && last !== '-' && last !== '+') return [...t, '-'];   // 5 × −2
      while (BINARY.includes(t[t.length - 1]) && !isOpen(t[t.length - 2]) && t.length > 1) t.pop();   // + ke baad × dabaya = badal do
      if (BINARY.includes(t[t.length - 1])) return t;
    }
  } else if (POSTFIX.includes(first)) { if (!value) return t; }
  else if (first === ')') {
    const open = t.filter(isOpen).length - t.filter(x => x === ')').length;
    if (open <= 0 || !value) return t;
  } else if (first === '.') {
    const n = numberAtEnd(t);
    if (/[.E]/.test(n)) return t;
    if (!n) t.push('0');
  } else if (first === 'E') {
    const n = numberAtEnd(t);
    if (!n || n.includes('E')) return t;
  } else if (/^[0-9]$/.test(first)) {
    if (numberAtEnd(t) === '0') t.pop();   // 05 nahi, 5
  }
  return t.length + add.length > 160 ? tokens : [...t, ...add];
}

const CALC0 = { t: [], ans: 0, fresh: true, done: false, res: '', err: '', n: 0, deg: true, second: false, hist: [] };
function calcStep(s, a) {
  if (a.load) return { ...s, ...a.load, fresh: !(a.load.hist && a.load.hist.length) };
  const key = a.key;
  if (key === 'deg') return { ...s, deg: !s.deg, done: false, err: '' };
  if (key === '2nd') return { ...s, second: !s.second };
  if (key === 'AC') return { ...s, t: [], done: false, err: '', res: '' };
  if (key === 'wipe') return { ...s, hist: [] };
  if (a.use) return { ...s, t: a.use.t, done: false, err: '' };
  if (key === 'del') return s.done ? { ...s, done: false } : { ...s, t: s.t.slice(0, -1), err: '' };
  if (key === '=') {
    if (!s.t.length || s.done) return s;
    try {
      const v = calcEval(s.t, s.ans, s.deg), res = calcFmt(v);
      const open = s.t.filter(isOpen).length - s.t.filter(x => x === ')').length;
      const t = [...s.t, ...Array(Math.max(open, 0)).fill(')')];
      const item = { t: t.flatMap(x => x === 'Ans' ? ['(', ...calcFmt(s.ans).replace(/−/g, '-'), ')'] : [x]), r: res, v };   // history mein Ans ki jagah asli number
      return { ...s, t, ans: v, fresh: false, done: true, res, err: '', hist: [item, ...s.hist].slice(0, 20) };
    } catch (e) { return { ...s, err: e.message, n: s.n + 1 }; }
  }
  const base = s.done ? [] : s.t;
  const t = typeKey(base, key, s.fresh);
  return { ...s, t, done: false, err: '', second: false };
}

// [normal key, label, 2nd key, 2nd label]
const FN_KEYS = [
  ['2nd', '2nd'], ['sin(', 'sin', 'asin(', 'sin⁻¹'], ['cos(', 'cos', 'acos(', 'cos⁻¹'], ['tan(', 'tan', 'atan(', 'tan⁻¹'], ['pi', 'π', 'e', 'e'],
  ['sq', 'x²', 'cube', 'x³'], ['sqrt(', '√', 'cbrt(', '∛'], ['^', 'xʸ', 'root', 'ʸ√x'], ['log(', 'log', '10x', '10ˣ'], ['ln(', 'ln', 'exp', 'eˣ'],
  ['(', '('], [')', ')'], ['!', 'n!'], ['inv', '1/x'], ['E', 'EXP']
];
const MAIN_KEYS = [
  ['AC', 'AC', 'clear'], ['del', '⌫', 'clear'], ['%', '%', 'operator'], ['/', '÷', 'operator'],
  ['7', '7'], ['8', '8'], ['9', '9'], ['*', '×', 'operator'],
  ['4', '4'], ['5', '5'], ['6', '6'], ['-', '−', 'operator'],
  ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+', 'operator'],
  ['Ans', 'Ans', 'function'], ['0', '0'], ['.', '.'], ['=', '=', 'equals']
];
const KEYBOARD = { Enter: '=', '=': '=', Backspace: 'del', Delete: 'AC', x: '*', X: '*', p: 'pi', '÷': '/', '×': '*' };

export function Calculator() {
  const [s, send] = useReducer(calcStep, CALC0);
  const [showHist, setShowHist] = useState(false);
  const [copied, setCopied] = useState(false);
  const loaded = useRef(false), line = useRef(null);
  const press = key => { try { navigator.vibrate && navigator.vibrate(8); } catch (e) {} send({ key }); };

  // pichhla hisaab aur DEG/RAD yaad rakhna
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem('rtuhub_calc'));
      if (d && Array.isArray(d.hist)) {
        const hist = d.hist.filter(h => h && Array.isArray(h.t) && typeof h.r === 'string' && typeof h.v === 'number').slice(0, 20);
        send({ load: { deg: d.deg !== false, hist, ans: hist.length ? hist[0].v : 0 } });
      }
    } catch (e) {}
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (loaded.current) try { localStorage.setItem('rtuhub_calc', JSON.stringify({ deg: s.deg, hist: s.hist })); } catch (e) {}
  }, [s.deg, s.hist]);

  // laptop keyboard se bhi chale
  useEffect(() => {
    const down = e => {
      if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const key = KEYBOARD[e.key] || (/^[0-9.+\-*/^()%!]$/.test(e.key) ? e.key : '');
      if (!key) return;
      e.preventDefault();
      send({ key });
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  useEffect(() => { if (line.current) line.current.scrollLeft = line.current.scrollWidth; }, [s.t]);

  // likhte-likhte hi jawab ki jhalak
  let live = '';
  if (!s.done && !s.err && s.t.some(t => !isNum(t))) try { live = calcFmt(calcEval(s.t, s.ans, s.deg)); } catch (e) {}
  const big = s.err || (s.done ? s.res : live ? '= ' + live : s.t.length ? '' : '0');
  const copy = () => {
    const text = (s.done ? s.res : live || calcShow(s.t)).replace(/−/g, '-');
    if (!text || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); }, () => {});
  };

  return (
    <div className="calc">
      <div className={'calc-screen' + (s.done ? ' done' : '') + (s.err ? ' err' : '')}>
        <div className="calc-glass">
          <div className="calc-status"><span>{s.deg ? 'DEG' : 'RAD'}{s.second ? ' · 2ND' : ''}</span><span>rtuhub.in</span></div>
          <div className="calc-subdisplay" id="calcSubDisplay" ref={line}>{calcShow(s.t)}{!s.done && <u aria-hidden="true"></u>}</div>
          <div className={'calc-display' + (big.length > 14 ? ' long' : '')} id="calcDisplay" key={s.err ? 'e' + s.n : s.done ? 'd' + s.hist.length : 'l'} aria-live="polite">{big}</div>
        </div>
      </div>

      <div className="calc-bar">
        <button type="button" className="calc-mode" id="calcMode" aria-label={'Angle unit: ' + (s.deg ? 'degrees' : 'radians') + '. Tap to switch.'} onClick={() => press('deg')}>
          <span className={s.deg ? 'on' : ''}>DEG</span><span className={s.deg ? '' : 'on'}>RAD</span>
        </button>
        <button type="button" className={'calc-chip' + (showHist ? ' on' : '')} id="calcHistBtn" aria-expanded={showHist} onClick={() => setShowHist(!showHist)}>
          <i className="fas fa-history" aria-hidden="true"></i> History{s.hist.length ? ' ' + s.hist.length : ''}
        </button>
        <button type="button" className="calc-chip" id="calcCopy" onClick={copy}>
          <i className={'fas fa-' + (copied ? 'check' : 'copy')} aria-hidden="true"></i> {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="calc-keys">
      {showHist && (
        <div className="calc-hist" id="calcHist">
          {s.hist.length === 0 && <p>Your solved calculations show up here.</p>}
          {s.hist.map((h, i) => (
            <button type="button" key={i} onClick={() => { send({ use: h }); setShowHist(false); }}>
              <span>{calcShow(h.t)}</span><b>{h.r}</b>
            </button>
          ))}
          {s.hist.length > 0 && <button type="button" className="calc-wipe" onClick={() => press('wipe')}><i className="fas fa-trash" aria-hidden="true"></i> Clear history</button>}
        </div>
      )}

      <div className="calc-fn">
        {FN_KEYS.map(([k, label, k2, label2]) => {
          const alt = s.second && k2, v = alt ? k2 : k;
          return <button key={k} type="button" className={'calc-btn function' + (alt ? ' alt' : '') + (k === '2nd' && s.second ? ' on' : '')} data-value={v} onClick={() => press(v)}>{alt ? label2 : label}</button>;
        })}
      </div>
      <div className="calc-main">
        {MAIN_KEYS.map(([v, label, cls]) => <button key={v} type="button" className={'calc-btn' + (cls ? ' ' + cls : '')} data-value={v} aria-label={v === 'del' ? 'Delete' : v === 'AC' ? 'Clear all' : undefined} onClick={() => press(v)}>{label}</button>)}
      </div>
      </div>
    </div>
  );
}
