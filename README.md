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

Do model milkar kaam karte hain: **reader** (photo/scan -> text) aur **solver** (sawaal hal). Limit lage to apne aap agla model.
Code: `src/chat.jsx` (UI), `api/ai.js` (server), `api/_keys.js` (keys yahin se padhi jaati hain).

**Keys kabhi code/repo mein nahi.** Private jagah: Vercel > Settings > Environment Variables

| Name | Value |
|---|---|
| `RTUHUB_KEYS` | apni saari keys ek saath paste (NVIDIA `nvapi-`, Groq `gsk_`, Cerebras `csk-`, Gemini) — kisi bhi format mein |
| `RTUHUB_SECRET` | koi lamba random text (cookie sign karne ke liye) |

Phir Deployments > Redeploy. Jaanch: `/api/ai?diag=1` (kaunsa model chal raha hai; keys nahi dikhti).

**Model chunna:** chat ke neeche `Groq | Gemini` button. Jo chuna wo pehle chalta hai; uski saari keys ki limit khatam ho to apne aap doosra model.

**Bahut saari keys:** ek hi provider ki jitni chahe keys daal do (jaise 7 Groq + 7 Gemini). Har naye sawaal ko wo key milti hai
jis par pichhle 1 minute mein sabse kam kaam hua — 10 students ek saath = alag-alag keys. Kisi key ko 429 (limit) mile to
server ka `retry-after` jitna aaram (din ki limit khatam ho to 1 ghanta), tab tak agli key.

**Scan (photo wale) paper — tez raasta:** page padhne (OCR) ka alag step nahi. Sawaal ke hisaab se sahi page(s) ki photo
(Part A -> page 1-2, Part B -> beech ke, Part C -> aakhri 2) sawaal ke saath seedha Gemini ko jaati hai; wo ek hi call mein
padh kar jawab deta hai. Groq photo nahi dekhta, isliye scan paper par Groq chuna ho to bhi ye kaam Gemini karta hai.
Photo dekhne wala koi model na ho tabhi purana raasta (page padh kar text bhejna).

**Kam se kam request:**
- Part A ka sawaal pehle page se, Part C ka aakhri page se, Part B beech se dhundha jata hai; sawaal milte hi padhna band.
- AI ko poora page nahi, sirf wahi ek sawaal + part ka heading (marks) jata hai.
- Jawab cache: `Part A Q1 ka answer do` jaisa seedha sawaal ek baar AI se banta hai, phir sabko saved jawab (`api/_cache.js`).
  Har server ki memory mein hamesha; sab servers mein share karna ho to Vercel env `AI_CACHE_BUCKET` = R2 bucket ka naam
  (R2 token mein us bucket par write permission chahiye).
Koi key na ho to sirf ek bina-key wala free server (LLM7) chalta hai aur photo/scan phone par OCR se padhe jaate hain.

## AI Assistant (`/ai-assistant`, dashboard par PYQ ke neeche)

Poori screen ka chat. Student ke year/branch ke saare PYQ subjects aur syllabus jaanta hai:
- "DSA 2024 paper Part A Q1" -> wahi paper khol kar (scan ho to page ki photo) jawab, saath mein paper ka link.
- "OS syllabus batao" -> syllabus khol kar.
- "Linked list ka program do", koi concept / doubt -> normal AI jaisa (paper zaroori nahi).
Paper wale chat mein bhi ab paper se bahar ke sawaal chalte hain.

**Surakshit:** paper / syllabus usi domain-lock wale raaste se khulta hai (`/api/paper`, `/api/syllabus`: cookie + same-site);
AI ko sirf zaroori page jaata hai; keys sirf server par; AI sirf site ke andar ke link (`/2ndyear/...`) de sakta hai, file/storage link nahi.
Code: `src/chat.jsx` (`findTarget`, `assistantGather`, `assistantCatalog`), `src/app.jsx` (`AiAssistant`).

## Formula (maths / physics)

AI formula LaTeX mein likhta hai (`$2^4$`, `$$\frac{a}{b}$$`); chat mein KaTeX se paper jaisa dikhta hai (2⁴, bhinn upar-neeche, ∫, √, matrix).
KaTeX pehli baar formula aane par hi load hota hai (jsdelivr). Copy aur Answer PDF mein formula saaf Unicode text ban jata hai (`src/tex.js`).
Numerical ka jawab exam copy jaisa: Given, To find, Formula, Solution (har step alag line), Answer (box mein).

## Viewer

Paper site ke andar pdf.js se draw hota hai (`src/viewer.jsx`); pdf.js build ke time `dist/assets/pdfjs-<version>/` mein copy hota hai.

## Animated notes

Put each unit as `notes/<subject-name>/unit-N.html` (for example `notes/engineering-physics/unit-2.html`) and push.
The build lists them on its own and opens them inside the site at `/1styear/animated/<subject-name>/unit-N`.

## Syllabus (Cloudflare R2, private bucket `syllabus`)
Site bucket ki list khud padhti hai (`/api/syllabus?list=1`) aur file sirf rtuhub.in ke andar khulti hai (`/api/syllabus?p=...`).
Vercel → Settings → Environment Variables:
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (ya sirf syllabus ke liye `SYLLABUS_ACCESS_KEY_ID`, `SYLLABUS_SECRET_ACCESS_KEY`)
- `SYLLABUS_BUCKET` (default `syllabus`)
Folder: `BRANCH/2nd Year/<full>.pdf` aur `BRANCH/2nd Year/Subject Wise Syllabus/{Subjects,Lab}/<code> <name>.jpg`. 1st year ke liye `1ST YEAR/` folder.

## RTU news live (`/news`)

- `tools/news-live.mjs` har 2 ghante (GitHub Action `news-live.yml`) RTU ke exam portal **rtu.sumsraj.com** ke 3 page padhta hai:
  News & Events, Instructions & Notifications, Exam notice board (last dates + results). Data `news-data` branch par, site `/api/news` se padhti hai.
- **rtu.ac.in** bots ko Cloudflare challenge deta hai, isliye use seedha nahi kholte (captcha bypass nahi). Uske **naye notices Brave Search API** se aate hain:
  har 12 ghante 4 search (`site:rtu.ac.in ...`), mahine me ~240 search = Brave ke $5/month free credit ke andar. rtu.ac.in par bot ki ek bhi request nahi jaati.

**Brave key lagana (ek baar):**
1. https://api-dashboard.search.brave.com/register par account banao, "Search" plan chuno (card maangta hai; har mahine $5 free credit milta hai). Dashboard me usage limit $5 rakh do.
2. API Keys > key copy karo.
3. GitHub repo > Settings > Secrets and variables > Actions > New repository secret: Name `BRAVE_API_KEY`, Value = key.
4. Actions > "RTU news live check" > Run workflow. News page par "rtu.ac.in (via search)" hara ho jayega.

Key na ho to ye hissa band rehta hai, baaki news chalti rehti hai.
