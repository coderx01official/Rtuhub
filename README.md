# rtuhub.in

RTU B.Tech notes, PYQ, syllabus, SGPA calculator — React app, har screen ka apna URL.

## Files

| File | Kya hai |
|---|---|
| `src/app.jsx` | Poora UI (React) + URL routing |
| `src/tools.jsx` | SGPA calculator + scientific calculator |
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

## Download

Download button pehle file seedha R2 storage se uthata hai. Wo tabhi chalta hai jab R2 bucket ki CORS policy
mein `https://rtuhub.in` (GET) allowed ho. Na ho to file `rtuhub.in/dl/...` ke raste aati hai
(`vercel.json` ka rewrite), jo Vercel ka bandwidth use karta hai — isliye CORS on karna behtar hai.
