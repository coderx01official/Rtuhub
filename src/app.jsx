// =====================================================================
//  rtuhub.in — poora UI (React). Data src/data.js mein, tools src/tools.jsx mein.
//  Har screen ka apna URL hai, jaise /1styear/pyq/engineering-physics/2025
// =====================================================================
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import {
  SITE, YEARS, SECTIONS, branches, calendarData, rtuLinks, news,
  dashPath, resolveRoute, parseRoute, seo, pyqSubjects, paperSlug, paperName, paperUrl, nice
} from './data.js';
import { Sgpa, Calculator } from './tools.jsx';
import './style.css';

export * from './data.js';

const isBrowser = typeof window !== 'undefined';
const useIso = isBrowser ? useLayoutEffect : useEffect;

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
export function App({ initialPath }) {
  const [path, setPath] = useState(initialPath);
  const [saved, setSaved] = useState(null);
  const [introDone, setIntroDone] = useState(false);
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
    if (s && resolveRoute(location.pathname).kind === 'home') nav(dashPath(s.year, s.branch), true);
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

  return (
    <Nav.Provider value={nav}>
      {home && <Intro hide={introDone} onDone={() => setIntroDone(true)} />}

      {/* YEAR SELECTION */}
      <div id="yearSelection" className={home && introDone ? 'show' : ''}>
        <div className="year-box">
          <h2><i className="fas fa-graduation-cap"></i> SELECT YOUR YEAR</h2>
          <div className="year-grid">
            {YEARS.map(y => <Link key={y.n} to={'/' + y.slug} className="year-btn">{y.nice.split(' ')[0]} YEAR</Link>)}
          </div>
        </div>
      </div>

      {/* BRANCH SELECTION */}
      <div id="branchSelection" className={route.kind === 'branch' ? 'show' : ''}>
        <div className="branch-box">
          <h2><i className="fas fa-code-branch"></i> SELECT YOUR BRANCH</h2>
          <div className="branch-grid" id="branchGrid">
            {route.kind === 'branch' && branches.map(b => <Link key={b} to={dashPath(route.year, b)} className="branch-btn">{b}</Link>)}
          </div>
        </div>
      </div>

      <Dashboard show={route.kind === 'dash' || route.kind === 'tool'} sel={sel} base={base} reset={reset} />
      <Overlays route={route} sel={sel} base={base} />
    </Nav.Provider>
  );
}

// ---------- INTRO ----------
const FIELDS = [
  ['computer', 'fa-laptop-code', 'COMPUTER'], ['it', 'fa-network-wired', 'IT'], ['civil', 'fa-hard-hat', 'CIVIL'],
  ['chemical', 'fa-flask', 'CHEMICAL'], ['mechanical', 'fa-cogs', 'MECHANICAL'], ['aero', 'fa-rocket', 'AERONAUTICAL']
];
const LINE1 = 'WELCOME TO', LINE2 = 'RTUHUB.IN';

function Intro({ hide, onDone }) {
  const [active, setActive] = useState(-1);
  useEffect(() => {
    if (hide) return;
    const start = (LINE1.length + LINE2.length) * 100 + 500;
    const timers = FIELDS.map((_, i) => setTimeout(() => setActive(i), start + i * 350));
    timers.push(setTimeout(onDone, start + FIELDS.length * 350 + 200));
    return () => timers.forEach(clearTimeout);
  }, []);
  const letters = (text, offset) => [...text].map((ch, i) =>
    <span key={i} className="welcome-letter" style={{ animationDelay: ((offset + i) * 0.1).toFixed(1) + 's' }}>{ch === ' ' ? ' ' : ch}</span>);
  return (
    <div id="intro" className={hide ? 'hide' : ''}>
      <div className="floating-icons">
        {['microchip', 'code', 'hard-hat', 'cogs', 'flask', 'rocket'].map(n => <i key={n} className={'fas fa-' + n}></i>)}
      </div>
      <div className="welcome-title" id="welcomeTitle">
        <div className="welcome-line" id="welcomeLine1">{letters(LINE1, 0)}</div>
        <div className="welcome-line" id="welcomeLine2">{letters(LINE2, LINE1.length)}</div>
      </div>
      <div className="intro-content">
        <div className="fields-container" id="fieldsContainer">
          {FIELDS.map(([cls, icon, name], i) =>
            <div key={cls} className={`field-item ${cls}${i === active ? ' active' : ''}`} id={'field' + (i + 1)}><i className={'fas ' + icon}></i><span>{name}</span></div>)}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
//  MAIN DASHBOARD
// =====================================================================
const ONLY_1ST = 'This feature is currently available only for 1st year students.';
const CARDS = [
  ['notes', 'cardNotes', 'fa-book-open', 'NOTES', 'lecture series', 'Notes are currently available only for 1st year students.'],
  ['animated', 'cardAnimated', 'fa-magic', 'ANIMATED NOTES', 'visual learning', ONLY_1ST],
  ['pyq', 'cardPyq', 'fa-history', 'PYQ', 'last 10 yrs'],
  ['lab', 'cardLab', 'fa-flask', 'LAB WORK', 'manuals + viva', 'Lab work is currently available only for 1st year students.'],
  ['syllabus', 'cardSyllabus', 'fa-layer-group', 'SYLLABUS', 'subject wise', 'Syllabus is currently available only for 1st year students.'],
  ['books', 'cardBooks', 'fa-book', 'BOOKS', 'pdf & reference', 'Books are currently available only for 1st year students.'],
  ['cram', 'cardCram', 'fa-rocket', '1‑DAY CRAM', 'exam booster', ONLY_1ST],
  ['timetable', 'cardTimetable', 'fa-clock', 'TIME TABLE', 'section wise', 'Time Table is currently available only for 1st year students.'],
  ['calendar', 'cardCalendarHome', 'fa-calendar-alt', 'ACADEMIC CALENDAR', 'dates & events'],
  ['links', 'cardLinks', 'fa-link', 'RTU LINKS', 'eresources']
];
const RESOURCES = [
  ['fa-file-pdf', '1000+ Study PDFs for various subjects'], ['fa-film', '100+ Animated Notes for better understanding'],
  ['fa-book', '50+ Academic and Reference Books'], ['fa-layer-group', 'Complete Syllabus for All Branches'],
  ['fa-calendar-alt', 'Academic Calendar for the latest schedule updates'], ['fa-newspaper', 'Latest News and Announcements'],
  ['fa-calculator', 'CGPA Calculator for quick grade calculation'], ['fa-map-marked-alt', 'RTU Campus Map for easy navigation'],
  ['fa-question-circle', 'Query with Seniors for guidance and support']
];

// card kis URL par le jaye — ya kaunsa message dikhaye
function cardTarget(key, sel, base, onlyFirst) {
  if (key === 'links') return { to: '/links' };
  if (key === 'pyq') {
    if (!sel) return { msg: 'Please select your year first.' };
    if (pyqSubjects(sel.year, sel.branch).length) return { to: base + '/pyq' };
    return { msg: 'PYQ not available for ' + sel.branch + ' ' + YEARS[sel.year - 1].short + ' YEAR yet.' };
  }
  if (key === 'calendar') return sel ? { to: base + '/calendar' } : { msg: 'Please select your year first!' };
  if (!sel || sel.year !== 1) return { msg: onlyFirst };
  if (key === 'animated') return { msg: 'Animated Notes - Coming Soon!' };
  return { to: base + '/' + key };
}

function Dashboard({ show, sel, base, reset }) {
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);

  useEffect(() => {
    if (!menu) return;
    const close = e => { if (!e.target.closest('#menuToggle, #dropdownMenu')) setMenu(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menu]);

  const item = (id, icon, label, to, msg) => to
    ? <Link className="dropdown-item" id={id} to={to} onClick={() => setMenu(false)}><i className={'fas ' + icon}></i> {label}</Link>
    : <div className="dropdown-item" id={id} onClick={() => { setMenu(false); alert(msg); }}><i className={'fas ' + icon}></i> {label}</div>;
  const soon = name => e => { e.preventDefault(); alert(name + ' - Coming Soon!'); };

  return (
    <div id="main" className={show ? 'show' : ''}>
      <div className="header">
        <div className="header-left">
          <div className="menu-left" id="menuToggle" onClick={() => setMenu(!menu)}><i className="fas fa-bars"></i></div>
          <div className="engineering-logo">
            <svg viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="12" stroke="#3f7eff" strokeWidth="2" fill="none" strokeDasharray="2 2" />
              <circle cx="25" cy="25" r="8" stroke="#ffaa33" strokeWidth="2" fill="none" />
              <path d="M16 20 L10 25 L16 30" stroke="#66ccff" strokeWidth="2" fill="none" />
              <path d="M34 20 L40 25 L34 30" stroke="#66ccff" strokeWidth="2" fill="none" />
              <path d="M25 10 L30 20 L20 30 L25 40" stroke="#ffd966" strokeWidth="2" fill="none" />
              <circle cx="25" cy="25" r="3" fill="#ffffff" />
            </svg>
          </div>
        </div>
        <div className="heading-text"><h1>rtuhub.in</h1></div>
        <Link className="map-button" id="mapButton" to="/map" style={{ display: sel ? 'flex' : 'none' }}>
          <i className="fas fa-map-marked-alt"></i><span>RTU MAP</span>
        </Link>
      </div>

      <div className={'dropdown-menu' + (menu ? ' show' : '')} id="dropdownMenu">
        <div className="dropdown-item reset-item" id="resetYearBranch" onClick={() => { setMenu(false); reset(); }}><i className="fas fa-sync-alt"></i> SELECT YEAR/BRANCH</div>
        <div className="menu-divider"></div>
        {item('uploadPdfBtn', 'fa-upload', 'UPLOAD PDF', '/upload')}
        {item('queryBtn', 'fa-question-circle', 'QUERY', '/query')}
        <div className="menu-divider"></div>
        {item('cgpaBtn', 'fa-calculator', 'SGPA CALCULATOR', '/sgpa-calculator')}
        {item('calcBtn', 'fa-square-root-alt', 'ALGEBRAIC CALCULATOR', '/calculator')}
        {item('calendarBtn', 'fa-calendar-alt', 'ACADEMIC CALENDAR', sel && base + '/calendar', 'Please select your year first!')}
        {item('newsBtn', 'fa-newspaper', 'LATEST NEWS RTU', '/news')}
      </div>

      <div className="search-container">
        <div className="search-bar">
          <i className="fas fa-search search-icon"></i>
          <div className="search-placeholder" id="searchPlaceholder" style={{ display: q.trim() || focus ? 'none' : 'flex' }}>
            {[...'SEARCH'].map((ch, i) => <span key={i} className="search-letter" style={{ animationDelay: (i * 0.1).toFixed(1) + 's' }}>{ch}</span>)}
          </div>
          <input type="text" id="searchInput" aria-label="Search" value={q} onChange={e => setQ(e.target.value)}
            onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
            onKeyDown={e => { if (e.key === 'Enter') alert(q.trim() === '' ? 'Type something to search' : `Searching for: ${q}`); }} />
        </div>
      </div>

      <div className="selected-info" id="selectedInfo">
        <h3>{sel ? `${YEARS[sel.year - 1].label} · ${sel.branch}` : '👆 SELECT YOUR YEAR FIRST'}</h3>
      </div>

      <div className="action-grid">
        {CARDS.map(([key, id, icon, label, sub, onlyFirst]) => {
          const t = cardTarget(key, sel, base, onlyFirst);
          const inner = <><i className={'fas ' + icon}></i><span className="action-label">{label}</span><span className="action-sub">{sub}</span></>;
          return t.to
            ? <Link key={key} className="action-card" id={id} to={t.to}>{inner}</Link>
            : <div key={key} className="action-card" id={id} onClick={() => alert(t.msg)}>{inner}</div>;
        })}
      </div>

      <div className="platform-info">
        <div className="info-card">
          <div className="info-description">
            <i className="fas fa-quote-left" style={{ color: '#ffd966', marginRight: 10 }}></i>
            This platform is created to help students access important academic resources easily in one place. Here you will find a wide collection of useful study materials and tools designed to support your academic journey.
          </div>
          <div className="resources-grid">
            {RESOURCES.map(([icon, text]) => <div key={text} className="resource-item"><i className={'fas ' + icon}></i> <span>{text}</span></div>)}
          </div>
          <div style={{ marginTop: '2rem', fontStyle: 'italic', color: '#b2ceff', textAlign: 'center' }}>
            <i className="fas fa-star" style={{ color: '#ffd966' }}></i> Our goal is to provide students with a simple and organized platform where all essential academic resources are available in one place.
          </div>
        </div>
      </div>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-copyright">© 2026 ᴀʟʟ ʀɪɢʜᴛꜱ ʀᴇꜱᴇʀᴠᴇᴅ ✦ <i className="fas fa-heart heart"></i></div>
          <div className="footer-credit">✦ ᴅᴇꜱɪɢɴᴇᴅ & ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ <span className="coder">ᴄᴏᴅᴇʀ x</span> ✦</div>
          <div className="footer-links">
            <a href="#" className="footer-link" onClick={soon('Home')}><i className="fas fa-home"></i> ⌂ ʜᴏᴍᴇ</a>
            <a href="#" className="footer-link" onClick={soon('About')}><i className="fas fa-info-circle"></i> ᴀʙᴏᴜᴛ</a>
            <a href="#" className="footer-link" onClick={soon('Contact')}><i className="fas fa-envelope"></i> ᴄᴏɴᴛᴀᴄᴛ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// =====================================================================
//  OVERLAYS — URL ke hisaab se khulte hain, band karne par pichhle URL par
// =====================================================================
function Overlay({ id, close, top, narrow, children }) {
  return (
    <div id={id} className={'overlay show' + (top ? ' on-top' : '')}>
      <div className="drawer" style={narrow ? { maxWidth: 600 } : undefined}>
        <Link className="close-btn" to={close} aria-label="Close"><i className="fas fa-times"></i></Link>
        {children}
      </div>
    </div>
  );
}

// sabse upar wale overlay ka heading <h1> hota hai (Google ke liye)
function Title({ main, mb = '1.5rem', children, ...rest }) {
  const H = main ? 'h1' : 'h2';
  return <H style={{ color: '#ffd966', textAlign: 'center', marginBottom: mb, fontSize: '1.5em' }} {...rest}>{children}</H>;
}

function Overlays({ route, sel, base }) {
  // PYQ search tab tak yaad rahe jab tak PYQ khula hai
  const [pyqFilter, setPyqFilter] = useState('');
  const inPyq = route.kind === 'dash' && route.section === 'pyq';
  useEffect(() => { if (!inPyq) setPyqFilter(''); }, [inPyq]);

  if (route.kind === 'tool') {
    const t = route.tool;
    if (t === 'sgpa-calculator') return (
      <div id="sgpaOverlay" className="overlay show">
        <div className="drawer">
          <Link className="back-btn" id="backSgpa" to={base}><i className="fas fa-arrow-left"></i> Back</Link>
          <Link className="close-btn" id="closeSgpa" to={base} aria-label="Close"><i className="fas fa-times"></i></Link>
          <Sgpa />
        </div>
      </div>
    );
    if (t === 'calculator') return <Overlay id="calculatorOverlay" close={base}><Calculator /></Overlay>;
    if (t === 'map') return (
      <div id="mapOverlay" className="show">
        <Link className="close-map-overlay" id="closeMapOverlay" to={base} aria-label="Close"><i className="fas fa-times"></i></Link>
        <img className="map-image" id="mapImage" src="https://i.ibb.co/bSpjwTv/file-00000000c74c72088ac578e9d0627b0c.png" alt="RTU Campus Map" />
      </div>
    );
    if (t === 'news') return (
      <Overlay id="newsOverlay" close={base}>
        <Title main mb="2rem">📰 LATEST NEWS RTU</Title>
        {news.map(n => (
          <div key={n.title} className="news-item">
            <div className="news-date">📅 {n.date}</div>
            <div className="news-title">{n.title}</div>
            <div className="news-desc" dangerouslySetInnerHTML={{ __html: n.desc }}></div>
            <span className="news-badge">{n.badge}</span>
          </div>
        ))}
      </Overlay>
    );
    if (t === 'links') return (
      <Overlay id="linksOverlay" close={base}>
        <Title main mb="2rem">🔗 IMPORTANT RTU LINKS</Title>
        <div className="links-grid">
          {rtuLinks.map(l => (
            <a key={l.id} className="link-btn" id={l.id} href={l.link} target="_blank" rel="noopener">
              <i className={'fas ' + l.icon}></i><span>{l.name}</span><i className="fas fa-external-link-alt"></i>
            </a>
          ))}
        </div>
      </Overlay>
    );
    if (t === 'query') return (
      <Overlay id="queryOverlay" close={base}>
        <div className="query-content">
          <i className="fas fa-envelope-open-text"></i>
          <h2>HAVE A QUERY?</h2>
          <p>Send your questions, feedback, or suggestions to our official support email. We'll get back to you as soon as possible.</p>
          <div className="query-email"><i className="fas fa-envelope"></i> coderx01official@gmail.com</div>
          <p style={{ fontSize: '1rem', color: '#ffd966' }}>📬 We typically respond within 24-48 hours.</p>
        </div>
      </Overlay>
    );
    if (t === 'upload') return <Upload close={base} />;
  }

  if (route.kind !== 'dash' || !route.section) return null;
  const sec = route.section;

  if (sec === 'pyq') {
    const y = YEARS[route.year - 1], s = route.subject, list = `${base}/pyq`;
    // paper khula ho to sirf viewer (poori screen dhak leta hai)
    if (route.paper) return <PdfViewer key={route.paper} subj={s} file={route.paper} close={`${list}/${s.slug}`} />;
    return (
      <>
        <PyqList route={route} base={base} main={!s} filter={pyqFilter} setFilter={setPyqFilter}
          title={route.year === 1 ? '1ST YEAR PYQ - ALL SUBJECTS' : `${y.short} YEAR - ${route.branch} PYQ`} />
        {s && (
          <Overlay id="pyqFilesOverlay" close={list} top narrow>
            <Title main mb="0.6rem" id="pyqFilesTitle">{s.name}</Title>
            <p className="seo-line">
              RTU B.Tech {route.year === 1 ? y.nice : `${nice(route.branch)} ${y.nice}`} · Semester {parseInt(s.semester)} · {s.files.length} previous year question papers
            </p>
            <div id="pyqFilesList" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {s.files.map(f => (
                <Link key={f} className="subject-card" to={`${list}/${s.slug}/${paperSlug(s, f)}`}>
                  <span className="subject-name"><i className="fas fa-file-pdf" style={{ color: '#ff6b6b', marginRight: 8 }}></i>{paperName(f)}</span>
                  <i className="fas fa-eye" style={{ color: '#3f7eff', opacity: 0.9 }}></i>
                </Link>
              ))}
            </div>
          </Overlay>
        )}
      </>
    );
  }

  if (sec === 'calendar') {
    const data = calendarData[route.sem];
    return (
      <Overlay id="calendarOverlay" close={base}>
        <Title main mb="1rem">📅 ACADEMIC CALENDAR 2025-26</Title>
        <div className="semester-selector" id="semesterSelector">
          {YEARS[route.year - 1].sems.map(n =>
            <Link key={n} className={'sem-btn' + (n === route.sem ? ' active' : '')} to={`${base}/calendar/semester-${n}`}>Semester {n}</Link>)}
        </div>
        <div id="calendarTableContainer">
          <h3 style={{ color: '#ffd966', textAlign: 'center', margin: '1rem 0' }}>{data.title}</h3>
          <table className="calendar-table">
            <thead><tr><th>Event</th><th>Date</th></tr></thead>
            <tbody>{data.events.map(e => <tr key={e[0]}><td>{e[0]}</td><td>{e[1]}</td></tr>)}</tbody>
          </table>
        </div>
      </Overlay>
    );
  }

  return (
    <>
      <SectionList sec={sec} base={base} main={!route.item} />
      {route.item && <ItemPage sec={sec} item={route.item} base={base} />}
    </>
  );
}

// ---------- PYQ: subject list ----------
function PyqList({ route, base, title, main, filter, setFilter }) {
  const subjects = pyqSubjects(route.year, route.branch);
  const f = filter.toLowerCase();
  return (
    <Overlay id="pyqR2Overlay" close={base}>
      <Title main={main} id="pyqR2Title">{title}</Title>
      <input type="text" className="subjects-search" id="pyqR2Search" placeholder="Search subject..." value={filter} onChange={e => setFilter(e.target.value)} />
      <div className="subjects-grid" id="pyqR2Grid">
        {subjects.filter(s => s.name.toLowerCase().includes(f)).map(s => (
          <Link key={s.slug} className="subject-card" to={`${base}/pyq/${s.slug}`}>
            <span className="subject-name">{s.name}</span>
            <span className="subject-credit" style={{ color: '#aac3ff' }}>{s.semester} | {s.files.length} papers</span>
          </Link>
        ))}
      </div>
    </Overlay>
  );
}

// ---------- PDF viewer (site ke andar) ----------
function PdfViewer({ subj, file, close }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const url = paperUrl(subj, file), name = paperName(file);
  return (
    <div id="pdfViewerOverlay">
      <div className="pdfv-bar">
        <div className="pdfv-name">
          <i className="fas fa-file-pdf"></i>
          <h1 id="pdfViewerName">{name}</h1>
        </div>
        <div className="pdfv-actions">
          <a id="pdfDownloadBtn" href={url} target="_blank" rel="noopener"><i className="fas fa-download"></i> Download</a>
          <Link id="closePdfViewer" to={close} aria-label="Close"><i className="fas fa-times"></i></Link>
        </div>
      </div>
      <iframe id="pdfViewerFrame" title={name} allowFullScreen
        src={ready ? 'https://docs.google.com/gview?url=' + encodeURIComponent(url) + '&embedded=true' : undefined}></iframe>
    </div>
  );
}

// ---------- 1st year: notes / lab / syllabus / books / cram / time table ----------
const SEC_UI = {
  notes: { id: 'notesOverlay', title: '1ST YEAR SUBJECT WISE NOTES', ph: '🔍 Search subject...' },
  lab: { id: 'labsOverlay', title: '1ST YEAR LAB WORK', ph: '🔍 Search lab...', sub: '60 MARKS INTERNAL (ASSIGNMENT, ATTENDANCE) AND 40 EXTERNAL (VIVA AND EXAM)' },
  syllabus: { id: 'syllabusOverlay', title: '1ST YEAR SYLLABUS SUBJECT WISE 📑', ph: '🔍 Search subject...', special: 'full-syllabus-card' },
  timetable: { id: 'timetableOverlay', title: '⏰ 1ST YEAR TIME TABLE', ph: '🔍 Search section...', special: 'timetable-special-card', plain: 'section-btn' },
  books: { id: 'booksOverlay', title: 'SUBJECT WISE BOOK 📕', ph: '🔍 Search subject...' },
  cram: { id: 'cramOverlay', title: '1 DAY CRAM · EXAM BOOSTER', ph: '🔍 Search subject...' }
};
const EXT = <i className="fas fa-external-link-alt"></i>;

function SectionList({ sec, base, main }) {
  const [filter, setFilter] = useState('');
  const ui = SEC_UI[sec], f = filter.toLowerCase();
  return (
    <Overlay id={ui.id} close={base}>
      <Title main={main} mb={ui.sub ? '0.5rem' : '1.5rem'}>{ui.title}</Title>
      {ui.sub && <p style={{ color: '#b2ceff', textAlign: 'center', marginBottom: '1.5rem', opacity: 0.8, fontSize: '0.9rem' }}>{ui.sub}</p>}
      <input type="text" className="subjects-search" placeholder={ui.ph} value={filter} onChange={e => setFilter(e.target.value)} />
      <div className="subjects-grid">
        {SECTIONS[sec].items.filter(it => it.name.toLowerCase().includes(f)).map(it => {
          // click: Drive link naye tab mein + site ka URL bhi us subject ka ho jata hai
          const props = { to: `${base}/${sec}/${it.slug}`, onClick: () => window.open(it.link, '_blank') };
          if (it.isSpecial) return <Link key={it.slug} {...props} className={ui.special}><i className="fas fa-star"></i><span>{it.name}</span>{EXT}</Link>;
          if (ui.plain) return <Link key={it.slug} {...props} className={ui.plain}><span>{it.name}</span>{EXT}</Link>;
          return (
            <Link key={it.slug} {...props} className="subject-card">
              <span className="subject-name">{it.name}</span>
              {it.credit ? <span className="subject-credit">[ {it.credit} CREDIT ]</span> : <i className="fas fa-external-link-alt" style={{ color: '#ffd966', opacity: 0.8 }}></i>}
            </Link>
          );
        })}
      </div>
    </Overlay>
  );
}

// ek subject ka apna page: /1styear/notes/engineering-physics
function ItemPage({ sec, item, base }) {
  const def = SECTIONS[sec];
  const more = Object.entries(SECTIONS)
    .filter(([k, d]) => k !== sec && d.items.some(x => x.slug === item.slug))
    .map(([k, d]) => [`${base}/${k}/${item.slug}`, d.word]);
  const pyq = parseRoute(`${base}/pyq/${item.slug}`);
  if (pyq && pyq.subject) more.unshift([pyq.path, 'PYQ Papers']);
  return (
    <Overlay id="itemOverlay" close={`${base}/${sec}`} top narrow>
      <Title main mb="0.6rem">{item.name}</Title>
      <p className="seo-line">RTU B.Tech 1st Year · {def.word}{item.credit ? ` · ${item.credit} credit` : ''}</p>
      <a className="link-btn" href={item.link} target="_blank" rel="noopener">
        <i className="fab fa-google-drive"></i><span>{def.open}</span>{EXT}
      </a>
      {more.length > 0 && (
        <>
          <p className="seo-line" style={{ margin: '1.5rem 0 0.8rem' }}>More for this subject</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {more.map(([to, word]) => (
              <Link key={to} className="subject-card" to={to}>
                <span className="subject-name">{word}</span><i className="fas fa-arrow-right" style={{ color: '#ffd966', opacity: 0.8 }}></i>
              </Link>
            ))}
          </div>
        </>
      )}
    </Overlay>
  );
}

// ---------- UPLOAD ----------
function Upload({ close }) {
  const [file, setFile] = useState('');
  const input = useRef(null);
  return (
    <Overlay id="uploadOverlay" close={close}>
      <Title main mb="1rem">📤 UPLOAD YOUR FILE</Title>
      <div className="upload-form">
        <div className="form-group">
          <label><i className="fas fa-user"></i> Your Email</label>
          <input type="email" id="uploadEmail" placeholder="enter your email address" />
        </div>
        <div className="form-group">
          <label><i className="fas fa-tag"></i> Subject (Optional)</label>
          <input type="text" id="uploadSubject" placeholder="e.g., Notes request, Assignment" />
        </div>
        <div className="form-group">
          <label><i className="fas fa-file"></i> Attach File (PDF, PNG, JPG)</label>
          <div className="file-input" onClick={() => input.current.click()}>
            <i className="fas fa-cloud-upload-alt"></i>
            <p id="fileName">{file || 'Click to browse or drag & drop'}</p>
            <input ref={input} type="file" id="fileInput" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }}
              onClick={e => e.stopPropagation()} onChange={e => setFile(e.target.files[0] ? e.target.files[0].name : '')} />
          </div>
        </div>
        <div className="form-group">
          <label><i className="fas fa-comment"></i> Message (Optional)</label>
          <textarea id="uploadMessage" rows="3" placeholder="write your message here..."></textarea>
        </div>
        <button className="send-btn" id="sendUploadBtn"><i className="fas fa-paper-plane"></i> SEND</button>
      </div>
    </Overlay>
  );
}

// =====================================================================
//  BROWSER START
// =====================================================================
if (isBrowser) {
  const root = document.getElementById('root');
  const app = <App initialPath={location.pathname} />;
  // build ke time bana hua HTML ho to usi ko chalu karo, warna naya banao
  if (root.hasChildNodes()) hydrateRoot(root, app); else createRoot(root).render(app);

  // ----- security -----
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    // Ctrl+S, Ctrl+U, Ctrl+P, Ctrl+Shift+I/J/C, F12
    if (e.key === 'F12' || (e.ctrlKey && !e.shiftKey && ['s', 'u', 'p'].includes(k)) || (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(k))) e.preventDefault();
  });
  document.addEventListener('dragstart', e => e.preventDefault());
  console.log('%c STOP!', 'color: red; font-size: 50px; font-weight: bold; text-shadow: 2px 2px black;');
  console.log('%c This browser feature is intended for developers. If someone told you to copy-paste something here, it is a scam and will give them access to your account.', 'color: white; font-size: 16px; background: #333; padding: 10px; border-radius: 5px;');
  console.log('%c rtuhub.in - All Rights Reserved', 'color: #3f7eff; font-size: 14px;');
}
