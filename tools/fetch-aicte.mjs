// AICTE dashboard se approved intake (official) - pehle endpoints probe karta hai, raw jawab save karta hai.
import fs from 'node:fs';
const OUT = 'aicte-raw'; fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT);
const UA = 'Mozilla/5.0 (compatible; rtuhub-data-fetch/1.0; +https://www.rtuhub.in)';
const B = 'https://facilities.aicte-india.org/dashboard/pages/php/';
const tries = [];
for (const year of ['2025-2026', '2024-2025']) {
  for (const program of ['1', 'Engineering and Technology', 'Engineering%20and%20Technology']) {
    tries.push(`${B}approvedinstituteserver.php?method=fetchdata&year=${year}&program=${program}&level=1&institutiontype=1&Women=1&Minority=1&state=Rajasthan&course=1`);
    tries.push(`${B}approvedinstituteserver.php?method=fetchdata&year=${year}&program=${program}&level=UG&institutiontype=1&Women=1&Minority=1&state=Rajasthan&course=1`);
  }
}
tries.push('https://facilities.aicte-india.org/dashboard/pages/angulardashboard.php#!/approved');
tries.push('https://facilities.aicte-india.org/dashboard/pages/dashboardaicte.php');
const log = [];
let i = 0;
for (const u of tries) {
  try {
    const r = await fetch(u, { headers: { 'user-agent': UA, accept: '*/*' }, signal: AbortSignal.timeout(40000) });
    const t = await r.text();
    fs.writeFileSync(`${OUT}/${++i}.txt`, t.slice(0, 2e6));
    log.push({ i, u, status: r.status, len: t.length, head: t.slice(0, 300) });
  } catch (e) { log.push({ u, err: String(e) }); }
}
fs.writeFileSync(`${OUT}/log.json`, JSON.stringify(log, null, 1));
console.log(JSON.stringify(log.map(l => [l.i, l.status, l.len, l.err]), null, 0));
