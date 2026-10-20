// =====================================================================
//  rtuhub.in — poora UI (React). Data src/data.js mein, tools src/tools.jsx mein.
//  Har screen ka apna URL hai, jaise /1styear/pyq/engineering-physics/2025
// =====================================================================
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import {
  SITE, YEARS, SECTIONS, ANOTES, branches, calendarData, rtuLinks, news,
  dashPath, popularPyq, FAQ, resolveRoute, parseRoute, seo, pyqSubjects, paperUrl, paperApiUrl, paperGroups, paperTitle, HOME_LINKS, PUBLIC_FALLBACK,
  nice, itemName, branchShort, splitCurrent, pyqIndex, HUB_FAQ, notesItems, COLLEGES, NOT_RTU, COLLEGES_SOURCE, collegeLabel, collegeFaq
} from './data.js';
import { loadSyllabus, sylFileUrl, findSyllabusFor, matchScore } from './syllabus.js';
import { SCHOLARSHIPS, SCH_CATS, SCH_GROUPS, SCH_KINDS, SCH_CHECKED, SCH_DOCS, SCH_STEPS, LIVE_URL } from './scholarships.js';
import { Sgpa, Calculator } from './tools.jsx';
import { PdfPages, Loader, warmPdf, loadPdfLib, ensureSession } from './viewer.jsx';
import { Chat } from './chat.jsx';
import './style.css';

export * from './data.js';

const isBrowser = typeof window !== 'undefined';
const useIso = isBrowser ? useLayoutEffect : useEffect;
const MAIL = 'coderx01official@gmail.com';

// ---------- ROUTER (bina kisi library ke) ----------
const Nav = createContext(() => {});

function Link({ to, onClick, replace, children, ...rest }) {
  const nav = useContext(Nav);
  return (
    <a href={to} {...rest} onClick={e => {
      if (onClick) onClick(e);
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      nav(to, replace);
    }}>{children}</a>
  );
}
const Icon = ({ n, b }) => <i className={(b ? 'fab' : 'fas') + ' fa-' + n} aria-hidden="true"></i>;

// ---------- LOGO: hexagon + R, kinare par ghoomta hua bindu ----------
const HEX = 'M32 6 54.5 19v26L32 58 9.5 45V19Z';
function Logo() {
  return (
    <svg className="logo" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="logoG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#59c2ff" /><stop offset=".5" stopColor="#8c6cff" /><stop offset="1" stopColor="#ff4fd8" />
        </linearGradient>
      </defs>
      <path d={HEX} fill="#0e1630" stroke="url(#logoG)" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M25 45V20h8.5a7.25 7.25 0 0 1 0 14.5H25m8 0 7.5 10.5" fill="none" stroke="#fff" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle r="3.6" fill="#ffb84d"><animateMotion dur="4s" repeatCount="indefinite" path={HEX} /></circle>
    </svg>
  );
}

// ---------- student ka college — sab RTU colleges ka syllabus same hai, ye sirf "apna" dikhane ke liye ----------
// Default: UCE, RTU Kota. Google se kisi college ke page par aaye (jaise "jecrc pyq") to wahi college apne aap set.
// Menu (3 lines) se khud chuna hua college ("user") kabhi apne aap nahi badalta.
const COLLEGE_KEY = 'rtuhub_college';
export const DEFAULT_COLLEGE = COLLEGES.find(c => c.slug === 'uce-kota') || COLLEGES[0];
const collegeEvents = new Set();
const readCollege = () => { try { const v = JSON.parse(localStorage.getItem(COLLEGE_KEY) || 'null'); return v && typeof v === 'object' ? v : typeof v === 'string' ? { slug: v, by: 'user' } : null; } catch (e) { try { const v = localStorage.getItem(COLLEGE_KEY); return v ? { slug: v, by: 'user' } : null; } catch (x) { return null; } } };
export function setCollege(slug, by = 'user') {
  try { slug ? localStorage.setItem(COLLEGE_KEY, JSON.stringify({ slug, by })) : localStorage.removeItem(COLLEGE_KEY); } catch (e) {}
  collegeEvents.forEach(f => f());
}
// pehli baar kisi college ke page par utra (search se) -> wahi college, agar student ne khud koi aur na chuna ho
export function landOnCollege(slug) {
  const cur = readCollege();
  if (!cur || cur.by !== 'user') setCollege(slug, 'auto');
}
export function useCollege() {
  const [c, setC] = useState(DEFAULT_COLLEGE);
  useEffect(() => {
    const load = () => { const v = readCollege(); setC((v && COLLEGES.find(x => x.slug === v.slug)) || DEFAULT_COLLEGE); };
    load(); collegeEvents.add(load);
    return () => collegeEvents.delete(load);
  }, []);
  return [c, setCollege];
}
// college ka chhota badge (logo ki jagah): JECRC, SKIT, GEC ...
const STOP = new Set(['of', 'and', '&', 'for', 'the', '-', 'group', 'institutions', 'faculty']);
export function monogram(c) {
  const s = (c.short[0] || '').split(' ')[0];
  if (s && s.length <= 5) return s.toUpperCase();
  if (s) return s.slice(0, 3).toUpperCase();
  return c.name.replace(/[.,()]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w.toLowerCase())).slice(0, 3).map(w => w[0]).join('').toUpperCase();
}
export const hueOf = s => { let h = 11; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };

// ---------- pichhla year/branch yaad rakhna ----------
const store = {
  get() {
    try {
      const d = JSON.parse(localStorage.getItem('rtuhub_selection'));
      if (d && +d.year === 1) return { year: 1, branch: 'COMMON' };
      if (d && YEARS[+d.year - 1] && branches.includes(d.branch)) return { year: +d.year, branch: d.branch };
    } catch (e) {}
    return null;
  },
  set(year, branch) {
    try {
      localStorage.setItem('rtuhub_selection', JSON.stringify({ year: String(year), branch }));
      localStorage.setItem('rtuhub_home', dashPath(year, branch));
    } catch (e) {}
  },
  clear() {
    try { localStorage.removeItem('rtuhub_selection'); localStorage.removeItem('rtuhub_home'); } catch (e) {}
  }
};

function setHead(route) {
  const s = seo(route);
  document.title = s.title;
  const set = (sel, attr, val) => { const el = document.head.querySelector(sel); if (el) el.setAttribute(attr, val); };
  set('meta[name="description"]', 'content', s.desc);
  set('meta[property="og:title"]', 'content', s.title);
  set('meta[property="og:description"]', 'content', s.desc);
  set('meta[property="og:url"]', 'content', SITE + route.path);
  set('link[rel="canonical"]', 'href', SITE + route.path);
}

// =====================================================================
//  APP
// =====================================================================
const INTRO_VERSION = '2';   // src/index.html ke upar wale script mein bhi yahi number hai
export function App({ initialPath }) {
  const [path, setPath] = useState(initialPath);
  const [saved, setSaved] = useState(null);
  const [introDone, setIntroDone] = useState(false);
  const afterIntro = useRef(null);
  const route = useMemo(() => resolveRoute(path), [path]);

  const nav = useCallback((to, replace) => {
    setIntroDone(true);
    if (to !== location.pathname) history[replace ? 'replaceState' : 'pushState'](null, '', to);
    setPath(to);
  }, []);

  // pehli baar khulne par: purana selection ho to seedha dashboard
  useIso(() => {
    const s = store.get();
    setSaved(s);
    const landed = resolveRoute(location.pathname);
    if (landed.college) landOnCollege(landed.college.slug);   // Google se "JECRC pyq" -> JECRC set
    const atHome = resolveRoute(location.pathname).kind === 'home';
    // naya intro har purane visitor ko EK baar dikhao (INTRO_VERSION badhao to sabko phir ek baar dikhega)
    let fresh = false;
    try {
      fresh = localStorage.getItem('rtuhub_seen') !== INTRO_VERSION;
      if (fresh && atHome) localStorage.setItem('rtuhub_seen', INTRO_VERSION);
    } catch (e) {}
    if (s && atHome) {
      if (fresh) afterIntro.current = dashPath(s.year, s.branch);   // intro ke baad apne dashboard par
      else nav(dashPath(s.year, s.branch), true);
    }
    const pop = () => { setIntroDone(true); setPath(location.pathname); };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);

  // galat / adhoora URL -> sahi URL
  useIso(() => {
    if (route.path !== path) {
      history.replaceState(null, '', route.path + location.search);
      setPath(route.path);
    }
  }, [route, path]);

  useEffect(() => {
    if (route.kind === 'dash') { store.set(route.year, route.branch); setSaved({ year: route.year, branch: route.branch }); }
  }, [route.kind, route.year, route.branch]);

  useEffect(() => { setHead(route); }, [route]);

  const sel = route.kind === 'dash' ? { year: route.year, branch: route.branch } : route.kind === 'tool' ? saved : null;
  const base = sel ? dashPath(sel.year, sel.branch) : '/';
  const reset = () => { store.clear(); setSaved(null); nav('/'); };
  const home = route.kind === 'home';
  const introEnd = () => { const to = afterIntro.current; afterIntro.current = null; if (to) nav(to, true); else setIntroDone(true); };
  const sheetOpen = route.kind === 'tool' || (route.kind === 'dash' && !!route.section);

  return (
    <Nav.Provider value={nav}>
      {home && <Intro hide={introDone} onDone={introEnd} />}

      {/* YEAR SELECT */}
      <div id="yearSelection" className={home && introDone ? 'show' : ''}>
        {home && (
          <div className="year-box">
            <h1 className="pick-title">RTU PYQ &amp; Notes: which year are you in?</h1>
            <p className="pick-sub">RTU B.Tech papers, notes and syllabus, sorted for your year. You can change this any time.</p>
            <YearGrid />
            <nav className="home-links" aria-label="Sections">
              {HOME_LINKS.map(([to, icon, name]) => <Link key={to} to={to}><Icon n={icon} /> {name}</Link>)}
            </nav>
            <SeoCopy />
          </div>
        )}
      </div>

      {/* BRANCH SELECT */}
      <div id="branchSelection" className={route.kind === 'branch' ? 'show' : ''}>
        {route.kind === 'branch' && (
          <div className="branch-box">
            <Link className="text-btn" to="/"><Icon n="arrow-left" /> Change year</Link>
            <h1 className="pick-title" style={{ marginTop: 14 }}>{YEARS[route.year - 1].nice}: pick your branch</h1>
            <div className="branch-grid" id="branchGrid">
              {branches.map(b => {
                const short = branchShort(b);
                return (
                  <Link key={b} to={dashPath(route.year, b)} className="branch-btn">
                    <span>{nice(b)}</span>{short.length <= 8 && <span className="tag">{short}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Dashboard show={route.kind === 'dash' || route.kind === 'tool'} sel={sel} base={base} reset={reset} covered={sheetOpen} />
      <Sheets route={route} base={base} sel={sel} />
    </Nav.Provider>
  );
}

function SeoCopy() {
  return (
    <section className="seo-copy" aria-label="About RTU PYQ, notes and syllabus">
      <h2>RTU PYQ, notes, syllabus and SGPA calculator in one place</h2>
      <p>rtuhub.in is built for Rajasthan Technical University (RTU) B.Tech students. Find previous year question papers (PYQ) of every branch and year, the latest syllabus, animated notes, lab work, books, the academic calendar and an SGPA calculator, all sorted by year, branch, semester and subject.</p>
      <h3>RTU colleges (same syllabus and papers)</h3>
      <ul className="seo-links">{COLLEGES.filter(c => c.short.length).slice(0, 18).map(c => <li key={c.slug}><Link to={'/colleges/' + c.slug}>{collegeLabel(c)} PYQ</Link></li>)}<li><Link to="/colleges">All RTU colleges</Link></li></ul>
      <h3>Popular searches</h3>
      <ul className="seo-links">{popularPyq().map(([to, t]) => <li key={to}><Link to={to}>{t}</Link></li>)}</ul>
      <h3>Frequently asked questions</h3>
      {FAQ.map(([q, ans]) => <details key={q}><summary>{q}</summary><p>{ans}</p></details>)}
    </section>
  );
}

function YearGrid() {
  return (
    <div className="year-grid">
      {YEARS.map(y => (
        <Link key={y.n} to={'/' + y.slug} className="year-btn">
          <b>{y.n}<sup>{y.nice.slice(1, 3)}</sup></b>
          <span>Year</span>
          <small>Semester {y.sems[0]} and {y.sems[1]}</small>
        </Link>
      ))}
    </div>
  );
}

// ---------- INTRO ----------
const FIELDS = [['laptop-code', 'Computer'], ['network-wired', 'IT'], ['hard-hat', 'Civil'], ['flask', 'Chemical'], ['cogs', 'Mechanical'], ['rocket', 'Aeronautical']];
const LINE1 = 'WELCOME TO', LINE2 = 'rtuhub.in';
const STEP = 0.06;   // har letter ke beech ka gap (second)

function Intro({ hide, onDone }) {
  const [active, setActive] = useState(-1);
  useEffect(() => {
    if (hide) return;
    const start = (LINE1.length + LINE2.length) * STEP * 1000 + 350;
    const timers = FIELDS.map((_, i) => setTimeout(() => setActive(i), start + i * 180));
    timers.push(setTimeout(onDone, start + FIELDS.length * 180 + 250));
    return () => timers.forEach(clearTimeout);
  }, []);
  const letters = (text, offset) => [...text].map((ch, i) =>
    <span key={i} className="welcome-letter" style={{ animationDelay: ((offset + i) * STEP).toFixed(2) + 's' }}>{ch === ' ' ? ' ' : ch}</span>);
  return (
    <div id="intro" className={hide ? 'hide' : ''}>
      <div>
        <div className="welcome-title" id="welcomeTitle">
          <div className="welcome-line" id="welcomeLine1">{letters(LINE1, 0)}</div>
          <div className="welcome-line" id="welcomeLine2">{letters(LINE2, LINE1.length)}</div>
        </div>
        <div className="fields-container" id="fieldsContainer">
          {FIELDS.map(([icon, name], i) =>
            <div key={name} className={'field-item' + (i <= active ? ' active' : '')}><Icon n={icon} /><span>{name}</span></div>)}
        </div>
        <div className="intro-bar"><i></i></div>
      </div>
      <button className="intro-skip" onClick={onDone}>Skip intro</button>
    </div>
  );
}

// =====================================================================
//  DASHBOARD
// =====================================================================
// [key, icon, label, line]
const CARDS = [
  ['pyq', 'history', 'PYQ papers', 'Previous year question papers'],
  ['ai', 'robot', 'AI Assistant', 'Ask anything: PYQ, syllabus, programs'],
  ['notes', 'book-open', 'Notes', 'Subject wise, on Drive'],
  ['lab', 'flask', 'Lab work', 'Manuals and viva'],
  ['syllabus', 'layer-group', 'Syllabus', 'Subject wise PDF'],
  ['books', 'book', 'Books', 'PDF and reference'],
  ['cram', 'rocket', '1-day cram', 'Night-before revision'],
  ['timetable', 'clock', 'Time table', 'Section A to J'],
  ['calendar', 'calendar-alt', 'Academic calendar', 'Dates and exams'],
  ['links', 'link', 'RTU links', 'Result, admit card'],
  ['animated', 'magic', 'Animated notes', 'Visual learning']
];
const TOOL_LINKS = [
  ['/scholarships', 'hand-holding-usd', 'Scholarships'], ['/sgpa-calculator', 'calculator', 'SGPA calculator'], ['/calculator', 'square-root-alt', 'Scientific calculator'],
  ['/news', 'newspaper', 'RTU news'], ['/upload', 'upload', 'Send us a PDF'], ['/query', 'question-circle', 'Ask a question']
];
const RESOURCES = [
  ['file-pdf', '1000+ study PDFs for various subjects'], ['film', '100+ animated notes for better understanding'],
  ['book', '50+ academic and reference books'], ['layer-group', 'Complete syllabus for all branches'],
  ['calendar-alt', 'Academic calendar with the latest schedule'], ['newspaper', 'Latest news and announcements'],
  ['calculator', 'SGPA and CGPA calculator'], ['map-marked-alt', 'RTU campus map'],
  ['question-circle', 'Query with seniors for guidance']
];

// card kahan le jaye — ya kyun band hai
function cardState(key, sel, base) {
  if (key === 'links') return { to: '/links' };
  if (key === 'ai') return { to: '/ai-assistant', line: 'Ask anything: PYQ, syllabus, programs, doubts' };
  if (key === 'animated') {
    if (sel.year !== 1) return { off: '1st year only' };
    if (!ANOTES.length) return { off: 'Soon' };
    const n = ANOTES.reduce((t, x) => t + x.units.length, 0);
    return { to: base + '/animated', line: `${n} units, ${ANOTES.length} subjects` };
  }
  if (key === 'calendar') return { to: base + '/calendar' };
  if (key === 'pyq') {
    const list = pyqSubjects(sel.year, sel.branch);
    if (!list.length) return { off: 'Not added yet' };
    const ys = list.flatMap(s => s.files.map(f => f.slice(0, 4))).sort();
    return { to: base + '/pyq', line: `${list.length} subjects, ${ys[0]} to ${ys[ys.length - 1]}` };
  }
  if (key === 'syllabus' && sel.year > 1) return { to: base + '/syllabus', line: 'Full, subject wise and labs' };
  return sel.year === 1 ? { to: `${base}/${key}` } : { off: '1st year only' };
}

// search: is year/branch ke saare subjects + sections + tools
function searchIndex(sel, base) {
  const out = [];
  if (sel) {
    for (const s of pyqSubjects(sel.year, sel.branch)) out.push([nice(s.name), 'PYQ, sem ' + parseInt(s.semester), `${base}/pyq/${s.slug}`]);
    if (sel.year === 1) for (const [k, d] of Object.entries(SECTIONS)) for (const it of d.items) out.push([itemName(it), d.word, `${base}/${k}/${it.slug}`]);
    if (sel.year === 1) for (const n of ANOTES) for (const u of n.units) out.push([`${n.name} Unit ${u.n}: ${u.title}`, 'Animated notes', `${base}/animated/${n.slug}/unit-${u.n}`]);
    if (sel.year > 1) out.push(['Syllabus', 'Full, subject wise and labs', base + '/syllabus']);
    out.push(['Academic calendar', 'Dates', base + '/calendar']);
  }
  for (const [to, , label] of TOOL_LINKS) out.push([label, 'Tool', to]);
  out.push(['RTU links', 'Result, admit card', '/links'], ['Campus map', 'Map', '/map']);
  return out;
}

// Search: khaali ho to placeholder apne aap type hota rehta hai
const HINTS = ['physics PYQ', 'SGPA calculator', 'mathematics notes', 'syllabus', 'time table', 'chemistry papers', 'RTU result link'];
function SearchBox({ sel, base }) {
  const nav = useContext(Nav);
  const [q, setQ] = useState('');
  const [hint, setHint] = useState('');
  useEffect(() => {
    let word = 0, len = 0, dir = 1, timer;
    const tick = () => {
      const text = HINTS[word];
      len += dir;
      setHint(text.slice(0, len));
      let wait = dir > 0 ? 42 : 16;                                  // tez type, aur tez mitana
      if (dir > 0 && len === text.length) { dir = -1; wait = 1100; }
      else if (dir < 0 && len === 0) { dir = 1; word = (word + 1) % HINTS.length; wait = 220; }
      timer = setTimeout(tick, wait);
    };
    timer = setTimeout(tick, 900);
    return () => clearTimeout(timer);
  }, []);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = useMemo(() => !words.length ? [] :
    searchIndex(sel, base).filter(([label, sub]) => words.every(w => (label + ' ' + sub).toLowerCase().includes(w))).slice(0, 8), [q, sel && sel.year, sel && sel.branch]);
  return (
    <div className="search-bar">
      <Icon n="search" />
      <input type="search" id="searchInput" aria-label="Search" autoComplete="off" value={q} placeholder={'Search ' + hint + '▌'}
        onChange={e => setQ(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && hits[0]) { setQ(''); nav(hits[0][2]); } if (e.key === 'Escape') setQ(''); }} />
      {words.length > 0 && (
        <div className="search-results" id="searchResults">
          {hits.length
            ? hits.map(([label, sub, to], i) => <Link key={to} to={to} className={i ? '' : 'first'} onClick={() => setQ('')}><span>{label}</span><small>{sub}</small></Link>)
            : <p>Nothing matches “{q.trim()}”. Try a subject name.</p>}
        </div>
      )}
    </div>
  );
}

function Dashboard({ show, sel, base, reset, covered }) {
  const [menu, setMenu] = useState(false);
  const [college] = useCollege();

  useEffect(() => {
    if (!menu) return;
    const close = e => { if (!e.target.closest('#menuToggle, #dropdownMenu')) setMenu(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menu]);

  const y = sel && YEARS[sel.year - 1];
  const H = covered || !show ? 'div' : 'h1';   // ek page par ek hi <h1> (Google ke liye)
  const menuItem = (id, icon, label, to) =>
    <Link className="dropdown-item" id={id} to={to} onClick={() => setMenu(false)}><Icon n={icon} /> {label}</Link>;

  return (
    <div id="main" className={show ? 'show' : ''}>
      <div className="header">
        <button className="icon-btn" id="menuToggle" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon n="bars" /></button>
        <Link className="brand" to={base}>
          <Logo />
          <span className="brand-name">rtuhub.in</span>
        </Link>
        {sel && <Link className="map-button" id="mapButton" to="/map"><Icon n="map-marked-alt" /><span>Campus map</span></Link>}

        <div className={'dropdown-menu' + (menu ? ' show' : '')} id="dropdownMenu">
          <button className="dropdown-item" id="resetYearBranch" onClick={() => { setMenu(false); reset(); }}><Icon n="sync-alt" /> Change year or branch</button>
          <div className="menu-divider"></div>
          {menuItem('collegeBtn', 'university', 'Change college (' + collegeLabel(college) + ')', '/colleges')}
          {menuItem('aiBtn', 'robot', 'AI Assistant', '/ai-assistant')}
          {menuItem('schBtn', 'hand-holding-usd', 'Scholarships', '/scholarships')}
          {menuItem('cgpaBtn', 'calculator', 'SGPA calculator', '/sgpa-calculator')}
          {menuItem('calcBtn', 'square-root-alt', 'Scientific calculator', '/calculator')}
          {sel && menuItem('calendarBtn', 'calendar-alt', 'Academic calendar', base + '/calendar')}
          {menuItem('newsBtn', 'newspaper', 'RTU news', '/news')}
          <div className="menu-divider"></div>
          {menuItem('uploadPdfBtn', 'upload', 'Send us a PDF', '/upload')}
          {menuItem('queryBtn', 'question-circle', 'Ask a question', '/query')}
        </div>
      </div>

      <div className="hero" id="selectedInfo">
        {sel ? (
          <>
            <H className="hero-year">{y.nice}</H>
            <div className="hero-branch">
              <span>{sel.year === 1 ? 'B.Tech, common to all branches' : 'B.Tech, ' + nice(sel.branch)}</span>
              <button className="text-btn" onClick={reset}>Change</button>
            </div>
            <div className="college-line" title="Change it from the menu">
              <Icon n="university" /><span>{college.name}{college.city && !college.name.includes(college.city) ? ', ' + college.city : ''}</span>
            </div>
          </>
        ) : (
          <>
            <H className="hero-year">RTU B.Tech</H>
            <div className="hero-branch"><span>Pick your year to see papers, notes and syllabus.</span></div>
          </>
        )}
        <SearchBox sel={sel} base={base} />
      </div>

      {sel ? (
        <div className="action-grid">
          {CARDS.map(([key, icon, label, line], i) => {
            const st = cardState(key, sel, base);
            if (st.off === '1st year only') return null;   // 2nd-4th year mein sirf jo chalta hai wahi dikhao
            const inner = (
              <>
                <Icon n={icon} />
                {st.off && <span className="tag">{st.off}</span>}
                <span><span className="action-label">{label}</span><span className="action-sub">{st.line || line}</span></span>
              </>
            );
            const cls = 'action-card' + (key === 'pyq' ? ' lead' : '') + (key === 'ai' ? ' ai-card' : '') + (st.off ? ' off' : '');
            // .neon = card ke peeche ka glow; --i se cards ek ke baad ek aate hain
            return (
              <div key={key} className={'neon' + (key === 'pyq' || key === 'ai' ? ' lead' : '') + (key === 'ai' ? ' ai' : '') + (st.off ? ' off' : '')} style={{ '--i': i }}>
                {st.to
                  ? <Link className={cls} id={'card-' + key} to={st.to}>{inner}</Link>
                  : <div className={cls} id={'card-' + key} aria-disabled="true">{inner}</div>}
              </div>
            );
          })}
        </div>
      ) : <YearGrid />}
      {sel && sel.year > 1 && <p className="only-first">Notes, lab work, books and time table are on rtuhub.in for 1st year only right now.</p>}

      <h2 className="block-title">Tools</h2>
      <div className="tool-row">
        {TOOL_LINKS.map(([to, icon, label]) => <Link key={to} className="tool-link" to={to}><Icon n={icon} /> {label}</Link>)}
      </div>

      <section className="about">
        <p>This platform is created to help students access important academic resources easily in one place. Here you will find a wide collection of useful study materials and tools designed to support your academic journey.</p>
        <div className="resources-grid">
          {RESOURCES.map(([icon, text]) => <div key={text} className="resource-item"><Icon n={icon} /> <span>{text}</span></div>)}
        </div>
      </section>

      <footer className="footer">
        <div>© 2026 <b>rtuhub.in</b>. All rights reserved. Designed and developed by <b>Coder X</b>.</div>
        <nav className="footer-links" aria-label="Site">
          <Link to="/pyq">RTU PYQ</Link>
          <Link to="/notes">RTU Notes</Link>
          <Link to="/syllabus">RTU Syllabus</Link>
          <Link to="/colleges">RTU Colleges</Link>
          <Link to="/scholarships">Scholarships</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </nav>
      </footer>
    </div>
  );
}

// =====================================================================
//  MAKER — sirf About page par, padhte hue beech mein ek hi jagah naam.
//  Screen par aate hi ek baar animation (sirf transform/opacity, halka).
// =====================================================================
const MAKER = 'MUKUL VERMA';
function Maker() {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setOn(true); return; }
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={ref} className={'maker' + (on ? ' in' : '')} aria-label="Who built rtuhub.in">
      <span className="maker-kicker">Built by a student, for students</span>
      <h2 className="maker-name" aria-label={MAKER}>
        {[...MAKER].map((ch, i) => <span key={i} aria-hidden="true" style={{ '--d': i * 55 + 'ms' }}>{ch === ' ' ? ' ' : ch}</span>)}
      </h2>
      <i className="maker-line" aria-hidden="true"></i>
      <p className="maker-role">Founder &amp; developer of rtuhub.in · B.Tech, Rajasthan Technical University</p>
      <p className="maker-quote">rtuhub.in started with one simple idea: everything an RTU student needs, from papers to syllabus to notes, in one fast and clean place.</p>
    </section>
  );
}

// ---------- ABOUT ----------
const ROADMAP = [
  ['1st Year', 'Foundations', 'seedling', [
    'Clear every subject on the first attempt. Backlogs cost you more time later than the subject costs now.',
    'Learn one programming language properly (C or Python) and write code every week.',
    'Build the habit: attend labs, keep your own notes, and solve previous year papers before every exam.',
    'Work on spoken and written English. It matters in every interview.'
  ]],
  ['2nd Year', 'Core skills', 'cubes', [
    'Data structures and algorithms, OOP, DBMS and operating system basics. For core branches: the main tools of your field (AutoCAD, MATLAB, SolidWorks, circuit simulators).',
    'Create a GitHub or portfolio and build two small projects that you can explain line by line.',
    'Join a club, a hackathon or a technical society. Learn to work in a team.',
    'Keep your SGPA steady. Many companies filter by CGPA first.'
  ]],
  ['3rd Year', 'Specialise', 'compass', [
    'Pick one direction: web, app, data / ML, cloud, embedded, design, or core engineering. Go deep instead of wide.',
    'Build one serious project that solves a real problem, and get your first internship.',
    'Practice problem solving regularly and contribute to open source or research if you can.',
    'Write a one page resume and keep updating it every semester.'
  ]],
  ['4th Year', 'Career', 'rocket', [
    'Prepare for placements: DSA, core subjects, aptitude and mock interviews.',
    'Turn your final year project into something you are proud to show.',
    'Convert internships into offers. Apply off campus too, not only through the college.',
    'If higher studies is your plan, prepare for GATE, GRE or CAT early in the year.'
  ]]
];
const OFFER = [
  ['history', 'Previous year papers', 'Thousands of RTU question papers, sorted by year and subject, with an AI helper inside the viewer.'],
  ['layer-group', 'Latest syllabus', 'Branch wise and semester wise, with every subject and lab on its own page.'],
  ['film', 'Animated notes', 'Unit wise notes with moving diagrams for 1st year subjects.'],
  ['calculator', 'SGPA calculator', 'Upload your RTU result PDF and see your SGPA instantly.'],
  ['calendar-alt', 'Academic calendar', 'Exam and semester dates for the current session.'],
  ['map-marked-alt', 'Campus map', 'A zoomable satellite map of the RTU Kota campus.']
];
function About({ back }) {
  return (
    <Sheet id="aboutOverlay" back={back} title="About rtuhub.in" sub="Why this website exists, what it offers, and how to make the most of your four years.">
      <div className="about-page">
        <section>
          <h2 className="ab-h">Why rtuhub.in exists</h2>
          <p>Every semester, RTU students lose hours looking for the right material. Papers are scattered across WhatsApp groups, old Drive links and websites full of ads. The syllabus changes and nobody knows which version is current. The night before an exam is not the time for that search.</p>
          <p>rtuhub.in puts everything in one place: previous year papers, the latest syllabus, notes, the academic calendar and simple tools. It is fast on a phone, free to use, and organised the way students actually look for things: by year, branch, semester and subject.</p>
        </section>

        <section>
          <h2 className="ab-h">What you get</h2>
          <div className="ab-offer">
            {OFFER.map(([icon, t, d]) => <div key={t} className="ab-card"><Icon n={icon} /><b>{t}</b><span>{d}</span></div>)}
          </div>
        </section>

        <Maker />

        <section>
          <h2 className="ab-h">Your B.Tech roadmap, year by year</h2>
          <p>Marks open the door. Skills decide how far you go after it. Use your four years on purpose.</p>
          <ol className="roadmap">
            {ROADMAP.map(([year, title, icon, points], i) => (
              <li key={year} style={{ '--i': i }}>
                <div className="rm-dot"><Icon n={icon} /></div>
                <div className="rm-body">
                  <span className="rm-year">{year}</span>
                  <h3>{title}</h3>
                  <ul>{points.map(p => <li key={p}>{p}</li>)}</ul>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="ab-h">Focus on skills, not only marks</h2>
          <ul className="ab-list">
            <li><b>Build things.</b> One project you made yourself teaches more than ten tutorials you watched.</li>
            <li><b>Be consistent.</b> One hour every day beats ten hours the week before exams.</li>
            <li><b>Learn in public.</b> Share your projects on GitHub and LinkedIn. Opportunities find people who are visible.</li>
            <li><b>Ask seniors.</b> Their mistakes and advice can save you a full year.</li>
            <li><b>Use papers smartly.</b> Solve previous year papers to understand the exam pattern, then spend the saved time on skills.</li>
          </ul>
        </section>

        <section className="ab-cta">
          <p>Found a missing paper, a mistake, or have an idea? We read every message.</p>
          <Link className="btn" to="/contact"><Icon n="envelope" /> Contact us</Link>
        </section>
      </div>
    </Sheet>
  );
}

// ---------- CONTACT ----------
function Contact({ back }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(MAIL); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (e) {}
  };
  return (
    <Sheet id="contactOverlay" back={back} title="Contact us" size="narrow" sub="We usually reply within 24 to 48 hours.">
      <div className="contact-card">
        <Icon n="envelope-open-text" />
        <span>Email</span>
        <a className="contact-mail" href={'mailto:' + MAIL}>{MAIL}</a>
        <div className="contact-btns">
          <a className="btn" href={'mailto:' + MAIL + '?subject=' + encodeURIComponent('rtuhub.in')}><Icon n="paper-plane" /> Send email</a>
          <button type="button" className="btn ghost" onClick={copy}><Icon n={copied ? 'check' : 'copy'} /> {copied ? 'Copied' : 'Copy email'}</button>
        </div>
      </div>
      <h2 className="ab-h small">Write to us for</h2>
      <ul className="ab-list">
        <li><b>Missing papers or syllabus</b> for your branch, semester or subject.</li>
        <li><b>Corrections</b> if a file is wrong, outdated or does not open.</li>
        <li><b>Suggestions</b> for new tools or features.</li>
        <li><b>Sharing material</b> such as notes or papers. You can also use <Link to="/upload">Send us a PDF</Link>.</li>
      </ul>
    </Sheet>
  );
}

// =====================================================================
//  AI ASSISTANT — poori screen ka chat. Year/branch chuna ho to uske saare PYQ + syllabus jaanta hai.
// =====================================================================
function AiAssistant({ back, sel }) {
  const nav = useContext(Nav);
  const [ready, setReady] = useState(false);   // chat sirf browser mein (build ke HTML mein khaali dhancha)
  useEffect(() => setReady(true), []);
  return (
    <div id="aiAssistantOverlay" className="ai-page">
      <h1 className="sr-only">RTU Hub AI Assistant</h1>
      {!sel && <p className="ai-page-note"><Icon n="info-circle" /> Apna year aur branch chuno, phir AI tumhare saare PYQ aur syllabus khol kar answer dega. <Link to="/">Choose year</Link></p>}
      {ready ? <Chat assistant={sel || null} close={() => nav(back)} /> : <Loader label="Opening AI Assistant" />}
    </div>
  );
}

// =====================================================================
//  SHEETS — URL ke hisaab se khulte hain. Back = ek step peeche.
// =====================================================================
function Sheet({ id, back, crumbs, title, sub, size, children }) {
  return (
    <div id={id} className="overlay show">
      <div className={'drawer' + (size ? ' ' + size : '')}>
        <header className="sheet-head">
          <Link className="icon-btn back-btn" to={back} aria-label="Back"><Icon n="arrow-left" /></Link>
          <div className="sheet-title">
            {crumbs && crumbs.length > 0 && <nav className="crumbs" aria-label="Breadcrumb">{crumbs.map(([name, to]) => <Link key={to} to={to}>{name}</Link>)}</nav>}
            <h1>{title}</h1>
            {sub && <p>{sub}</p>}
          </div>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

function Sheets({ route, base, sel }) {
  // PYQ search tab tak yaad rahe jab tak PYQ khula hai
  const [pyqFilter, setPyqFilter] = useState('');
  const inPyq = route.kind === 'dash' && route.section === 'pyq';
  useEffect(() => { if (!inPyq) setPyqFilter(''); }, [inPyq]);

  if (route.kind === 'tool') {
    const t = route.tool;
    if (t === 'pyq') return <PyqHub back={base} />;
    if (t === 'colleges') return route.college ? <CollegePage key={route.college.slug} c={route.college} back="/colleges" sel={sel} /> : <CollegeList back={base} />;
    if (t === 'scholarships') return <ScholarshipPage back={base} />;
    if (t === 'notes') return <NotesHub back={base} />;
    if (t === 'syllabus') return <SyllabusHub back={base} />;
    if (t === 'ai-assistant') return <AiAssistant back={base} sel={sel} />;
    if (t === 'sgpa-calculator') return (
      <Sheet id="sgpaOverlay" back={base} title="RTU SGPA calculator" sub="Upload your RTU result PDF and your SGPA appears on its own. Or fill the grades by hand below.">
        <Sgpa />
      </Sheet>
    );
    if (t === 'calculator') return <Sheet id="calculatorOverlay" back={base} title="Scientific calculator" size="slim"><Calculator /></Sheet>;
    if (t === 'map') return (
      <Sheet id="mapOverlay" back={base} title="RTU campus map" sub="Satellite view of the RTU Kota campus. Pinch or scroll to zoom, drag to move around.">
        <ZoomImage src="/assets/rtu-campus-map-v1.webp" w={3108} h={1720}
          alt="RTU Kota campus satellite map: central library, canteen, hostels, girls hostel, cricket and football ground, convocation park" />
        <div className="map-actions">
          <a className="btn" id="mapGoogle" href={GMAP} target="_blank" rel="noopener"><Icon n="map-marked-alt" /> Open in Google Maps</a>
          <a className="btn ghost" id="mapDirections" href={GMAP_DIR} target="_blank" rel="noopener"><Icon n="directions" /> Get directions</a>
        </div>
      </Sheet>
    );
    if (t === 'news') return (
      <Sheet id="newsOverlay" back={base} title="Latest RTU news">
        {news.map(n => (
          <article key={n.title} className="news-item">
            <div className="news-date">{n.date}</div>
            <div>
              <h2 className="news-title">{n.title} <span className="tag hot">{n.badge}</span></h2>
              <div className="news-desc" dangerouslySetInnerHTML={{ __html: n.desc }}></div>
            </div>
          </article>
        ))}
      </Sheet>
    );
    if (t === 'links') return (
      <Sheet id="linksOverlay" back={base} title="Important RTU links" size="narrow">
        <div className="links-grid">
          {rtuLinks.map(l => (
            <a key={l.id} className="link-btn" id={l.id} href={l.link} target="_blank" rel="noopener">
              <Icon n={l.icon.replace('fa-', '')} /><span>{nice(l.name)}</span><Icon n="external-link-alt" />
            </a>
          ))}
        </div>
      </Sheet>
    );
    if (t === 'query') return (
      <Sheet id="queryOverlay" back={base} title="Have a question?" size="narrow">
        <div className="query-content">
          <p>Send your questions, feedback or suggestions to our support email. We usually reply within 24 to 48 hours.</p>
          <a className="btn" href={'mailto:' + MAIL}><Icon n="envelope" /> {MAIL}</a>
        </div>
      </Sheet>
    );
    if (t === 'upload') return <Upload back={base} />;
    if (t === 'about') return <About back={base} />;
    if (t === 'contact') return <Contact back={base} />;
  }

  if (route.kind !== 'dash' || !route.section) return null;
  const sec = route.section, crumbs = seo(route).crumbs.slice(0, -1);

  if (sec === 'pyq') {
    const y = YEARS[route.year - 1], s = route.subject, list = `${base}/pyq`;
    const who = route.year === 1 ? y.nice : `${nice(route.branch)}, ${y.nice}`;
    if (route.paper) return <PdfViewer key={route.paper} subj={s} file={route.paper} back={`${list}/${s.slug}`} crumbs={crumbs} />;
    if (s) return (
      <Sheet id="pyqFilesOverlay" back={list} crumbs={crumbs} title={nice(s.name) + ' PYQ'} size="narrow"
        sub={`${who}, semester ${parseInt(s.semester)}. ${s.files.length} previous year ${s.files.length === 1 ? 'paper' : 'papers'}, newest first.`}>
        <PreloadViewer />
        <div className="subj-tabs" role="tablist">
          <span className="subj-tab on" role="tab" aria-selected="true"><Icon n="history" /> PYQ papers</span>
          <SyllabusTab route={route} base={base} name={s.name} />
        </div>
        <div id="pyqFilesList">
          {paperGroups(s).map(g => (
            <div key={g.year} className="year-row">
              <div className="year-num">{g.year}</div>
              <div className="paper-chips">
                {g.papers.map(p => (
                  <div key={p.slug} className="paper">
                    <Link to={`${list}/${s.slug}/${p.slug}`} title="View paper" onPointerDown={() => warmPdf(s, p.file)}><Icon n="file-pdf" /> {g.papers.length > 1 ? 'Paper ' + p.n : 'Paper'} <small>View</small></Link>
                    <DownloadButton subj={s} file={p.file} small />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Sheet>
    );
    return <PyqList route={route} base={base} crumbs={crumbs} filter={pyqFilter} setFilter={setPyqFilter}
      title={route.year === 1 ? '1st Year PYQ papers' : `${branchShort(route.branch)} ${y.nice} PYQ papers`} sub={`${who}. Pick a subject to see its papers.`} />;
  }

  if (sec === 'animated') {
    const list = `${base}/animated`, note = route.note;
    if (route.unit) return <NoteViewer key={route.path} note={note} unit={route.unit} back={`${list}/${note.slug}`} crumbs={crumbs} />;
    if (note) return (
      <Sheet id="anoteUnits" back={list} crumbs={crumbs} title={note.name + ' animated notes'} size="narrow"
        sub={`1st Year. ${note.units.length} ${note.units.length === 1 ? 'unit' : 'units'} with moving diagrams. They open right here on rtuhub.in.`}>
        <div className="anote-list">
          {note.units.map(u => (
            <Link key={u.n} className="anote-unit" to={`${list}/${note.slug}/unit-${u.n}`}>
              <b>Unit {u.n}</b>
              <span className="anote-t">{u.title}</span>
              {u.sub && <small>{u.sub}</small>}
              <ul>{u.heads.slice(0, 6).map(h => <li key={h}>{h.replace(/^\d+\.\s*/, '')}</li>)}</ul>
              <em><Icon n="play" /> Open notes</em>
            </Link>
          ))}
        </div>
      </Sheet>
    );
    return (
      <Sheet id="anoteOverlay" back={base} crumbs={crumbs} title="1st Year animated notes" sub="Unit wise notes with moving diagrams. Pick a subject. Everything opens right here on rtuhub.in.">
        <div className="subjects-grid">
          {ANOTES.map(n => (
            <Link key={n.slug} className="subject-card" to={`${list}/${n.slug}`}>
              <Icon n="film" />
              <span className="subject-name" style={{ flex: 1 }}>{n.name}</span>
              <span className="subject-credit">{n.units.length} {n.units.length === 1 ? 'unit' : 'units'}</span>
            </Link>
          ))}
        </div>
      </Sheet>
    );
  }

  if (sec === 'calendar') {
    const data = calendarData[route.sem];
    return (
      <Sheet id="calendarOverlay" back={base} crumbs={crumbs} title={'Academic calendar ' + data.session} sub={data.title + ', B.Tech, session ' + data.session}>
        <div className="semester-selector" id="semesterSelector">
          {YEARS[route.year - 1].sems.map(n =>
            <Link key={n} className={'sem-btn' + (n === route.sem ? ' active' : '')} to={`${base}/calendar/semester-${n}`}>Semester {n}</Link>)}
        </div>
        <table className="calendar-table" id="calendarTableContainer">
          <thead><tr><th>Event</th><th>Date</th></tr></thead>
          <tbody>{data.events.map(e => <tr key={e[0]}><td>{e[0]}</td><td>{e[1]}</td></tr>)}</tbody>
        </table>
        {data.note && <p className="form-note" id="calendarNote">{data.note}</p>}
        {data.prev && (
          <details className="cal-prev">
            <summary>Last session ({data.prev.session})</summary>
            <table className="calendar-table">
              <tbody>{data.prev.events.map(e => <tr key={e[0]}><td>{e[0]}</td><td>{e[1]}</td></tr>)}</tbody>
            </table>
          </details>
        )}
      </Sheet>
    );
  }

  if (sec === 'syllabus') return route.slug
    ? <SyllabusItem key={route.path} route={route} base={base} crumbs={crumbs} />
    : <SyllabusList route={route} base={base} crumbs={crumbs} />;

  return route.item
    ? <ItemPage sec={sec} item={route.item} base={base} crumbs={crumbs} />
    : <SectionList sec={sec} base={base} crumbs={crumbs} />;
}

// =====================================================================
//  HUB PAGES: /pyq, /notes, /syllabus — poori site ek page par, har year/branch ka link.
//  "rtu pyq", "rtu notes", "rtu syllabus" jaisi searches ka landing page yahi hai.
// =====================================================================
// =====================================================================
//  COLLEGES: RTU se jude B.Tech colleges. Sabka syllabus / exam / paper RTU ka, isliye site sabke liye.
// =====================================================================
const CITY_TABS = ['All', 'Government', 'Jaipur', 'Kota', 'Udaipur', 'Other cities'];
const seatsText = c => c.seats ? `${c.seats.toLocaleString('en-IN')}${c.seatsPartial ? '+' : ''} ${c.seatsKind === 'admitted' ? 'students' : 'seats'}` : '';
// college logo: pehle apna /logos/<slug>.webp; woh na ho to official website ka icon (Google favicon service).
// Kuch na mile ya icon chhota/blurry ho to initials badge.
const webHost = c => { try { return c.web ? new URL(c.web).hostname : ''; } catch { return ''; } };
const logoSrc = c => { if (c.logo) return c.logo; const h = webHost(c); return h ? `https://www.google.com/s2/favicons?domain=${h}&sz=128` : ''; };
// Logo tab tak nahi dikhta jab tak sach me load na ho jaye: tab tak initials badge rehta hai (khaali safed dabba kabhi nahi).
// LOGO_OK = jo logo is visit me ek baar load ho chuke; unhe dobara turant dikhate hain, initials ki jhalak ke bina.
const LOGO_OK = new Set();
function Mono({ c, big }) {
  const h = hueOf(c.slug), m = monogram(c), src = logoSrc(c);
  const [ok, setOk] = useState(() => !!src && LOGO_OK.has(src));
  const img = useRef(null);
  const check = el => { const good = !!el && el.naturalWidth >= 32; if (good) LOGO_OK.add(src); setOk(good); };
  // img SSR HTML se aati hai: hydrate se pehle load ho chuki ho to onLoad miss ho jata hai, isliye yahan bhi dekho
  useEffect(() => {
    const el = img.current;
    if (src && LOGO_OK.has(src)) setOk(true);
    else if (el && el.complete && el.naturalWidth) check(el);
    else setOk(false);
  }, [src]);
  return (
    <span className={'mono' + (big ? ' big' : '') + (m.length > 4 ? ' long' : '') + (ok ? ' has-logo' : '')} style={{ '--h': h }} aria-hidden="true">
      <span className="mono-txt">{m}</span>
      {src && <img ref={img} src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
        onLoad={e => check(e.currentTarget)} onError={() => setOk(false)} />}
    </span>
  );
}
// seats kahan se aaye: official approval letter (link ke saath) ya listing site
const seatSrc = c => {
  if (c.seatsKind === 'admitted') return <>students admitted in 2025 (RTU list)</>;
  if (c.dataUrl) return <>{c.dataSrc.startsWith('RTU') ? 'RTU approved intake' : 'AICTE approved intake'} {c.dataYear}, from the college's official website (<a href={c.dataUrl} target="_blank" rel="noopener nofollow">approval letter, PDF</a>)</>;
  if (!c.dataSrc) return null;
  return <>{c.dataSrc.startsWith('REAP') ? 'REAP 2024 seat matrix' : 'AICTE intake as listed on Careers360'} (not yet checked against the college's official approval letter)</>;
};
// branch chip: RTU branch ho to us branch ke PYQ par le jao
function BranchChips({ c, year }) {
  if (!c.branches.length) return <p className="old-note">Branch list not published for this college yet.</p>;
  const y = YEARS[(year || 2) - 1];
  return (
    <div className="br-chips">
      {c.branches.map(([label, n, code]) => {
        const inner = <><b>{label}</b>{n ? <small>{n} {c.seatsKind === 'admitted' ? 'students' : 'seats'}</small> : <small>seats n/a</small>}</>;
        return code
          ? <Link key={label} className="br-chip" to={`/${y.slug}/${code}/pyq`}>{inner}</Link>
          : <span key={label} className="br-chip plain">{inner}</span>;
      })}
    </div>
  );
}
function CollegeList({ back }) {
  const [q, setQ] = useState(''), [tab, setTab] = useState('All'), [open, setOpen] = useState('');
  const [mine, setMine] = useCollege();
  const f = q.trim().toLowerCase();
  const big = new Set(['Jaipur', 'Kota', 'Udaipur']);
  const list = COLLEGES.filter(c =>
    (tab === 'All' || (tab === 'Government' ? c.govt : tab === 'Other cities' ? !big.has(c.city) : c.city === tab)) &&
    (!f || [c.name, c.city, ...c.short, ...c.branches.map(b => b[0])].some(x => x.toLowerCase().includes(f))));
  const totalSeats = COLLEGES.reduce((t, c) => t + (c.seats || 0), 0);
  const allBranches = new Set(COLLEGES.flatMap(c => c.branches.map(b => b[0]))).size;
  return (
    <Sheet id="collegesOverlay" back={back} title="RTU colleges"
      sub="B.Tech colleges under Rajasthan Technical University. One syllabus, one exam paper for all of them.">
      <div className="college-stats">
        <div><b>{COLLEGES.length}</b><span>colleges</span></div>
        <div><b>{allBranches}</b><span>branches</span></div>
        <div><b>{Math.round(totalSeats / 1000)}K+</b><span>seats a year</span></div>
      </div>
      <div className="college-mine">
        <Mono c={mine} />
        <span><small>Your college</small><b>{mine.name}</b></span>
      </div>
      <input type="search" className="subjects-search" placeholder="Search college, city or branch (JECRC, Kota, AI...)" aria-label="Search college" value={q} onChange={e => setQ(e.target.value)} />
      <div className="sem-chips" role="tablist" aria-label="Filter colleges">
        {CITY_TABS.map(t => <button key={t} type="button" role="tab" aria-selected={tab === t} className={'sem-chip' + (tab === t ? ' on' : '')} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      <div className="college-list">
        {list.map((c, i) => {
          const isOpen = open === c.slug, isMine = mine.slug === c.slug;
          return (
            <div key={c.slug} className={'col-item' + (isOpen ? ' open' : '') + (isMine ? ' mine' : '')} style={{ '--i': Math.min(i, 14) }}>
              <button type="button" className="col-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? '' : c.slug)}>
                <Mono c={c} />
                <span className="col-txt">
                  <b>{c.name}</b>
                  <small>{[c.city, c.govt ? 'Government' : '', c.branches.length ? c.branches.length + ' branches' : '', seatsText(c)].filter(Boolean).join(' · ')}</small>
                </span>
                <Icon n="chevron-down" />
              </button>
              <div className="col-more"><div>
                <BranchChips c={c} />
                <div className="col-actions">
                  <button type="button" className={'btn' + (isMine ? ' ghost' : '')} onClick={() => setMine(c.slug, 'user')}><Icon n={isMine ? 'check' : 'university'} /> {isMine ? 'My college' : 'Set as my college'}</button>
                  <Link className="btn ghost" to={'/colleges/' + c.slug}>Open page <Icon n="arrow-right" /></Link>
                  {c.web && <a className="btn ghost" href={c.web} target="_blank" rel="noopener nofollow">Official website <Icon n="external-link-alt" /></a>}
                </div>
                {c.dataSrc && <p className="col-src">Seats: {seatSrc(c)}{c.seatsPartial ? '. Some branches do not publish seats.' : ''}</p>}
                {c.note && <p className="col-src">{c.note} (RTU list).</p>}
              </div></div>
            </div>
          );
        })}
        {!list.length && <p className="empty">No college matches “{q}”. If your college is under RTU and missing, <Link to="/query">tell us</Link>.</p>}
      </div>
      <details className="not-rtu">
        <summary><Icon n="info-circle" /> Not under RTU (own syllabus and exams)</summary>
        <p>These have similar names but are separate universities or institutes, so their papers are different from RTU papers.</p>
        <ul>{NOT_RTU.map(([n, why]) => <li key={n}><b>{n}</b><span>{why}</span></li>)}</ul>
      </details>
      <p className="form-note">College list: {COLLEGES_SOURCE}. Branches and seats: the AICTE approval letter (EOA) on the college's own website where we found it, otherwise Careers360 or the REAP seat matrix; RTU's 2025 admitted list for UCE Kota. Each college shows where its numbers come from. College logos belong to their colleges and are shown only to help students find their college; rtuhub.in is a student-made site, not run by or linked to any college. A newer college missing? <Link to="/query">Tell us</Link>.</p>
      <HubFaq list={HUB_FAQ.colleges} />
    </Sheet>
  );
}

function CollegePage({ c, back, sel }) {
  const [mine, setMine] = useCollege();
  const n = collegeLabel(c), isMine = mine.slug === c.slug;
  const yearLinks = YEARS.map(y => [y.n === 1 ? '/1styear/pyq' : '/' + y.slug, y.nice + ' PYQ', y.n === 1 ? 'Common to all branches' : 'Pick your branch']);
  const go = sel ? [dashPath(sel.year, sel.branch) + '/pyq', 'Open my PYQ', `${sel.year === 1 ? '1st Year' : branchShort(sel.branch) + ' ' + YEARS[sel.year - 1].nice}`] : null;
  return (
    <Sheet id="collegePage" back={back} crumbs={[['RTU Colleges', '/colleges']]} title={c.name}
      sub={[c.city, c.govt ? 'Government' : 'Private', 'Affiliated to RTU Kota'].filter(Boolean).join(' · ')}>
      <div className="col-hero">
        <Mono c={c} big />
        <div>
          <b>{c.short.length ? c.short.join(' · ') : n}</b>
          <span>{[c.branches.length ? c.branches.length + ' branches' : '', seatsText(c)].filter(Boolean).join(' · ') || 'B.Tech'}</span>
        </div>
      </div>
      <div className="same-banner">
        <Icon n="check-circle" />
        <p><b>{n} = RTU syllabus.</b> {n} is affiliated to Rajasthan Technical University, Kota. Its B.Tech syllabus, semester exams and question papers are RTU's, so everything on rtuhub.in is exactly for {n} students.</p>
      </div>
      <div className="college-actions">
        <button type="button" className={'btn' + (isMine ? ' ghost' : '')} onClick={() => setMine(c.slug, 'user')}>
          <Icon n={isMine ? 'check' : 'university'} /> {isMine ? 'This is my college' : 'Set as my college'}
        </button>
        {c.web && <a className="btn ghost" href={c.web} target="_blank" rel="noopener nofollow">Official website <Icon n="external-link-alt" /></a>}
      </div>
      {c.branches.length > 0 && <>
        <h2 className="sem-head">{n} branches <span className="sem-tag">{seatsText(c) || 'B.Tech'}</span></h2>
        <BranchChips c={c} year={sel && sel.year > 1 ? sel.year : 2} />
      </>}
      <h2 className="sem-head">{n} scholarships <span className="sem-tag">live</span></h2>
      <CollegeSchSection c={c} />
      <h2 className="sem-head">{n} PYQ <span className="sem-tag">RTU papers</span></h2>
      <div className="subjects-grid">
        {go && <Link className="subject-card special" to={go[0]}><Icon n="history" /><span className="subject-name" style={{ flex: 1 }}>{go[1]}</span><span className="subject-credit">{go[2]}</span></Link>}
        {yearLinks.map(([to, t, line]) => <Link key={to} className="subject-card" to={to}><span className="subject-name">{n} {t}</span><span className="subject-credit">{line}</span></Link>)}
      </div>
      <h2 className="sem-head">Syllabus, notes and tools</h2>
      <div className="subjects-grid">
        <Link className="subject-card" to="/syllabus"><Icon n="layer-group" /><span className="subject-name" style={{ flex: 1 }}>{n} syllabus (RTU)</span><Icon n="chevron-right" /></Link>
        <Link className="subject-card" to="/notes"><Icon n="book-open" /><span className="subject-name" style={{ flex: 1 }}>{n} notes</span><Icon n="chevron-right" /></Link>
        <Link className="subject-card" to="/ai-assistant"><Icon n="robot" /><span className="subject-name" style={{ flex: 1 }}>AI Assistant</span><Icon n="chevron-right" /></Link>
        <Link className="subject-card" to="/sgpa-calculator"><Icon n="calculator" /><span className="subject-name" style={{ flex: 1 }}>RTU SGPA calculator</span><Icon n="chevron-right" /></Link>
      </div>
      <dl className="college-info">
        <div><dt>Address</dt><dd>{c.address}</dd></div>
        <div><dt>Programmes</dt><dd>{c.programmes.join(', ')}</dd></div>
        <div><dt>University</dt><dd>Rajasthan Technical University, Kota</dd></div>
        {c.web && <div><dt>Official website</dt><dd><a href={c.web} target="_blank" rel="noopener nofollow">{webHost(c).replace(/^www\./, '')}</a></dd></div>}
        {c.note && <div><dt>Note</dt><dd>{c.note} (RTU list)</dd></div>}
      </dl>
      <HubFaq list={collegeFaq(c)} />
      <p className="form-note">Source: {COLLEGES_SOURCE}{c.dataSrc ? <>; seats: {seatSrc(c)}</> : ''}. {c.logoNote ? c.logoNote + ' ' : c.logo || c.web ? `The ${n} logo belongs to the college. ` : ''}rtuhub.in is a student-made site and is not run by {n} or RTU.</p>
    </Sheet>
  );
}

// =====================================================================
//  SCHOLARSHIPS — schemes (src/scholarships.js) + live notices
//  Live data: GitHub Action har ghante official portals aur college sites padhta hai -> LIVE_URL
// =====================================================================
let liveCache = null, livePromise = null;
function loadLive(force) {
  if (!isBrowser) return Promise.resolve(null);
  if (livePromise && !force) return livePromise;
  livePromise = fetch(LIVE_URL + '?t=' + Math.floor(Date.now() / 60000), { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then(d => (liveCache = d && d.checkedAt ? d : liveCache))
    .catch(() => liveCache);
  return livePromise;
}
// { d: data | null, st: 'loading' | 'ok' | 'fail' } — har 30 s "x min ago" taaza, har 5 min naya data
function useLive() {
  const [d, setD] = useState(liveCache);
  const [st, setSt] = useState(liveCache ? 'ok' : 'loading');
  const [, tick] = useState(0);
  useEffect(() => {
    let on = true;
    const got = x => { if (!on) return; setD(x || null); setSt(x ? 'ok' : 'fail'); };
    loadLive().then(got);
    const t1 = setInterval(() => tick(n => n + 1), 30000);
    const t2 = setInterval(() => loadLive(true).then(x => x && got(x)), 300000);
    return () => { on = false; clearInterval(t1); clearInterval(t2); };
  }, []);
  return { d, st };
}
// server par "aaj" alag hota hai, isliye countdown sirf browser me (hydration ke baad)
function useNow() {
  const [now, setNow] = useState(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);
  return now;
}
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = ymd => { const [y, m, d] = ymd.split('-').map(Number); return `${d} ${MON[m - 1]} ${y}`; };
const daysLeft = (ymd, now) => { const end = new Date(ymd + 'T23:59:59+05:30').getTime(); return end < now ? -1 : Math.floor((end - now) / 86400000); };
const ago = iso => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  const d = Math.round(h / 24); return d + (d === 1 ? ' day ago' : ' days ago');
};
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const SRC_SHORT = { nsp: 'NSP', sje: 'SJE Rajasthan', sjms: 'SJMS', hte: 'HTE Rajasthan', minority: 'Minority Dept', aicte: 'AICTE', ksb: 'KSB', lic: 'LIC', ongc: 'ONGC', 'b4s-rj': 'Buddy4Study', 'b4s-sje': 'Buddy4Study SJE', 'c360-rj': 'Careers360' };

function LiveBar({ d, st }) {
  if (st === 'loading') return <div className="live-bar"><span className="live-dot wait" /><span>Checking official portals…</span></div>;
  if (!d) return <div className="live-bar off"><span className="live-dot off" /><span>Live check is not available right now. The details below were checked on {fmtDay(SCH_CHECKED)}.</span></div>;
  return (
    <div className="live-bar">
      <span className="live-dot" /><b>Live</b><span>Official portals checked <b>{ago(d.checkedAt)}</b> · checked again every hour</span>
      <span className="live-src">{d.sources.map(s => (
        <span key={s.id} className={s.ok ? 'ok' : 'bad'} title={s.ok ? 'Reached in the last check' : 'Could not reach in the last check (' + s.error + ')'}>
          <Icon n={s.ok ? 'check' : 'times'} /> {SRC_SHORT[s.id] || s.id}
        </span>))}
      </span>
    </div>
  );
}

const leftOf = (s, now) => {
  const dl = s.last && now != null ? daysLeft(s.last, now) : null;
  const state = !s.last ? 'info' : dl == null ? '' : dl < 0 ? 'closed' : dl <= 7 ? 'hot' : dl <= 15 ? 'soon' : 'open';
  const text = !s.last ? 'Not announced yet' : dl == null ? '' : dl < 0 ? 'Closed' : dl === 0 ? 'Closes today' : dl + (dl === 1 ? ' day left' : ' days left');
  return { dl, state, text };
};
function SchList({ title, items, cls, icon }) {
  if (!items || !items.length) return null;
  return <div className={'sch-sec ' + (cls || '')}><h4>{title}</h4><ul>{items.map(x => <li key={x}><Icon n={icon} /> {x}</li>)}</ul></div>;
}
function KindBadge({ s }) {
  const [a, b] = SCH_KINDS[s.kind] || ['', ''];
  return <span className={'sch-kind k-' + s.kind}><Icon n={a === 'Official' ? 'landmark' : 'shield-alt'} /> {a} · {b}</span>;
}
function SchDate({ s, now }) {
  const { state, text } = leftOf(s, now);
  if (s.last) return (
    <div className={'sch-date ' + state}>
      <small>{state === 'closed' ? 'Closed on' : 'Last date'}</small>
      <b>{fmtDay(s.last)}</b>
      {text && <span className={'sch-left ' + state}>{text}</span>}
    </div>
  );
  return (
    <div className="sch-date info">
      <small>Last date</small>
      <b>{s.expect || 'Not announced yet'}</b>
      {s.prev && <em>{s.prev}</em>}
    </div>
  );
}
function SchCard({ s, now }) {
  const { state } = leftOf(s, now);
  return (
    <article className={'sch-card ' + state + ' g-' + s.group} id={'sch-' + s.id}>
      <div className="sch-top">
        <KindBadge s={s} />
        {s.open && <span className="sch-by any">Any category</span>}
      </div>
      <h3>{s.name}</h3>
      <p className="sch-org">{s.by}</p>
      <div className="sch-money"><small>You get</small><b>{s.amount}</b></div>
      <SchDate s={s} now={now} />
      <div className="sch-key two">
        <div><small>For</small><b>{s.forShort}</b></div>
        <div><small>Income limit</small><b>{s.incomeShort}</b></div>
      </div>
      <p className="sch-who">{s.who}</p>
      <div className="sch-actions">
        {s.apply && <a className={'btn sch-apply' + (state === 'closed' ? ' ghost' : '')} href={s.apply} target="_blank" rel="noopener">{state === 'closed' ? 'Official page' : 'Apply here'} <Icon n="external-link-alt" /></a>}
        {s.info && s.info !== s.apply && <a className="btn ghost" href={s.info} target="_blank" rel="noopener">Official details <Icon n="external-link-alt" /></a>}
      </div>
      {s.applyNote && <p className="sch-how"><Icon n="mouse-pointer" /> {s.applyNote}{s.apply ? <> · <span className="sch-host">{hostOf(s.apply)}</span></> : null}</p>}
      <details className="sch-more">
        <summary>Eligibility, amount &amp; full details</summary>
        <SchList title="Who can apply (eligibility)" items={s.elig} cls="ok" icon="check" />
        <SchList title="Who can't apply" items={s.notElig} cls="no" icon="times" />
        <SchList title="How much you get" items={s.benefits} icon="rupee-sign" />
        {s.select && <div className="sch-sec"><h4>How students are selected</h4><p>{s.select}</p></div>}
        <SchList title="Renewal (2nd year onwards)" items={s.renew} icon="redo" />
        <SchList title="Documents for this scheme" items={s.docs} icon="file-alt" />
        <div className="sch-sec"><h4>About the date</h4><p>{s.dateNote || [s.expect, s.prev].filter(Boolean).join('. ')}</p></div>
        <p className="sch-src">Checked {fmtDay(SCH_CHECKED)} · Source: {s.src.map(([l, u], i) => <span key={u}>{i ? ', ' : ''}<a href={u} target="_blank" rel="noopener nofollow">{l}</a></span>)}</p>
      </details>
    </article>
  );
}

function SchTable({ list, now }) {
  return (
    <div className="sch-table-wrap">
      <table className="sch-table">
        <thead><tr><th>Scholarship</th><th>You get</th><th>For</th><th>Income</th><th>Last date</th></tr></thead>
        <tbody>
          {list.map(s => { const { state, text } = leftOf(s, now); return (
            <tr key={s.id} className={state}>
              <td><span className={'dot-k k-' + s.kind} title={(SCH_KINDS[s.kind] || []).join(' · ')} /><a href={'#sch-' + s.id} onClick={e => { e.preventDefault(); const el = document.getElementById('sch-' + s.id); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200); } }}>{s.name}</a></td>
              <td className="amt">{s.amount}</td>
              <td>{s.forShort}</td>
              <td>{s.incomeShort}</td>
              <td>{s.last ? <><b>{fmtDay(s.last)}</b>{text && <span className={'sch-left mini ' + state}>{text}</span>}</> : <span className="tbd">{s.expect || 'Not announced yet'}</span>}</td>
            </tr>); })}
        </tbody>
      </table>
    </div>
  );
}

function LiveNotices({ d, st }) {
  if (st === 'loading') return <p className="old-note">Loading live notices…</p>;
  if (!d) return <p className="old-note">Live notices could not be loaded right now. Open the official portals from the cards above.</p>;
  const groups = d.sources.filter(s => s.notices && s.notices.length).sort((a, b) => (a.type === 'trusted') - (b.type === 'trusted'));
  if (!groups.length) return <p className="old-note">No scholarship notice could be read from the portals in the last check.</p>;
  return (
    <div className="sch-live">
      <p className="sch-count"><span className="src official">Official</span> = government or the scholarship provider's own website. <span className="src trusted">Trusted</span> = well-known scholarship guide websites (unofficial): useful for news, but confirm on the official site.</p>
      {groups.map(s => {
        const site = s.site || hostOf(s.url), kind = s.type === 'trusted' ? 'trusted' : 'official';
        return (
          <div key={s.id} className={'sch-live-src ' + kind}>
            <div className="sch-live-head">
              <a href={s.url} target="_blank" rel="noopener"><b>{s.name}</b> <Icon n="external-link-alt" /></a>
              <span className={'src-kind ' + kind}>{kind === 'official' ? 'Official' : 'Trusted'}</span>
              <small>{site} · {s.stale ? `site did not open in the last check; showing notices from ${ago(s.lastOk)}` : `checked ${ago(d.checkedAt)}`}{s.changedAt ? ` · last change seen ${ago(s.changedAt)}` : ''}</small>
            </div>
            <ul className="sch-notices">
              {s.notices.slice(0, 6).map((n, i) => <li key={i}>{n.u ? <a href={n.u} target="_blank" rel="noopener nofollow">{n.t}</a> : <span>{n.t}</span>}<span className="from">from {n.u ? hostOf(n.u) : site}</span></li>)}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function CollegeSch({ c, d, st, onPage }) {
  const x = d && d.colleges ? d.colleges[c.slug] : null;
  const name = collegeLabel(c), host = c.web ? hostOf(c.web) : '';
  let body;
  if (!c.web) body = <p className="old-note">We don't have {name}'s official website yet, so its own scholarship notices can't be checked.</p>;
  else if (st === 'loading') body = <p className="old-note">Checking {host}…</p>;
  else if (!x) body = <p className="old-note">Live check of {host} is not available right now.</p>;
  else if (x.links && x.links.length) body = (
    <>
      <p className="live-line"><span className={'live-dot' + (x.stale ? ' off' : '')} /> From {host}{x.page ? ' (scholarship page)' : ''}, {x.stale ? `site did not open in the last check; showing ${ago(x.lastOk)} result` : `checked ${ago(d.checkedAt)}`}</p>
      <ul className="sch-notices">
        {x.links.slice(0, 6).map((l, i) => <li key={i}>{l.u ? <a href={l.u} target="_blank" rel="noopener nofollow">{l.t}</a> : <span>{l.t}</span>}<span className="from">from {l.u ? hostOf(l.u) : host} <span className="src official">College website</span></span></li>)}
      </ul>
      <a className="text-btn" href={x.page || c.web} target="_blank" rel="noopener nofollow">Open on {host} <Icon n="external-link-alt" /></a>
    </>
  );
  else if (x.ok) body = <p className="old-note">No scholarship notice found on {host} right now (checked {ago(d.checkedAt)}).</p>;
  else body = <p className="old-note">{host} did not open in the last check, so its notices can't be shown right now.</p>;
  return (
    <div className="col-sch">
      <p className="col-sch-note"><Icon n="check-circle" /> All the government scholarships {onPage ? 'on this page' : 'on the Scholarships page'} are open to {name} students too, if you meet the category, income and marks conditions. Rules don't depend on which RTU college you are in.</p>
      {body}
    </div>
  );
}

function CollegeSchSection({ c }) {
  const { d, st } = useLive();
  return (
    <>
      <CollegeSch c={c} d={d} st={st} />
      <Link className="subject-card special" to="/scholarships"><Icon n="hand-holding-usd" /><span className="subject-name" style={{ flex: 1 }}>All scholarships with last dates and form links</span><span className="subject-credit">SC, ST, OBC, girls…</span></Link>
    </>
  );
}

function ScholarshipPage({ back }) {
  const { d, st } = useLive();
  const now = useNow();
  const [cat, setCat] = useState('all');
  const [mine] = useCollege();
  const [pick, setPick] = useState('');
  const [pdf, setPdf] = useState('');
  const col = COLLEGES.find(c => c.slug === (pick || mine.slug)) || mine;
  const rank = s => (!s.last ? 1e9 : now == null ? 0 : daysLeft(s.last, now) < 0 ? 2e9 : daysLeft(s.last, now));
  const [run, setRun] = useState('all');
  const list = SCHOLARSHIPS.filter(s => (cat === 'all' || s.cats.includes(cat) || s.open) && (run === 'all' || s.group === run)).slice().sort((a, b) => rank(a) - rank(b));
  const openNow = now == null ? 0 : SCHOLARSHIPS.filter(s => s.last && daysLeft(s.last, now) >= 0).length;
  const soon = now == null ? 0 : SCHOLARSHIPS.filter(s => s.last && daysLeft(s.last, now) >= 0 && daysLeft(s.last, now) <= 15).length;
  const byName = useMemo(() => COLLEGES.slice().sort((a, b) => a.name.localeCompare(b.name)), []);
  const catLabel = SCH_CATS.find(x => x[0] === cat)[1];
  const jump = id => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  async function download() {
    if (pdf === 'busy') return;
    setPdf('busy');
    try {
      const { buildScholarshipPdf } = await import('./schpdf.js');
      const x = d && d.colleges ? d.colleges[col.slug] : null;
      const { blob, name } = await buildScholarshipPdf({ list, catLabel: run === 'all' ? catLabel : (cat === 'all' ? '' : catLabel + ' · ') + { rj: 'Rajasthan Govt', in: 'Govt of India', pvt: 'Private & CSR' }[run], liveAt: d && d.checkedAt, college: { label: collegeLabel(col), host: col.web ? hostOf(col.web) : '' }, collegeLinks: x && x.links, now: Date.now() });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setPdf('done'); setTimeout(() => setPdf(''), 4000);
    } catch (e) { setPdf('fail'); }
  }
  async function share() {
    const data = { title: 'Scholarships for RTU students', text: 'SC, ST, OBC, girls, minority scholarships with last dates and official links', url: SITE + '/scholarships' };
    try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(data.url); setPdf('copied'); setTimeout(() => setPdf(''), 2500); } } catch (e) {}
  }
  return (
    <Sheet id="scholarshipsOverlay" back={back} title="Scholarships for RTU students"
      sub="SC, ST, OBC, MBC, EWS, girls, minority, divyang and defence families: who can apply, last dates and the official form links. Session 2026-27.">
      <LiveBar d={d} st={st} />
      <div className="sch-tools">
        <button type="button" className="btn" onClick={download} disabled={pdf === 'busy'}><Icon n={pdf === 'busy' ? 'spinner fa-spin' : 'file-pdf'} /> {pdf === 'busy' ? 'Making PDF…' : pdf === 'done' ? 'PDF downloaded' : 'Download PDF'}</button>
        <button type="button" className="btn ghost" onClick={share}><Icon n="share-alt" /> {pdf === 'copied' ? 'Link copied' : 'Share'}</button>
        {pdf === 'fail' && <span className="sch-err">PDF could not be made on this browser. Try again or use Chrome.</span>}
      </div>
      {soon > 0 && <div className="sch-alert"><Icon n="hourglass-half" /><p><b>{soon} scholarships close within 15 days.</b> Fill the form early, then get it verified by your college. Portals slow down near the last date.</p></div>}
      <div className="sch-stats">
        <div><b>{SCHOLARSHIPS.length}</b><span>scholarships</span></div>
        <div><b>{now == null ? '–' : openNow}</b><span>open now</span></div>
        <div><b>{now == null ? '–' : soon}</b><span>close in 15 days</span></div>
        <div><b>₹1.5 L</b><span>max a year</span></div>
      </div>
      <nav className="sch-nav" aria-label="On this page">
        {[['sch-glance', 'At a glance'], ['sch-schemes', 'All schemes'], ['sch-livebox', 'Live notices'], ['sch-college', 'Your college'], ['sch-apply', 'How to apply'], ['sch-docs', 'Documents']].map(([id, t]) =>
          <button key={id} type="button" onClick={() => jump(id)}>{t}</button>)}
      </nav>

      <h2 className="sem-head" id="sch-glance">Find your scholarship</h2>
      <div className="sch-run" role="tablist" aria-label="Who runs the scholarship">
        {[['all', 'All'], ['rj', 'Rajasthan Govt'], ['in', 'Govt of India'], ['pvt', 'Private & CSR']].map(([id, t]) =>
          <button key={id} type="button" role="tab" aria-selected={run === id} className={(run === id ? 'on ' : '') + 'r-' + id} onClick={() => setRun(id)}>{t}</button>)}
      </div>
      <div className="sem-chips" role="tablist" aria-label="Filter scholarships">
        {SCH_CATS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={cat === id} className={'sem-chip' + (cat === id ? ' on' : '')} onClick={() => setCat(id)}>{label}</button>)}
      </div>
      <p className="sch-count">{list.length} scholarships{cat === 'all' ? '' : ' for ' + catLabel + ' (including ones open to every category)'}, nearest last date first. <span className="dot-k k-rj" /> Rajasthan <span className="dot-k k-in" /> India <span className="dot-k k-pvt" /> Private. Tap a name for details. The PDF follows these filters.</p>
      <SchTable list={list} now={now} />

      <div id="sch-schemes">
        {SCH_GROUPS.map(([gid, gname, gsub]) => {
          const items = list.filter(s => s.group === gid);
          if (!items.length) return null;
          return (
            <section key={gid} className={'sch-group g-' + gid}>
              <header className={'sch-ghead g-' + gid}>
                <span className="sch-gtag">{gid === 'rj' ? 'राजस्थान सरकार · Rajasthan' : gid === 'in' ? 'भारत सरकार · India' : 'Private · CSR · PSU'}</span>
                <h2>{gname} <em>{items.length}</em></h2>
                <p>{gsub}</p>
              </header>
              <div className="sch-list">{items.map(s => <SchCard key={s.id} s={s} now={now} />)}</div>
            </section>
          );
        })}
      </div>

      <h2 className="sem-head" id="sch-livebox">Latest from official portals <span className="sem-tag">live</span></h2>
      <LiveNotices d={d} st={st} />

      <h2 className="sem-head" id="sch-college">Scholarships at your college <span className="sem-tag">live</span></h2>
      <select className="field sch-pick" aria-label="Pick your college" value={col.slug} onChange={e => setPick(e.target.value)}>
        {byName.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
      </select>
      <CollegeSch c={col} d={d} st={st} onPage />

      <h2 className="sem-head" id="sch-apply">How to apply</h2>
      <ol className="sch-steps">{SCH_STEPS.map(([h, t]) => <li key={h}><b>{h}</b><span>{t}</span></li>)}</ol>

      <h2 className="sem-head" id="sch-docs">Documents to keep ready</h2>
      <ul className="sch-docs">{SCH_DOCS.map(x => <li key={x}><Icon n="check" /> {x}</li>)}</ul>

      <HubFaq list={HUB_FAQ.scholarships} />
      <p className="form-note">Scheme details were checked on {fmtDay(SCH_CHECKED)} from the official portals and scholarship guides linked on each card. Notices from official portals and college websites are read again every hour. Rules, amounts and dates can change, so always confirm on the official portal before applying. rtuhub.in is a student-made site, not a government website.</p>
    </Sheet>
  );
}

function HubFaq({ list }) {
  return (
    <section className="seo-copy hub-faq">
      <h2>Frequently asked questions</h2>
      {list.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
    </section>
  );
}

function PyqHub({ back }) {
  const ix = pyqIndex();
  const first = ix.rows.find(r => r.year === 1);
  return (
    <Sheet id="pyqHub" back={back} title="RTU PYQ: previous year question papers"
      sub={`${ix.papers} RTU B.Tech papers from ${ix.from} to ${ix.till}, 1st to 4th year, all branches. Newest first, free to view and download.`}>
      <p className="hub-intro">Pick your year and branch to open the subject wise RTU previous year question papers (PYQ). Every paper opens online with a Download PDF button, and the AI Assistant can explain any question from it.</p>
      <h2 className="sem-head">1st Year PYQ <span className="sem-tag">Common to all branches</span></h2>
      <div className="subjects-grid">
        <Link className="subject-card special" to={first.to}><Icon n="history" /><span className="subject-name" style={{ flex: 1 }}>All 1st Year PYQ</span><span className="subject-credit">{first.subjects} subjects · {first.papers} papers</span></Link>
        {splitCurrent(pyqSubjects(1), 1).now.map(s => (
          <Link key={s.slug} className="subject-card" to={`/1styear/pyq/${s.slug}`}>
            <span className="subject-name">RTU {nice(s.name)} PYQ</span><span className="subject-credit">{s.files.length} papers</span>
          </Link>
        ))}
      </div>
      {YEARS.slice(1).map(y => (
        <section key={y.n}>
          <h2 className="sem-head">{y.nice} PYQ <span className="sem-tag">Semester {y.sems.join(' & ')}</span></h2>
          <div className="subjects-grid">
            {ix.rows.filter(r => r.year === y.n).map(r => (
              <Link key={r.to} className="subject-card" to={r.to}>
                <span className="subject-name">RTU {branchShort(r.branch)} {y.nice} PYQ</span>
                <span className="subject-credit">{r.subjects} subjects · {r.papers} papers</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      <HubFaq list={HUB_FAQ.pyq} />
    </Sheet>
  );
}

function NotesHub({ back }) {
  const units = ANOTES.reduce((t, n) => t + n.units.length, 0);
  const more = [['/1styear/cram', 'rocket', '1-day cram notes', 'Night-before revision'], ['/1styear/books', 'book', 'Books PDF', 'Text and reference books'],
    ['/1styear/lab', 'flask', 'Lab work', 'Manuals, files and viva'], ['/1styear/timetable', 'clock', 'Time table', 'Section A to J']];
  return (
    <Sheet id="notesHub" back={back} title="RTU Notes: B.Tech notes and animated notes"
      sub="Subject wise notes, animated unit wise notes with diagrams, cram notes, books and lab work for RTU B.Tech.">
      <p className="hub-intro">All RTU B.Tech notes on rtuhub.in in one place. Notes are for 1st year (common to all branches) right now. For 2nd to 4th year, the PYQ papers, the syllabus and the AI Assistant cover every subject.</p>
      {ANOTES.length > 0 && (
        <section>
          <h2 className="sem-head">Animated notes <span className="sem-tag">{units} units</span></h2>
          <div className="subjects-grid">
            {ANOTES.map(n => (
              <Link key={n.slug} className="subject-card" to={`/1styear/animated/${n.slug}`}>
                <Icon n="film" /><span className="subject-name" style={{ flex: 1 }}>RTU {n.name} Animated Notes</span><span className="subject-credit">{n.units.length} {n.units.length === 1 ? 'unit' : 'units'}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <h2 className="sem-head">1st Year notes <span className="sem-tag">Subject wise</span></h2>
      <div className="subjects-grid">
        {notesItems.map(it => (
          <Link key={it.slug} className="subject-card" to={`/1styear/notes/${it.slug}`}>
            <Icon n="book-open" /><span className="subject-name" style={{ flex: 1 }}>RTU {itemName(it)} Notes</span><Icon n="chevron-right" />
          </Link>
        ))}
      </div>
      <h2 className="sem-head">Revision, books and lab</h2>
      <div className="subjects-grid">
        {more.map(([to, icon, name, line]) => (
          <Link key={to} className="subject-card" to={to}><Icon n={icon} /><span className="subject-name" style={{ flex: 1 }}>{name}</span><span className="subject-credit">{line}</span></Link>
        ))}
      </div>
      <h2 className="sem-head">2nd, 3rd and 4th year</h2>
      <div className="subjects-grid">
        <Link className="subject-card" to="/pyq"><Icon n="history" /><span className="subject-name" style={{ flex: 1 }}>RTU PYQ, all branches</span><Icon n="chevron-right" /></Link>
        <Link className="subject-card" to="/syllabus"><Icon n="layer-group" /><span className="subject-name" style={{ flex: 1 }}>RTU syllabus, all branches</span><Icon n="chevron-right" /></Link>
        <Link className="subject-card" to="/ai-assistant"><Icon n="robot" /><span className="subject-name" style={{ flex: 1 }}>AI Assistant: explain any topic</span><Icon n="chevron-right" /></Link>
      </div>
      <HubFaq list={HUB_FAQ.notes} />
    </Sheet>
  );
}

function SyllabusHub({ back }) {
  return (
    <Sheet id="syllabusHub" back={back} title="RTU Syllabus: B.Tech syllabus PDF"
      sub="Latest RTU B.Tech syllabus for every branch and year: full PDF plus subject wise and lab wise syllabus.">
      <p className="hub-intro">Pick your year and branch to open the latest Rajasthan Technical University syllabus. Each subject has its own page, so you can open only the subject you need.</p>
      <h2 className="sem-head">1st Year syllabus <span className="sem-tag">Common to all branches</span></h2>
      <div className="subjects-grid">
        <Link className="subject-card special" to="/1styear/syllabus"><Icon n="layer-group" /><span className="subject-name" style={{ flex: 1 }}>RTU 1st Year Syllabus</span><Icon n="chevron-right" /></Link>
      </div>
      {YEARS.slice(1).map(y => (
        <section key={y.n}>
          <h2 className="sem-head">{y.nice} syllabus <span className="sem-tag">Semester {y.sems.join(' & ')}</span></h2>
          <div className="subjects-grid">
            {branches.map(b => (
              <Link key={b} className="subject-card" to={dashPath(y.n, b) + '/syllabus'}>
                <span className="subject-name">RTU {branchShort(b)} {y.nice} Syllabus</span><Icon n="chevron-right" />
              </Link>
            ))}
          </div>
        </section>
      ))}
      <HubFaq list={HUB_FAQ.syllabus} />
    </Sheet>
  );
}

// ---------- subject ka apna rang + chhota badge (naam se, har baar same) ----------
function Badge({ name }) {
  const words = name.replace(/\(.*?\)/g, ' ').split(/[\s&,:-]+/).filter(w => w && !/^(and|of|the|for|in|to|with|lab)$/i.test(w));
  const ab = words.map(w => /^(I{1,3}|IV|V)$/i.test(w) ? w.toUpperCase() : w[0]).join('').slice(0, 3).toUpperCase();
  let h = 7;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return <span className="sub-badge" style={{ '--h': h }} aria-hidden="true">{ab}</span>;
}

// Semester filter: All / Semester 3 / Semester 4
function SemChips({ sems, value, set }) {
  return (
    <div className="sem-chips" role="tablist" aria-label="Semester">
      {[0, ...sems].map(n => (
        <button key={n} type="button" role="tab" aria-selected={value === n} className={'sem-chip' + (value === n ? ' on' : '')} onClick={() => set(n)}>
          {n ? 'Semester ' + n : 'All'}
        </button>
      ))}
    </div>
  );
}

// ---------- PYQ: subject list. Abhi ke syllabus wale upar, purane naam neeche ----------
function PyqList({ route, base, crumbs, title, sub, filter, setFilter }) {
  const [sem, setSem] = useState(0);
  const f = filter.toLowerCase();
  const all = pyqSubjects(route.year, route.branch);
  const { now, old } = useMemo(() => splitCurrent(all, route.year), [all, route.year]);
  const keep = s => s.name.toLowerCase().includes(f) && (!sem || parseInt(s.semester) === sem);
  const nowShown = now.filter(keep), oldShown = old.filter(keep);
  const sems = YEARS[route.year - 1].sems;
  const card = s => (
    <Link key={s.slug} className="subject-card sub-card" to={`${base}/pyq/${s.slug}`}>
      <Badge name={s.name} />
      <span className="sub-text">
        <span className="subject-name">{nice(s.name)}</span>
        <small>Semester {parseInt(s.semester)} · {s.files.length} {s.files.length === 1 ? 'paper' : 'papers'}</small>
      </span>
      <Icon n="chevron-right" />
    </Link>
  );
  return (
    <Sheet id="pyqR2Overlay" back={base} crumbs={crumbs} title={title} sub={sub}>
      <SemChips sems={sems} value={sem} set={setSem} />
      <input type="search" className="subjects-search" id="pyqR2Search" placeholder="Search subject" aria-label="Search subject" value={filter} onChange={e => setFilter(e.target.value)} />
      <div id="pyqR2Grid">
        {sems.filter(n => !sem || n === sem).map(n => {
          const l = nowShown.filter(s => parseInt(s.semester) === n);
          return l.length > 0 && (
            <section key={n}>
              <h2 className="sem-head">Semester {n} <span className="sem-tag">Current syllabus</span></h2>
              <div className="subjects-grid">{l.map(card)}</div>
            </section>
          );
        })}
        {oldShown.length > 0 && (
          <section className="pyq-old">
            <h2 className="sem-head old">Older subject names</h2>
            <p className="old-note">Subjects from earlier RTU schemes. Their papers are still useful for practice.</p>
            <div className="subjects-grid">{oldShown.map(card)}</div>
          </section>
        )}
        {!nowShown.length && !oldShown.length && <p className="empty">No subject matches “{filter}”{sem ? ' in semester ' + sem : ''}.</p>}
      </div>
    </Sheet>
  );
}

// =====================================================================
//  SYLLABUS — Cloudflare R2 (private) se, site ke andar hi khulta hai
// =====================================================================
function useSyllabus() {
  const [st, setSt] = useState(null);
  useEffect(() => { let on = true; loadSyllabus().then(v => { if (on) setSt(v); }); return () => { on = false; }; }, []);
  return st;
}
const sylBox = (st, route) => st && st.data[(route.year === 1 ? 'COMMON' : route.branch) + '|' + route.year];

// PYQ subject page par "Syllabus" tab
function SyllabusTab({ route, base, name }) {
  const st = useSyllabus(), g = findSyllabusFor(sylBox(st, route), name);
  return <Link className="subj-tab" to={g ? `${base}/syllabus/${g.slug}` : `${base}/syllabus`}><Icon n="layer-group" /> Syllabus</Link>;
}

function SylCard({ it, base, full }) {
  return (
    <Link className={'subject-card sub-card' + (full ? ' special' : '')} to={`${base}/syllabus/${it.slug}`}>
      {full ? <span className="sub-badge full" aria-hidden="true"><Icon n="layer-group" /></span> : <Badge name={it.name} />}
      <span className="sub-text">
        <span className="subject-name">{it.name}</span>
        <small>{[it.code, it.sem ? 'Semester ' + it.sem : '', full ? 'Complete PDF' : it.lab ? 'Lab' : 'Theory'].filter(Boolean).join(' · ')}</small>
      </span>
      <Icon n="chevron-right" />
    </Link>
  );
}

function SyllabusList({ route, base, crumbs }) {
  const st = useSyllabus();
  const [sem, setSem] = useState(0);
  const [filter, setFilter] = useState('');
  const [kind, setKind] = useState('all');
  const y = YEARS[route.year - 1], box = sylBox(st, route);
  if (route.year === 1 && !box) return <SectionList sec="syllabus" base={base} crumbs={crumbs} />;   // 1st year abhi bucket mein nahi: purani list
  const who = route.year === 1 ? y.nice : `${branchShort(route.branch)} ${y.nice}`;
  const f = filter.toLowerCase();
  const keep = it => it.name.toLowerCase().includes(f) && (!sem || !it.sem || it.sem === sem);
  const show = k => kind === 'all' || kind === k;
  const full = box && show('full') ? box.full.filter(keep) : [], subs = box && show('subjects') ? box.subjects.filter(keep) : [], labs = box && show('labs') ? box.labs.filter(keep) : [];
  const kinds = box ? [['all', 'Everything'], ['full', 'Full syllabus', box.full.length], ['subjects', 'Subjects', box.subjects.length], ['labs', 'Labs', box.labs.length]].filter(k => k[0] === 'all' || k[2]) : [];
  const hasSem = box && [...box.full, ...box.subjects, ...box.labs].some(it => it.sem);
  return (
    <Sheet id="syllabusOverlay" back={base} crumbs={crumbs} title={who + ' syllabus'}
      sub={`Latest RTU syllabus${route.year > 1 ? ' for ' + nice(route.branch) : ''}, semester ${y.sems.join(' and ')}. Opens right here on rtuhub.in.`}>
      {!st && <div className="syl-wait" role="status"><Icon n="circle-notch fa-spin" /> Loading syllabus</div>}
      {st && !box && (
        <div className="syl-empty">
          <Icon n="layer-group" />
          <b>{who} syllabus is being added</b>
          <p>{st.failed ? 'Could not reach the server. Check your internet and reload.' : 'We are uploading it right now. Check back soon.'}</p>
        </div>
      )}
      {box && (
        <>
          {kinds.length > 2 && (
            <div className="sem-chips kind-chips" role="tablist" aria-label="Type">
              {kinds.map(([k, label, n]) => (
                <button key={k} type="button" role="tab" aria-selected={kind === k} className={'sem-chip' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>
                  {label}{n ? <small> {n}</small> : null}
                </button>
              ))}
            </div>
          )}
          {hasSem && <SemChips sems={y.sems} value={sem} set={setSem} />}
          <input type="search" className="subjects-search" placeholder="Search subject or lab" aria-label="Search subject or lab" value={filter} onChange={e => setFilter(e.target.value)} />
          {full.length > 0 && <><h2 className="sem-head">Full syllabus</h2><div className="subjects-grid">{full.map(it => <SylCard key={it.slug} it={it} base={base} full />)}</div></>}
          {subs.length > 0 && <><h2 className="sem-head">Subjects <span className="sem-tag">{subs.length}</span></h2><div className="subjects-grid">{subs.map(it => <SylCard key={it.slug} it={it} base={base} />)}</div></>}
          {labs.length > 0 && <><h2 className="sem-head">Labs <span className="sem-tag">{labs.length}</span></h2><div className="subjects-grid">{labs.map(it => <SylCard key={it.slug} it={it} base={base} />)}</div></>}
          {!full.length && !subs.length && !labs.length && <p className="empty">Nothing matches{filter ? ` “${filter}”` : ''}{sem ? ' in semester ' + sem : ''}.</p>}
        </>
      )}
    </Sheet>
  );
}

// syllabus ki photos (subject wise) — zoom ke saath
const IMG_ZOOMS = [0.75, 1, 1.35, 1.8, 2.5];
function ImagePages({ pages, title }) {
  const [ok, setOk] = useState(false);
  const [zi, setZi] = useState(1);
  const [loaded, setLoaded] = useState(0);
  useEffect(() => { ensureSession().then(() => setOk(true)); }, []);
  if (!ok) return <Loader progress={0} label="Loading syllabus" last="Opening pages" />;
  return (
    <>
      <div className="pdf-stage syl-pages">
        <div className="pdf-pages" style={{ '--zoom': IMG_ZOOMS[zi] }}>
          {pages.map((p, i) => (
            <div key={p.key} className="pdf-page done">
              <img src={sylFileUrl(p.key)} alt={`${title}, page ${i + 1}`} loading={i < 2 ? 'eager' : 'lazy'} onLoad={() => setLoaded(n => n + 1)} />
            </div>
          ))}
        </div>
      </div>
      {loaded === 0 && <div className="syl-loading"><Loader progress={0} label="Loading syllabus" last="Opening pages" /></div>}
      <div className="pdf-tools">
        <button aria-label="Zoom out" disabled={zi === 0} onClick={() => setZi(zi - 1)}><Icon n="minus" /></button>
        <span>{pages.length} {pages.length === 1 ? 'page' : 'pages'}</span>
        <button aria-label="Zoom in" disabled={zi === IMG_ZOOMS.length - 1} onClick={() => setZi(zi + 1)}><Icon n="plus" /></button>
      </div>
    </>
  );
}

function SyllabusItem({ route, base, crumbs }) {
  const st = useSyllabus(), box = sylBox(st, route);
  const back = base + '/syllabus';
  const it = box && [...box.full, ...box.subjects, ...box.labs].find(x => x.slug === route.slug);
  if (route.year === 1 && route.item && !it) return <ItemPage sec="syllabus" item={route.item} base={base} crumbs={crumbs} />;
  if (st && !it) return (
    <Sheet id="syllabusOverlay" back={back} crumbs={crumbs} title="Syllabus not found" size="narrow" sub="This subject is not in the syllabus list yet.">
      <Link className="btn" to={back}><Icon n="layer-group" /> See all syllabus</Link>
    </Sheet>
  );
  const name = it ? it.name : crumbs.length ? seo(route).crumbs.slice(-1)[0][0] : 'Syllabus';
  const key = it && (it.key || it.pages[0].key);
  const pdf = it && /\.pdf$/i.test(key);
  const pyq = it && !it.pages ? null : it && (() => {
    let best = null, score = 0;
    for (const s of pyqSubjects(route.year, route.branch)) { const v = matchScore(it.name, s.name); if (v > score) { score = v; best = s; } }
    return score >= 0.6 ? best : null;
  })();
  return (
    <div id="pdfViewerOverlay" className="syl-view">
      <div className="pdfv-bar">
        <Link className="icon-btn back-btn" id="closeSyllabus" to={back} aria-label="Back to syllabus"><Icon n="arrow-left" /></Link>
        <div className="pdfv-name">
          <nav className="crumbs" aria-label="Breadcrumb">{crumbs.map(([n, to]) => <Link key={to} to={to}>{n}</Link>)}</nav>
          <h1 id="syllabusName">{name}{it && !it.pages ? '' : ' syllabus'}</h1>
        </div>
        {pyq && <Link className="icon-btn pyq-jump" to={`${base}/pyq/${pyq.slug}`} title="PYQ papers of this subject" aria-label="PYQ papers of this subject"><Icon n="history" /><em>PYQ</em></Link>}
        <ShareButton title={name + ' syllabus'} />
        {key && <a className="btn" id="sylDownload" href={sylFileUrl(key, true)} download onClick={() => ensureSession()}><Icon n="download" /> Download</a>}
      </div>
      {!it ? <Loader progress={0} label="Loading syllabus" last="Opening pages" />
        : pdf ? <PdfPages key={key} subj={null} file={null} src={sylFileUrl(key)} title={name + ' syllabus'} what="syllabus" />
        : <ImagePages key={key} pages={it.pages || [{ key }]} title={name + ' syllabus'} />}
    </div>
  );
}

// =====================================================================
//  CAMPUS MAP — ungli se zoom (pinch), kheench kar ghumao, double tap = zoom
// =====================================================================
const GMAP = 'https://www.google.com/maps/@25.1404134,75.806958,1181m/data=!3m1!1e3';
const GMAP_DIR = 'https://www.google.com/maps/dir/?api=1&destination=25.1404134,75.806958';
function ZoomImage({ src, alt, w, h }) {
  const box = useRef(null), img = useRef(null);
  const v = useRef({ s: 1, x: 0, y: 0, W: 0, H: 0, bw: 0, bh: 0 });
  const pts = useRef(new Map()), pinch = useRef(null), tap = useRef(0);
  const [full, setFull] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const clampAxis = (p, size, room) => size <= room ? (room - size) / 2 : Math.min(0, Math.max(room - size, p));
  const draw = () => {
    const o = v.current;
    o.x = clampAxis(o.x, o.bw * o.s, o.W); o.y = clampAxis(o.y, o.bh * o.s, o.H);
    if (img.current) img.current.style.transform = `translate3d(${o.x}px, ${o.y}px, 0) scale(${o.s})`;
    setZoomed(o.s > 1.02);
  };
  const zoomAt = (ns, cx, cy) => {
    const o = v.current;
    ns = Math.min(6, Math.max(1, ns));
    o.x = cx - (cx - o.x) * (ns / o.s); o.y = cy - (cy - o.y) * (ns / o.s); o.s = ns;
    draw();
  };
  const fit = () => {
    const o = v.current, el = box.current;
    if (!el) return;
    o.W = el.clientWidth; o.H = el.clientHeight;
    const k = Math.min(o.W / w, o.H / h);
    o.bw = w * k; o.bh = h * k;
    if (img.current) { img.current.style.width = o.bw + 'px'; img.current.style.height = o.bh + 'px'; }
    if (!o.ready) {   // pehli baar: chhoti/lambi screen par poora box bhar do, campus beech mein
      o.ready = true;
      const cover = Math.max(o.W / o.bw, o.H / o.bh);
      if (cover > 1.05) { o.s = cover; o.x = o.W / 2 - o.bw * cover * 0.4; o.y = o.H / 2 - o.bh * cover * 0.45; }
    }
    draw();
  };
  useEffect(() => {
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box.current);
    const wheel = e => {
      e.preventDefault();
      const r = box.current.getBoundingClientRect();
      zoomAt(v.current.s * Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top);
    };
    box.current.addEventListener('wheel', wheel, { passive: false });
    return () => { ro.disconnect(); box.current && box.current.removeEventListener('wheel', wheel); };
  }, []);
  useEffect(() => {
    fit();
    if (!full) return;
    const esc = e => { if (e.key === 'Escape') setFull(false); };
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, [full]);

  const local = e => { const r = box.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const down = e => {
    box.current.setPointerCapture(e.pointerId);
    pts.current.set(e.pointerId, local(e));
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      pinch.current = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: v.current.s };
    }
    if (pts.current.size === 1) {   // double tap
      const now = Date.now();
      if (now - tap.current < 300) { const [x, y] = local(e); zoomAt(v.current.s > 1.5 ? 1 : 2.6, x, y); tap.current = 0; }
      else tap.current = now;
    }
  };
  const move = e => {
    if (!pts.current.has(e.pointerId)) return;
    const prev = pts.current.get(e.pointerId), cur = local(e);
    pts.current.set(e.pointerId, cur);
    if (pts.current.size === 2 && pinch.current) {
      const [a, b] = [...pts.current.values()];
      zoomAt(pinch.current.s * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.current.d, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    } else if (pts.current.size === 1) {
      v.current.x += cur[0] - prev[0]; v.current.y += cur[1] - prev[1];
      draw();
    }
  };
  const up = e => { pts.current.delete(e.pointerId); if (pts.current.size < 2) pinch.current = null; };
  const step = k => { const o = v.current; zoomAt(o.s * k, o.W / 2, o.H / 2); };

  return (
    <div className={'zoom-wrap' + (full ? ' full' : '')}>
      <div ref={box} className={'zoom-box' + (zoomed ? ' zoomed' : '')} style={{ aspectRatio: full ? undefined : `${w} / ${h}` }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <img ref={img} src={src} alt={alt} draggable="false" width={w} height={h} />
      </div>
      <div className="zoom-ui">
        <button type="button" aria-label="Zoom in" onClick={() => step(1.5)}><Icon n="plus" /></button>
        <button type="button" aria-label="Zoom out" onClick={() => step(1 / 1.5)}><Icon n="minus" /></button>
        <button type="button" aria-label="Reset view" onClick={() => { v.current.s = 1; draw(); }}><Icon n="compress-arrows-alt" /></button>
        <button type="button" aria-label={full ? 'Exit full screen' : 'Full screen'} onClick={() => setFull(!full)}><Icon n={full ? 'times' : 'expand'} /></button>
      </div>
    </div>
  );
}

// ---------- Download: click karte hi file download ----------
// File apni site ke /api/paper se aati hai (domain lock). Wo na chale aur bucket public ho to seedha storage se.
function DownloadButton({ subj, file, small }) {
  const [state, setState] = useState('');
  const api = paperApiUrl(subj, file, true);
  const start = async e => {
    e.preventDefault();
    if (state === 'busy') return;
    setState('busy');
    const save = href => { const a = document.createElement('a'); a.href = href; a.download = file; document.body.appendChild(a); a.click(); a.remove(); };
    await ensureSession();
    const works = await fetch(api, { headers: { Range: 'bytes=0-0' } }).then(r => r.ok, () => false);
    if (works || !PUBLIC_FALLBACK) save(api);
    else {
      try {
        const res = await fetch(paperUrl(subj, file));
        if (!res.ok) throw new Error(res.status);
        const blobUrl = URL.createObjectURL(await res.blob());
        save(blobUrl);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } catch (err) { window.open(paperUrl(subj, file), '_blank'); }
    }
    setState('done');
    setTimeout(() => setState(''), 2500);
  };
  const icon = state === 'busy' ? 'spinner fa-spin' : state === 'done' ? 'check' : 'download';
  const label = state === 'busy' ? 'Downloading' : state === 'done' ? 'Downloaded' : 'Download';
  if (small) return <button className="paper-dl" onClick={start} aria-label={'Download ' + paperTitle(subj, file)}><Icon n={icon} /> {label}</button>;
  return <a className="btn" id="pdfDownloadBtn" href={api} download={file} onClick={start}><Icon n={icon} /> {label}</a>;
}

// ---------- PDF viewer (site ke andar, pdf.js se — tez) ----------
// paper list khulte hi viewer ka code peeche se load ho jata hai
function PreloadViewer() {
  useEffect(() => { loadPdfLib().catch(() => {}); }, []);
  return null;
}

// paper ka link share karna (WhatsApp, Telegram ...); share na ho to link copy
function ShareButton({ title }) {
  const [done, setDone] = useState(false);
  const share = async () => {
    const data = { title: title + ' | RTU PYQ', text: title + ' (RTU previous year paper) on rtuhub.in', url: location.href };
    try { if (navigator.share) { await navigator.share(data); return; } } catch (e) { if (e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(data.url); } catch (e) {}
    setDone(true); setTimeout(() => setDone(false), 1800);
  };
  return <button className="icon-btn" id="paperShare" aria-label="Share this paper" title={done ? 'Link copied' : 'Share'} onClick={share}><Icon n={done ? 'check' : 'share-alt'} /></button>;
}

function PdfViewer({ subj, file, back, crumbs }) {
  const name = paperTitle(subj, file);
  return (
    <div id="pdfViewerOverlay">
      <div className="pdfv-bar">
        <Link className="icon-btn back-btn" id="closePdfViewer" to={back} aria-label="Back to papers"><Icon n="arrow-left" /></Link>
        <div className="pdfv-name">
          <nav className="crumbs" aria-label="Breadcrumb">{crumbs.map(([n, to]) => <Link key={to} to={to}>{n}</Link>)}</nav>
          <h1 id="pdfViewerName">{name}</h1>
        </div>
        <ShareButton title={name} />
        <DownloadButton subj={subj} file={file} />
      </div>
      <PdfPages subj={subj} file={file} title={name} />
    </div>
  );
}

// ---------- animated notes: site ke andar hi frame mein chalte hain ----------
function NoteViewer({ note, unit, back, crumbs }) {
  const [on, setOn] = useState(false);       // frame sirf browser mein banta hai (build ke HTML mein nahi)
  const [ready, setReady] = useState(false);
  useEffect(() => { setOn(true); const t = setTimeout(() => setReady(true), 6000); return () => clearTimeout(t); }, []);
  const i = note.units.indexOf(unit), prev = note.units[i - 1], next = note.units[i + 1];
  const to = u => `${back}/unit-${u.n}`, name = `${note.name}: Unit ${unit.n}`;
  return (
    <div id="pdfViewerOverlay" className="anote-view">
      <div className="pdfv-bar">
        <Link className="icon-btn back-btn" id="closeNote" to={back} aria-label="Back to units"><Icon n="arrow-left" /></Link>
        <div className="pdfv-name">
          <nav className="crumbs" aria-label="Breadcrumb">{crumbs.map(([n, t]) => <Link key={t} to={t}>{n}</Link>)}</nav>
          <h1 id="noteName">{name}</h1>
        </div>
        {prev && <Link className="icon-btn" id="notePrev" to={to(prev)} replace aria-label={'Unit ' + prev.n} title={'Unit ' + prev.n}><Icon n="chevron-left" /></Link>}
        {next && <Link className="icon-btn" id="noteNext" to={to(next)} replace aria-label={'Unit ' + next.n} title={'Unit ' + next.n}><Icon n="chevron-right" /></Link>}
        <ShareButton title={name + ' animated notes'} />
      </div>
      {!ready && <Loader progress={0} label="Loading notes" last="Starting animation" />}
      {on && <iframe id="noteFrame" className={ready ? '' : 'wait'} title={name} src={`/anotes/${note.slug}/unit-${unit.n}`} onLoad={() => setReady(true)}></iframe>}
      <noscript><p className="empty">{unit.title}. {unit.heads.join('. ')}</p></noscript>
    </div>
  );
}

// ---------- 1st year: notes / lab / syllabus / books / cram / time table ----------
const SEC_UI = {
  notes: { id: 'notesOverlay', title: '1st Year notes', sub: 'Subject wise notes. Each one opens in Google Drive.', ph: 'Search subject' },
  lab: { id: 'labsOverlay', title: '1st Year lab work', sub: '60 marks internal (assignment, attendance) and 40 external (viva and exam).', ph: 'Search lab' },
  syllabus: { id: 'syllabusOverlay', title: '1st Year syllabus', sub: 'Full syllabus, or one subject at a time.', ph: 'Search subject' },
  timetable: { id: 'timetableOverlay', title: '1st Year time table', sub: 'Pick your section.', ph: 'Search section' },
  books: { id: 'booksOverlay', title: '1st Year books', sub: 'One book PDF per subject.', ph: 'Search subject' },
  cram: { id: 'cramOverlay', title: '1-day cram', sub: 'Short revision notes for the night before the exam.', ph: 'Search subject' }
};

function SectionList({ sec, base, crumbs }) {
  const [filter, setFilter] = useState('');
  const ui = SEC_UI[sec], f = filter.toLowerCase();
  const shown = SECTIONS[sec].items.filter(it => it.name.toLowerCase().includes(f));
  return (
    <Sheet id={ui.id} back={base} crumbs={crumbs} title={ui.title} sub={ui.sub}>
      <input type="search" className="subjects-search" placeholder={ui.ph} aria-label={ui.ph} value={filter} onChange={e => setFilter(e.target.value)} />
      <div className="subjects-grid">
        {shown.map(it => (
          // click: Drive link naye tab mein + site ka URL bhi us subject ka ho jata hai
          <Link key={it.slug} className={'subject-card' + (it.isSpecial ? ' special' : '')} to={`${base}/${sec}/${it.slug}`} onClick={() => window.open(it.link, '_blank')}>
            {it.isSpecial && <Icon n="star" />}
            <span className="subject-name" style={{ flex: 1 }}>{itemName(it)}</span>
            {it.credit && <span className="subject-credit">{it.credit} credit</span>}
            <Icon n="external-link-alt" />
          </Link>
        ))}
      </div>
      {!shown.length && <p className="empty">Nothing matches “{filter}”.</p>}
    </Sheet>
  );
}

// ek subject ka apna page: /1styear/notes/engineering-physics
function ItemPage({ sec, item, base, crumbs }) {
  const def = SECTIONS[sec];
  const more = Object.entries(SECTIONS)
    .filter(([k, d]) => k !== sec && d.items.some(x => x.slug === item.slug))
    .map(([k, d]) => [`${base}/${k}/${item.slug}`, d.word]);
  const pyq = parseRoute(`${base}/pyq/${item.slug}`);
  if (pyq && pyq.subject) more.unshift([pyq.path, 'PYQ papers']);
  return (
    <Sheet id="itemOverlay" back={`${base}/${sec}`} crumbs={crumbs} title={`${itemName(item)}: ${def.word.toLowerCase()}`} size="narrow"
      sub={`RTU B.Tech 1st Year${item.credit ? ', ' + item.credit + ' credit' : ''}. Opens in Google Drive.`}>
      <a className="btn item-open" href={item.link} target="_blank" rel="noopener"><Icon n="google-drive" b /> {def.open} <Icon n="external-link-alt" /></a>
      {more.length > 0 && (
        <>
          <h2 className="more-title">More for this subject</h2>
          <div className="stack">
            {more.map(([to, word]) => (
              <Link key={to} className="subject-card" to={to}><span className="subject-name">{word}</span><Icon n="arrow-right" /></Link>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}

// ---------- SEND US A PDF (email se) ----------
function Upload({ back }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const href = `mailto:${MAIL}?subject=${encodeURIComponent(subject || 'PDF for rtuhub.in')}&body=${encodeURIComponent(message)}`;
  return (
    <Sheet id="uploadOverlay" back={back} title="Send us a PDF" size="narrow" sub="Have notes, a paper or an assignment that should be on rtuhub.in? Email it to us.">
      <div className="upload-form">
        <div className="form-group">
          <label htmlFor="uploadSubject">Subject</label>
          <input className="field" type="text" id="uploadSubject" placeholder="Like: Engineering Physics notes, unit 2" value={subject} onChange={e => setSubject(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="uploadMessage">Message (optional)</label>
          <textarea className="field" id="uploadMessage" rows="3" placeholder="Year, branch, anything we should know" value={message} onChange={e => setMessage(e.target.value)}></textarea>
        </div>
        <p className="form-note">This opens your email app with the details filled in. Attach your PDF, PNG or JPG there and press send.</p>
        <a className="btn" id="sendUploadBtn" href={href}><Icon n="paper-plane" /> Open email</a>
      </div>
    </Sheet>
  );
}

// =====================================================================
//  BROWSER START
// =====================================================================
if (isBrowser) {
  // DOMAIN LOCK: kisi aur domain par copy ki gayi site asli site par bhej deti hai.
  // (Asli taala server par hai — api/paper.js — is line ko hatane se bhi papers nahi khulenge.)
  if (!/(^|\.)rtuhub\.in$|\.vercel\.app$|^localhost$|^127\.0\.0\.1$/.test(location.hostname)) location.replace(SITE + location.pathname);
  ensureSession();

  // ----- PHONE KEYBOARD + BACK -----
  // Keyboard khula ho aur Back dabao to pehle sirf keyboard band ho, page peeche na jaye.
  // Tareeka: likhne wale box par ungli rakhte hi history mein ek "guard" entry jodte hain;
  // Back us guard ko khata hai aur hum keyboard band kar dete hain.
  if (matchMedia('(pointer: coarse)').matches) {
    const vv = window.visualViewport;
    const fullH = () => Math.max(vv ? vv.height : 0, document.documentElement.clientHeight);
    let guard = !!(history.state && history.state.kb), tall = fullH(), wide = innerWidth;
    // kbUp = keyboard abhi khula; kbDownAt = keyboard kab band hua.
    // Android par Back dabate hi keyboard band hone lagta hai, aur popstate tak woh band ho chuka hota hai.
    // Isliye "abhi-abhi band hua" ko bhi "khula tha" maante hain, warna page galti se peeche chala jaata tha.
    let kbUp = false, kbDownAt = 0;
    const typing = () => { const el = document.activeElement; return !!el && (el.tagName === 'TEXTAREA' || el.isContentEditable || (el.tagName === 'INPUT' && !/^(file|checkbox|radio|button|submit|reset|range|color|image)$/.test(el.type))); };
    const keyboardUp = () => typing() && (!vv || kbUp || Date.now() - kbDownAt < 900);
    if (vv) vv.addEventListener('resize', () => {
      if (innerWidth !== wide) { wide = innerWidth; tall = fullH(); }   // phone ghumaya
      else tall = Math.max(tall, vv.height);
      const up = vv.height < tall - 120;
      if (kbUp && !up) kbDownAt = Date.now();
      kbUp = up;
    });
    const push = history.pushState.bind(history), replace = history.replaceState.bind(history);
    // guard ke upar naya page khule to guard ki jagah hi le le (history mein kachra na bache)
    history.pushState = (st, t, url) => { if (guard) { guard = false; replace(st, t, url); } else push(st, t, url); };
    history.replaceState = (st, t, url) => { guard = false; replace(st, t, url); };
    const arm = () => { if (typing() && !guard) { guard = true; push({ kb: 1 }, '', location.href); } };
    // Chrome bina tap/touch ke bani history entry ko Back par skip kar deta hai, isliye guard tabhi jodo jab
    // user ne sach me tap kiya ho; autofocus wale box me pehla akshar likhte hi (input) guard lag jata hai.
    document.addEventListener('focusin', () => { if (!navigator.userActivation || navigator.userActivation.isActive) arm(); });
    document.addEventListener('input', arm, true);
    document.addEventListener('pointerdown', () => setTimeout(arm, 0), true);   // pehle se focused box par dobara tap
    window.addEventListener('popstate', e => {
      if (e.state && e.state.kb) { e.stopImmediatePropagation(); history.back(); return; }   // purana guard: seedha paar
      if (!guard) return;
      guard = false;
      e.stopImmediatePropagation();
      if (keyboardUp()) document.activeElement.blur();   // sirf keyboard band
      else history.back();                               // keyboard pehle se band tha: asli Back
    });
  }

  const root = document.getElementById('root');
  const app = <App initialPath={location.pathname} />;
  // build ke time bana hua HTML ho to usi ko chalu karo, warna naya banao
  if (root.hasChildNodes()) hydrateRoot(root, app); else createRoot(root).render(app);

  // ----- security -----
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    const k = (e.key || '').toLowerCase();
    // Ctrl+S, Ctrl+U, Ctrl+P, Ctrl+Shift+I/J/C, F12
    if (k === 'f12' || (e.ctrlKey && !e.shiftKey && ['s', 'u', 'p'].includes(k)) || (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(k))) e.preventDefault();
  });
  document.addEventListener('dragstart', e => e.preventDefault());
  console.log('%c STOP!', 'color: red; font-size: 50px; font-weight: bold; text-shadow: 2px 2px black;');
  console.log('%c This browser feature is intended for developers. If someone told you to copy-paste something here, it is a scam and will give them access to your account.', 'color: white; font-size: 16px; background: #333; padding: 10px; border-radius: 5px;');
  console.log('%c rtuhub.in - All Rights Reserved', 'color: #3f7eff; font-size: 14px;');
}
