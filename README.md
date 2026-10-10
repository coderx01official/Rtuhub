# rtuhub.in

RTU B.Tech notes, PYQ, syllabus, SGPA calculator — React app, har screen ka apna URL.

## Files

| File | Kya hai |
|---|---|
| `src/app.jsx` | Poora UI (React) + URL routing |
| `src/tools.jsx` | SGPA calculator + scientific calculator |
| `src/viewer.jsx` | Tez PDF viewer (pdf.js) |
| `api/` | Domain lock: cookie + paper gateway (Vercel functions) |
| `public/` | Favicon, logo, social image |
| `src/data.js` | Saara data (notes/lab/syllabus links, calendar, news) + URL aur SEO logic |
| `src/pyq.json` | PYQ papers ki list (branch → year → semester → subject → files) |
| `src/style.css` | Saara CSS. Rang/font badalne ho to upar `:root` ke tokens badlo |
| `src/index.html` | HTML ka dhancha (title/meta build ke time bharte hain) |
| `build.mjs` | Build: minified JS/CSS + har URL ka HTML page + `sitemap.xml` |

## URLs

```
/                                         intro + year select
/1styear                                  1st year dashboard
/1styear/pyq                              PYQ subjects
/1styear/pyq/engineering-physics          us subject ke papers
/1styear/pyq/engineering-physics/2025     paper viewer   (/pyq/physics/2025 bhi chalta hai)
/1styear/notes/engineering-physics        notes (lab, syllabus, books, cram, timetable bhi aise hi)
/2ndyear/cse/pyq/data-structures-and-algorithms/2025
/1styear/calendar/semester-2
/sgpa-calculator  /calculator  /news  /links  /query  /upload  /map
```

## Chalana

```
npm install
npm start        # build + http://localhost:4173
npm run build    # sirf dist/ banata hai (Vercel yahi chalata hai)
```

Naya subject / link jodna ho to `src/data.js` ya `src/pyq.json` mein add karo aur push karo —
naye URL, page title aur sitemap apne aap ban jate hain.

## Domain lock (papers sirf rtuhub.in par khulte hain)

- Site khulte hi `/api/session` ek signed cookie deta hai (HttpOnly, JS use padh nahi sakta).
- Paper `/api/paper` se aata hai. Wo tabhi file deta hai jab request isi site ke page se aayi ho aur cookie sahi ho.
  Copy ki hui site, doosre domain ka link, ya address bar mein seedha link: sab ko 403.
- Code: `api/_auth.js`, `api/session.js`, `api/paper.js`, `api/_r2.js`.

Poora taala lagane ke liye ye 3 kaam (ek baar):

1. **Vercel > Settings > Environment Variables:** `RTUHUB_SECRET` = koi lamba random text. Phir Redeploy.
2. **R2 bucket private karo** (Cloudflare > R2 > bucket > Settings > Public access band), ek read-only API token banao,
   aur Vercel mein daalo: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. Phir Redeploy.
3. `src/data.js` mein `PUBLIC_FALLBACK = false` karo, aur **GitHub repo private** karo.

Jab tak step 2 nahi hota, purana public R2 link kaam karta rahega (jise link pata hai wo file le sakta hai).

## AI chatbot (paper viewer mein)

Code: `src/chat.jsx` (UI) + `api/ai.js` (server). Keys **code mein nahi** hain — Vercel > Settings > Environment Variables mein daalo
(ek se zyada key ho to comma ya nayi line se alag), phir Redeploy:

| Naam | Kya |
|---|---|
| `GEMINI_KEYS` | Gemini keys — paper ki photo padhta hai (sabse zaroori) |
| `GROQ_KEYS` | Groq keys — tez, photo bhi padhta hai |
| `CEREBRAS_KEYS` | Cerebras key — bahut tez, sirf text |

Koi key na ho to bina-key wala free server (LLM7) chalta hai, par wo paper ki photo nahi padh sakta. Jaanch: `/api/ai?diag=1`.

## Viewer

Paper site ke andar pdf.js se draw hota hai (`src/viewer.jsx`); pdf.js build ke time `dist/assets/pdfjs-<version>/` mein copy hota hai.
