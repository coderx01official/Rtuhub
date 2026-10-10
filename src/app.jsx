// =====================================================================
//  rtuhub.in — poora UI (React). Data src/data.js mein, tools src/tools.jsx mein.
//  Har screen ka apna URL hai, jaise /1styear/pyq/engineering-physics/2025
// =====================================================================
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import {
  SITE, YEARS, SECTIONS, branches, calendarData, rtuLinks, news,
  dashPath, resolveRoute, parseRoute, seo, pyqSubjects, paperUrl, paperApiUrl, paperGroups, paperTitle, HOME_LINKS, PUBLIC_FALLBACK,
  nice, itemName, branchShort
} from './data.js';
import { Sgpa, Calculator } from './tools.jsx';
import { PdfPages, warmPdf, loadPdfLib, ensureSession } from './viewer.jsx';
import './style.css';

export * from './data.js';

const isBrowser = typeof window !== 'undefined';
const useIso = isBrowser ? useLayoutEffect : useEffect;
const MAIL = 'coderx01official@gmail.com';

// ---------- ROUTER (bina kisi library ke) ----------
const Nav = createContext(() => {});

function Link({ to, onClick, children, ...rest }) {
  const nav = useContext(Nav);
  return (
    <a href={to} {...rest} onClick={e => {
      if (onClick) onClick(e);
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      nav(to);
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
            <h1 className="pick-title">Which year are you in?</h1>
            <p className="pick-sub">RTU B.Tech papers, notes and syllabus, sorted for your year. You can change this any time.</p>
            <YearGrid />
            <nav className="home-links" aria-label="Sections">
              {HOME_LINKS.map(([to, icon, name]) => <Link key={to} to={to}><Icon n={icon} /> {name}</Link>)}
            </nav>
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
      <Sheets route={route} base={base} />
    </Nav.Provider>
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
  ['/sgpa-calculator', 'calculator', 'SGPA calculator'], ['/calculator', 'square-root-alt', 'Scientific calculator'],
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
  if (key === 'animated') return { off: 'Soon' };
  if (key === 'calendar') return { to: base + '/calendar' };
  if (key === 'pyq') {
    const list = pyqSubjects(sel.year, sel.branch);
    if (!list.length) return { off: 'Not added yet' };
    const ys = list.flatMap(s => s.files.map(f => f.slice(0, 4))).sort();
    return { to: base + '/pyq', line: `${list.length} subjects, ${ys[0]} to ${ys[ys.length - 1]}` };
  }
  return sel.year === 1 ? { to: `${base}/${key}` } : { off: '1st year only' };
}

// search: is year/branch ke saare subjects + sections + tools
function searchIndex(sel, base) {
  const out = [];
  if (sel) {
    for (const s of pyqSubjects(sel.year, sel.branch)) out.push([nice(s.name), 'PYQ, sem ' + parseInt(s.semester), `${base}/pyq/${s.slug}`]);
    if (sel.year === 1) for (const [k, d] of Object.entries(SECTIONS)) for (const it of d.items) out.push([itemName(it), d.word, `${base}/${k}/${it.slug}`]);
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

  useEffect(() => {
    if (!menu) return;
    const close = e => { if (!e.target.closest('#menuToggle, #dropdownMenu')) setMenu(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menu]);

  const y = sel && YEARS[sel.year - 1];
  const H = covered ? 'div' : 'h1';
  const menuItem = (id, icon, label, to) =>
    <Link className="dropdown-item" id={id} to={to} onClick={() => setMenu(false)}><Icon n={icon} /> {label}</Link>;
  const soon = name => e => { e.preventDefault(); alert(name + ' page is coming soon.'); };

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
            const cls = 'action-card' + (key === 'pyq' ? ' lead' : '') + (st.off ? ' off' : '');
            // .neon = card ke peeche ka glow; --i se cards ek ke baad ek aate hain
            return (
              <div key={key} className={'neon' + (key === 'pyq' ? ' lead' : '') + (st.off ? ' off' : '')} style={{ '--i': i }}>
                {st.to
                  ? <Link className={cls} id={'card-' + key} to={st.to}>{inner}</Link>
                  : <div className={cls} id={'card-' + key} aria-disabled="true">{inner}</div>}
              </div>
            );
          })}
        </div>
      ) : <YearGrid />}
      {sel && sel.year > 1 && <p className="only-first">Notes, lab work, syllabus, books and time table are on rtuhub.in for 1st year only right now.</p>}

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
        <div className="footer-links">
          <a href="#" onClick={soon('Home')}>Home</a>
          <a href="#" onClick={soon('About')}>About</a>
          <a href="#" onClick={soon('Contact')}>Contact</a>
        </div>
      </footer>
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

function Sheets({ route, base }) {
  // PYQ search tab tak yaad rahe jab tak PYQ khula hai
  const [pyqFilter, setPyqFilter] = useState('');
  const inPyq = route.kind === 'dash' && route.section === 'pyq';
  useEffect(() => { if (!inPyq) setPyqFilter(''); }, [inPyq]);

  if (route.kind === 'tool') {
    const t = route.tool;
    if (t === 'sgpa-calculator') return (
      <Sheet id="sgpaOverlay" back={base} title="RTU SGPA calculator" sub="Upload your RTU result PDF and your SGPA appears on its own. Or fill the grades by hand below.">
        <Sgpa />
      </Sheet>
    );
    if (t === 'calculator') return <Sheet id="calculatorOverlay" back={base} title="Scientific calculator" size="slim"><Calculator /></Sheet>;
    if (t === 'map') return (
      <Sheet id="mapOverlay" back={base} title="RTU campus map">
        <img className="map-image" id="mapImage" src="https://i.ibb.co/bSpjwTv/file-00000000c74c72088ac578e9d0627b0c.png" alt="RTU Campus Map" />
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

  if (sec === 'calendar') {
    const data = calendarData[route.sem];
    return (
      <Sheet id="calendarOverlay" back={base} crumbs={crumbs} title="Academic calendar 2025-26" sub={data.title}>
        <div className="semester-selector" id="semesterSelector">
          {YEARS[route.year - 1].sems.map(n =>
            <Link key={n} className={'sem-btn' + (n === route.sem ? ' active' : '')} to={`${base}/calendar/semester-${n}`}>Semester {n}</Link>)}
        </div>
        <table className="calendar-table" id="calendarTableContainer">
          <thead><tr><th>Event</th><th>Date</th></tr></thead>
          <tbody>{data.events.map(e => <tr key={e[0]}><td>{e[0]}</td><td>{e[1]}</td></tr>)}</tbody>
        </table>
      </Sheet>
    );
  }

  return route.item
    ? <ItemPage sec={sec} item={route.item} base={base} crumbs={crumbs} />
    : <SectionList sec={sec} base={base} crumbs={crumbs} />;
}

// ---------- PYQ: subject list, semester wise ----------
function PyqList({ route, base, crumbs, title, sub, filter, setFilter }) {
  const f = filter.toLowerCase();
  const shown = pyqSubjects(route.year, route.branch).filter(s => s.name.toLowerCase().includes(f));
  const sems = [...new Set(shown.map(s => s.semester))];
  return (
    <Sheet id="pyqR2Overlay" back={base} crumbs={crumbs} title={title} sub={sub}>
      <input type="search" className="subjects-search" id="pyqR2Search" placeholder="Search subject" aria-label="Search subject" value={filter} onChange={e => setFilter(e.target.value)} />
      <div id="pyqR2Grid">
        {sems.map(sem => (
          <section key={sem}>
            <h2 className="sem-head">Semester {parseInt(sem)}</h2>
            <div className="subjects-grid">
              {shown.filter(s => s.semester === sem).map(s => (
                <Link key={s.slug} className="subject-card" to={`${base}/pyq/${s.slug}`}>
                  <span className="subject-name">{nice(s.name)}</span>
                  <span className="subject-credit">{s.files.length} {s.files.length === 1 ? 'paper' : 'papers'}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
        {!shown.length && <p className="empty">No subject matches “{filter}”.</p>}
      </div>
    </Sheet>
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
    let guard = !!(history.state && history.state.kb), tall = vv ? vv.height : 0, wide = innerWidth;
    const typing = () => { const el = document.activeElement; return !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(file|checkbox|radio|button|submit|range|color)$/.test(el.type))); };
    const keyboardUp = () => typing() && (!vv || vv.height < tall - 120);
    if (vv) vv.addEventListener('resize', () => {
      if (innerWidth !== wide) { wide = innerWidth; tall = vv.height; }   // phone ghumaya
      else tall = Math.max(tall, vv.height);
    });
    const push = history.pushState.bind(history), replace = history.replaceState.bind(history);
    // guard ke upar naya page khule to guard ki jagah hi le le (history mein kachra na bache)
    history.pushState = (st, t, url) => { if (guard) { guard = false; replace(st, t, url); } else push(st, t, url); };
    history.replaceState = (st, t, url) => { guard = false; replace(st, t, url); };
    document.addEventListener('focusin', () => { if (typing() && !guard) { guard = true; push({ kb: 1 }, '', location.href); } });
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
