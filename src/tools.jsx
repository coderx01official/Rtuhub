// =====================================================================
//  TOOLS — RTU SGPA Calculator + Scientific Calculator (React)
// =====================================================================
import { useEffect, useReducer, useRef, useState } from 'react';
import {
  GRADE_POINTS, SEMS, MIN_PASS, PASS_MARKS, MARK_BANDS, CREDITS_TILL,
  gradeFromMarks, parseResult, itemsToLines
} from './data.js';

const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
const round = n => String(Math.round(n * 100) / 100);
const predMarks = r => r.predMarks === undefined ? PASS_MARKS : r.predMarks;
const predGrade = r => r.predict || MIN_PASS;
const totalOf = r => r.total !== undefined ? r.total : (r.marks && r.marks.length ? r.marks.reduce((s, v) => s + (+v), 0) : null);

// pdf.js sirf tab load hota hai jab koi result PDF upload kare
let pdfjsLoading;
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve();
  return pdfjsLoading || (pdfjsLoading = new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = PDFJS + 'pdf.min.js';
    s.onload = ok;
    s.onerror = () => { pdfjsLoading = null; fail(new Error('The PDF reader did not load. Check your internet and reload the page.')); };
    document.head.appendChild(s);
  }));
}

async function readPdf(file) {
  await loadPdfJs();
  if (!window.pdfjsLib) throw new Error('The PDF reader did not load. Check your internet and reload the page.');
  try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; } catch (e) {}
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await window.pdfjsLib.getDocument({ data }).promise;
  let lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    lines = lines.concat(itemsToLines(tc.items));
  }
  return lines;
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
      <h1 className="sgpa-title"><i className="fas fa-calculator"></i> RTU SGPA CALCULATOR</h1>
      <p className="sgpa-sub">Upload your RTU result PDF and your SGPA appears on its own. Or fill the grades by hand below.</p>

      <div className="panel" id="panelUp">
        <label className={'drop' + (over ? ' over' : '')} id="drop" htmlFor="file" tabIndex="0"
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileEl.current.click(); } }}
          onDragEnter={e => { e.preventDefault(); setOver(true); }} onDragOver={e => { e.preventDefault(); setOver(true); }}
          onDragLeave={e => { e.preventDefault(); setOver(false); }}
          onDrop={e => { e.preventDefault(); setOver(false); handleFile(e.dataTransfer.files[0]); }}>
          <strong>Upload result PDF</strong>
          <span>The file you download from the RTU result page. It is read on your device and never sent anywhere.</span>
        </label>
        <input ref={fileEl} type="file" id="file" accept="application/pdf,.pdf" onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} />
      </div>

      <div className="panel manual" id="panelMan">
        <label htmlFor="sem"><i className="fas fa-pen"></i> Or fill by hand — choose your semester</label>
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
        <h2 style={{ color: '#ffd966', marginBottom: 10 }}>CGPA after this semester</h2>
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

      <footer style={{ marginTop: 26, fontSize: '.82rem', color: '#9aa6bf' }}>The web result is provisional. The mark-sheet issued by RTU is final.</footer>
    </>
  );
}

// ---------------------------------------------------------------------
//  SCIENTIFIC CALCULATOR
// ---------------------------------------------------------------------
const KEYS = [
  ['sin', 'sin', 'function'], ['cos', 'cos', 'function'], ['tan', 'tan', 'function'], ['asin', 'sin⁻¹', 'function'], ['acos', 'cos⁻¹', 'function'], ['atan', 'tan⁻¹', 'function'],
  ['sqrt', '√', 'function'], ['cbrt', '∛', 'function'], ['square', 'x²', 'function'], ['^', 'xʸ', 'function'], ['fact', 'n!', 'function'], ['log', 'log', 'function'],
  ['ln', 'ln', 'function'], ['exp', 'eˣ', 'function'], ['10x', '10ˣ', 'function'], ['pi', 'π', 'function'], ['e', 'e', 'function'], ['1x', '1/x', 'function'],
  ['(', '(', ''], [')', ')', ''], ['C', 'C', 'clear'], ['AC', 'AC', 'clear'], ['del', '⌫', 'operator'], ['/', '÷', 'operator'],
  ['7', '7', ''], ['8', '8', ''], ['9', '9', ''], ['*', '×', 'operator'], ['4', '4', ''], ['5', '5', ''],
  ['6', '6', ''], ['-', '−', 'operator'], ['1', '1', ''], ['2', '2', ''], ['3', '3', ''], ['+', '+', 'operator'],
  ['0', '0', 'zero'], ['.', '.', ''], ['+-', '±', ''], ['=', '=', 'equals']
];
const FUNCS = {
  sin: v => Math.sin(v * Math.PI / 180), cos: v => Math.cos(v * Math.PI / 180), tan: v => Math.tan(v * Math.PI / 180),
  asin: v => Math.asin(v) * 180 / Math.PI, acos: v => Math.acos(v) * 180 / Math.PI, atan: v => Math.atan(v) * 180 / Math.PI,
  sqrt: Math.sqrt, cbrt: Math.cbrt, square: v => v * v,
  fact: v => { let r = 1; for (let i = 2; i <= v; i++) r *= i; return r; },
  log: Math.log10, ln: Math.log, exp: Math.exp, '10x': v => Math.pow(10, v), '1x': v => 1 / v, pi: () => Math.PI, e: () => Math.E
};

function calcStep(s, key) {
  let { cur, prev, op, wait } = s;
  const run = () => {
    if (!op || wait) return;
    const a = parseFloat(prev), b = parseFloat(cur);
    const res = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : op === '/' ? a / b : Math.pow(a, b);
    cur = res.toString(); op = null; prev = ''; wait = true;
  };
  if (/^[0-9.]$/.test(key)) {
    if (wait) { cur = key; wait = false; } else cur = cur === '0' ? key : cur + key;
  } else if (key === 'C') cur = '0';
  else if (key === 'AC') { cur = '0'; prev = ''; op = null; wait = false; }
  else if (key === 'del') cur = cur.length > 1 ? cur.slice(0, -1) : '0';
  else if (key === '+-') cur = (parseFloat(cur) * -1).toString();
  else if (key === '=') run();
  else if (['+', '-', '*', '/', '^'].includes(key)) { if (op && !wait) run(); prev = cur; op = key; wait = true; }
  else if (FUNCS[key]) { cur = FUNCS[key](parseFloat(cur)).toString(); wait = true; }
  return { cur, prev, op, wait };
}

export function Calculator() {
  const [s, press] = useReducer(calcStep, { cur: '0', prev: '', op: null, wait: false });
  return (
    <>
      <div className="calc-subdisplay" id="calcSubDisplay">{s.prev && s.op ? `${s.prev} ${s.op}` : ''}</div>
      <div className="calc-display" id="calcDisplay">{s.cur}</div>
      <div className="calc-buttons">
        {KEYS.map(([v, label, cls]) => <div key={v} className={'calc-btn' + (cls ? ' ' + cls : '')} data-value={v} onClick={() => press(v)}>{label}</div>)}
      </div>
    </>
  );
}
