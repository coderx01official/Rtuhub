// =====================================================================
//  rtuhub.in — saara data + URL (route) logic ek hi file mein.
//  Naya subject / link jodna ho to bas neeche ki list mein line add karo.
//  PYQ papers ki list  src/pyq.json  mein hai.
// =====================================================================
import pyq from './pyq.json';
import anotes from './anotes.json';   // build.mjs notes/ folder se banata hai
export const ANOTES = anotes;        // [{ slug, name, units: [{ n, title, sub, heads }] }]

// ---------- 1st Year NOTES (Google Drive folders) ----------
export const notesItems = [
  { name: "ENGINEERING MATHEMATICS 1", link: "https://drive.google.com/drive/folders/1FeMyvuvx4eDaOcM0LRPBbR9tVVI6FA75" },
  { name: "ENGINEERING MATHEMATICS 2", link: "https://drive.google.com/drive/folders/1CHBrojkytAEIRvXo1-HujLzco2wzquPE" },
  { name: "ENGINEERING PHYSICS", link: "https://drive.google.com/drive/folders/1x-CPVHUu9oGqyGJCRQZFVkpugfZ-PE1a" },
  { name: "ENGINEERING CHEMISTRY", link: "https://drive.google.com/drive/folders/1fjzhpOCI-1XaoeYydfqoKGQ4GiDW0Z1C" },
  { name: "PROGRAMMING FOR PROBLEM SOLVING", link: "https://drive.google.com/drive/folders/1XrgHYAZGxv4cQU_hES8-x0REXTP-3hYM" },
  { name: "BASIC ELECTRICAL ENGINEERING", link: "https://drive.google.com/drive/folders/1TR4aY1laAzJNl1mSJDdwxwU-GDbyGjiM" },
  { name: "BASIC MECHANICAL ENGINEERING", link: "https://drive.google.com/drive/folders/1rxATeXSkekYwa_B8uhxODU2ZY4yPt-1u" },
  { name: "BASIC CIVIL ENGINEERING", link: "https://drive.google.com/drive/folders/1GNxRuh4zogs2kcX28rm645k22hz0s_QB" },
  { name: "HUMAN VALUE", link: "https://drive.google.com/drive/folders/1Zq1odOJIIWX84xMo0HFxMijIluLuA-78" },
  { name: "COMMUNICATION SKILL", link: "https://drive.google.com/drive/folders/1VRG80GktQnmloY7SxjKlLxJviseQuRBr" }
];

// ---------- 1st Year LABS (credits ke saath) ----------
export const labs = [
  { name: "COMPUTER AIDED MACHINE DRAWING [CAMD]", link: "https://drive.google.com/drive/folders/1qgmqjxGK32f2dJxturNdC2JzYrHwdQpL", credit: 1.5 },
  { name: "COMPUTER AIDED ENGINEERING GRAPHICS [CAEG]", link: "https://drive.google.com/drive/folders/1OZJZFLnke-rNW8T3EMFgbhV7KH-OI9xT", credit: 1.5 },
  { name: "MANUFACTURING PRACTICES WORKSHOP [MPW]", link: "https://drive.google.com/drive/folders/1J70F8OPEZEe5Ig3pfOfb80yN1CmBGgtF", credit: 1.5 },
  { name: "COMPUTER PROGRAMMING LAB [CP LAB]", link: "https://drive.google.com/drive/folders/1LfeRkwI2vBE0NWW1cueI46ZKB5SQwjQK", credit: 1.5 },
  { name: "PHYSICS LAB", link: "https://drive.google.com/drive/folders/1G8xumENwNlJkex0w7ZmrNm72nMXpuacY", credit: 1 },
  { name: "CHEMISTRY LAB", link: "https://drive.google.com/drive/folders/1O0Htm7mtWVeYIJVH36XfpMPnTRnQfKoF", credit: 1 },
  { name: "BASIC CIVIL ENGINEERING LAB [BCE LAB]", link: "https://drive.google.com/drive/folders/1-GDR3bgE1bnAfXGWBECcWfsOykJzvpie", credit: 1 },
  { name: "BASIC ELECTRICAL ENGINEERING LAB [BEE LAB]", link: "https://drive.google.com/drive/folders/1HgMh2J1f0LJGwy22AO__SdsFIjm1eQxq", credit: 1 },
  { name: "HUMAN VALUES ACTIVITIES [HV LAB]", link: "https://drive.google.com/drive/folders/1aVIkSOiUl_XqdJxDo3t_dGR2yLcerzDc", credit: 1 },
  { name: "LANGUAGE LAB [LANG. LAB]", link: "https://drive.google.com/drive/folders/1GvDzmrcxFWPMmviJypPCp5lNfixtQUh_", credit: 1 }
];

// ---------- 1st Year SYLLABUS ----------
export const syllabusItems = [
  { name: "FULL SYLLABUS 🌟", link: "https://drive.google.com/file/d/1cux1HdHUSw0jk7vxli-Y6R6ZmGL1evJy/view?usp=drivesdk", isSpecial: true },
  { name: "ENGINEERING MATHEMATICS 1", link: "https://drive.google.com/file/d/1VYKvNLJhr0jAYyXqPIYE72qC3bzcsKXq/view?usp=drivesdk" },
  { name: "ENGINEERING MATHEMATICS 2", link: "https://drive.google.com/file/d/121NdbGo0B6vIHgdMqWQCMcqwq0T8mwlU/view?usp=drivesdk" },
  { name: "ENGINEERING PHYSICS", link: "https://drive.google.com/file/d/1NX4T9hWoU8UahnGt6tdyC2rGZxaskMSq/view?usp=drivesdk" },
  { name: "ENGINEERING CHEMISTRY", link: "https://drive.google.com/file/d/1jpgbf72X2t1wxf7RZIgc0rXV0wHRYWkB/view?usp=drivesdk" },
  { name: "PROGRAMMING FOR PROBLEM SOLVING", link: "https://drive.google.com/file/d/1Fnm1gSoo5p64O8Cfg0Eneexx7Ju4fllQ/view?usp=drivesdk" },
  { name: "BASIC ELECTRICAL ENGINEERING", link: "https://drive.google.com/file/d/1yPm1YJW8SgJSkn4FxqIUM3g39JwL42ya/view?usp=drivesdk" },
  { name: "BASIC MECHANICAL ENGINEERING", link: "https://drive.google.com/file/d/15-uzjIltSGxpwsPxSD_zA0LsylFz8Dfr/view?usp=drivesdk" },
  { name: "BASIC CIVIL ENGINEERING", link: "https://drive.google.com/file/d/1KZD0ANkUsz8v_x0J0nsISlCXt0Sc4CVI/view?usp=drivesdk" },
  { name: "HUMAN VALUE", link: "https://drive.google.com/file/d/1oVAJxAjJFmTmkV94XLI7tXYOTGlyKuwg/view?usp=drivesdk" },
  { name: "COMMUNICATION SKILL", link: "https://drive.google.com/file/d/1SXiIsh7qjoX6gfOH2Bt3W2uf6_mUuwDP/view?usp=drivesdk" }
];

// ---------- 1st Year TIME TABLE ----------
export const timetableItems = [
  { name: "📅 A-J FULL TIME TABLE", link: "https://drive.google.com/file/d/1HyR44_un0QKomGlsF_72bqpSDNsg2pL8/view?usp=drivesdk", isSpecial: true },
  { name: "📝 MID TERM-1 TIME TABLE (ONLY A SECTION)", link: "https://drive.google.com/file/d/1ttE66EyoLR5iceibzB9qynhx9jrT_O6r/view?usp=drivesdk", isSpecial: true },
  { name: "SECTION A", link: "https://drive.google.com/file/d/1DVGSfSYMgHnHlqwTsR7MWZDbW51lW5mg/view?usp=drivesdk" },
  { name: "SECTION B", link: "https://drive.google.com/file/d/1cbjvPSrwDOdV3JJVzEh3RK_Eik7NkVZL/view?usp=drivesdk" },
  { name: "SECTION C", link: "https://drive.google.com/file/d/1CBbVS2di83S65npxjlaA1_5Zqjym9eEN/view?usp=drivesdk" },
  { name: "SECTION D", link: "https://drive.google.com/file/d/12Ezh4TGa4PY8_-CxIDu1OEUjhFB_Szhz/view?usp=drivesdk" },
  { name: "SECTION E", link: "https://drive.google.com/file/d/1Wu-QSCdrRNoPYTKLsedNGmpDJO6Cxkp4/view?usp=drivesdk" },
  { name: "SECTION F", link: "https://drive.google.com/file/d/1j6tu4sW4ubGgD00EWYkyNF0f38N7f0I4/view?usp=drivesdk" },
  { name: "SECTION G", link: "https://drive.google.com/file/d/1FFo9rCoGH3LwUBX0DGY9hp-E2inGDqtw/view?usp=drivesdk" },
  { name: "SECTION H", link: "https://drive.google.com/file/d/16DU7UXV_cc0G9VkFlbdNnfZjde2kErhB/view?usp=drivesdk" },
  { name: "SECTION I", link: "https://drive.google.com/file/d/14jPeXMXD0aECSg_5W1ldZXo_Em5-cmEZ/view?usp=drivesdk" },
  { name: "SECTION J", link: "https://drive.google.com/file/d/1ZRndxiU50xbGhXNOfKToL9RYhV_HAiYh/view?usp=drivesdk" }
];

// ---------- 1st Year BOOKS ----------
export const booksItems = [
  { name: "ENGINEERING MATHEMATICS 1", link: "https://drive.google.com/file/d/1vWocZLlYCQTtaMtMLWTlsB29q9HDmpq5/view?usp=drivesdk" },
  { name: "ENGINEERING MATHEMATICS 2", link: "https://drive.google.com/file/d/1oobMhZE7y-bGnT-yOOhAVa8tOC_oqXKp/view?usp=drivesdk" },
  { name: "ENGINEERING PHYSICS", link: "https://drive.google.com/file/d/1zQuMeWPOwMf1bM5U0EQildpc2-_kdGRb/view?usp=drivesdk" },
  { name: "ENGINEERING CHEMISTRY", link: "https://drive.google.com/file/d/1OzE1GJ6CPMxyxTsgKQHG0lwbH8Z_dqIe/view?usp=drivesdk" },
  { name: "PROGRAMMING FOR PROBLEM SOLVING", link: "https://drive.google.com/file/d/15iOJxltVnwow12MJyUOO6a40tLNVLy1k/view?usp=drivesdk" },
  { name: "BASIC ELECTRICAL ENGINEERING", link: "https://drive.google.com/file/d/1yPpl5DHvS0E6Kztn0gA2Zm_8r6v-ZEQW/view?usp=drivesdk" },
  { name: "BASIC MECHANICAL ENGINEERING", link: "https://drive.google.com/file/d/1DkeMZYtlZ-H8MbGU73eIL3Lxc4Bvnmya/view?usp=drivesdk" },
  { name: "BASIC CIVIL ENGINEERING", link: "https://drive.google.com/file/d/1L8j5w_cQ-avVuAIM1jCd57_pZyYanJKV/view?usp=drivesdk" },
  { name: "HUMAN VALUE", link: "https://drive.google.com/file/d/1W180Ji16Kz_EikCFVvZWJlwOYE5Hflle/view?usp=drivesdk" },
  { name: "COMMUNICATION SKILLS", link: "https://drive.google.com/file/d/14LCWKQxwnHQ2KLpKnY2h70TG3NzI3nXI/view?usp=drivesdk" }
];

// ---------- 1-DAY CRAM ----------
export const cramItems = [
  { name: "ENGINEERING MATHEMATICS 1", link: "https://drive.google.com/file/d/10MqOnTZX48YpsorFtHsh_96zFL6M05l0/view?usp=drivesdk" },
  { name: "ENGINEERING MATHEMATICS 2", link: "https://drive.google.com/file/d/1BUFrlfOlL90TNY94JBr4aDrqwysvuBGs/view?usp=drivesdk" },
  { name: "ENGINEERING PHYSICS", link: "https://drive.google.com/file/d/1FBvpPmXcLiweWqmOy9LgKD5E4ASeJKqQ/view?usp=drivesdk" },
  { name: "ENGINEERING CHEMISTRY", link: "https://drive.google.com/file/d/1jNCcZWNzLS5bPlv_c-AO9ROWhypk-6E9/view?usp=drivesdk" },
  { name: "PROGRAMMING FOR PROBLEM SOLVING", link: "https://drive.google.com/file/d/1dRTrcDdLp1jSmY-SAQo8lIx_ROcVXO4b/view?usp=drivesdk" },
  { name: "BASIC ELECTRICAL ENGINEERING", link: "https://drive.google.com/file/d/19qlpnfGbYbyNbiTRccbirMUpVE2r-sgo/view?usp=drivesdk" },
  { name: "BASIC MECHANICAL ENGINEERING", link: "https://drive.google.com/file/d/1RPYggHqxzLY7k9itBO_pDVnyv41tHFHs/view?usp=drivesdk" },
  { name: "BASIC CIVIL ENGINEERING", link: "https://drive.google.com/file/d/1eHPPy2mlp6QI7YZPmJXx2gnvohKdwjyf/view?usp=drivesdk" },
  { name: "HUMAN VALUE", link: "https://drive.google.com/file/d/1pR-P1AKb6ORmhzBCmNE0CwtzqXMthcZE/view?usp=drivesdk" },
  { name: "COMMUNICATION SKILL", link: "https://drive.google.com/file/d/14W38EUa3qWDSGtyQrYD024V22TRJPJQ_/view?usp=drivesdk" }
];

// ---------- BRANCHES ----------
export const branches = [
  "COMPUTER SCIENCE AND ENGINEERING",
  "COMPUTER SCIENCE AND ENGINEERING (AI)",
  "ARTIFICIAL INTELLIGENCE AND DATA SCIENCE",
  "INFORMATION TECHNOLOGY",
  "ELECTRICAL ENGINEERING",
  "ELECTRICAL AND ELECTRONICS ENGINEERING",
  "ELECTRONICS AND COMMUNICATION ENGINEERING",
  "ELECTRONICS INSTRUMENTATION AND CONTROL ENGINEERING",
  "MECHANICAL ENGINEERING",
  "MECHATRONICS ENGINEERING",
  "CIVIL ENGINEERING",
  "CHEMICAL ENGINEERING",
  "PETROCHEMICAL ENGINEERING",
  "PETROLEUM ENGINEERING",
  "AERONAUTICAL ENGINEERING",
  "AGRICULTURAL ENGINEERING",
  "AUTOMOBILE ENGINEERING",
  "CERAMIC ENGINEERING",
  "MINING ENGINEERING",
  "PRODUCTION AND INDUSTRIAL ENGINEERING"
];

// ---------- ACADEMIC CALENDAR ----------
// Odd semester: session 2026-27 (naya). Even semester: 2026-27 abhi nahi aaya, isliye 2025-26 wala.
const ODD = ["Induction Program", "Commencement of Classes", "First Mid Term", "Second Mid Term", "Last Working Day", "Commencement of Practical Exams", "Commencement of Theory Exams"];
const odd = (...d) => ODD.map((name, i) => [name, d[i]]).filter(e => e[1]);
const EVEN_NOTE = 'The 2026-27 dates for even semesters are not announced yet. These are the 2025-26 dates.';
export const calendarData = {
  1: { title: "Semester I (Odd)", session: "2026-27", events: odd("01.08.2026", "18.08.2026", "15.10.2026", "30.11.2026", "19.12.2026", "21.12.2026", "08.01.2027"),
       prev: { session: "2025-26", events: odd("01.08.2025", "18.08.2025", "07.10.2025", "21.11.2025", "20.12.2025", "22.12.2025", "03.01.2026") } },
  2: { title: "Semester II (Even)", session: "2025-26", note: EVEN_NOTE, events: [["Commencement of Classes", "27.01.2026"], ["First Mid Term", "14.03.2026"], ["Second Mid Term", "18.04.2026"], ["Last Working Day", "05.05.2026"], ["Commencement of Practical Exams", "07.05.2026"], ["Commencement of Theory Exams", "21.05.2026"], ["Practical Training (After II Sem.)", "16.06.2026 to 30.06.2026"]] },
  3: { title: "Semester III (Odd)", session: "2026-27", events: odd("", "01.08.2026", "28.09.2026", "19.11.2026", "15.12.2026", "16.12.2026", "07.01.2027"),
       prev: { session: "2025-26", events: odd("", "01.07.2025", "26.08.2025", "06.10.2025", "21.11.2025", "27.11.2025", "02.01.2026") } },
  4: { title: "Semester IV (Even)", session: "2025-26", note: EVEN_NOTE, events: [["Commencement of Classes", "19.01.2026"], ["First Mid Term", "28.02.2026"], ["Second Mid Term", "28.03.2026"], ["Last Working Day", "15.04.2026"], ["Commencement of Practical Exams", "17.04.2026"], ["Commencement of Theory Exams", "29.04.2026"], ["Practical Training (After IV Sem.)", "15.05.2026 to 30.06.2026"]] },
  5: { title: "Semester V (Odd)", session: "2026-27", events: odd("", "06.07.2026", "31.08.2026", "12.10.2026", "13.11.2026", "16.11.2026", "27.11.2026"),
       prev: { session: "2025-26", events: odd("", "01.08.2025", "15.09.2025", "10.11.2025", "15.11.2025", "17.11.2025", "25.11.2025") } },
  6: { title: "Semester VI (Even)", session: "2025-26", note: EVEN_NOTE, events: [["Commencement of Classes", "01.01.2026"], ["First Mid Term", "24.02.2026"], ["Second Mid Term", "28.03.2026"], ["Last Working Day", "15.04.2026"], ["Commencement of Practical Exams", "17.04.2026"], ["Commencement of Theory Exams", "28.04.2026"], ["Practical Training (After VI Sem.)", "15.05.2026 to 30.06.2026"]] },
  7: { title: "Semester VII (Odd)", session: "2026-27", events: odd("", "06.07.2026", "31.08.2026", "12.10.2026", "13.11.2026", "16.11.2026", "26.11.2026"),
       prev: { session: "2025-26", events: odd("", "03.07.2025", "25.08.2025", "13.10.2025", "31.10.2025", "03.11.2025", "24.11.2025") } },
  8: { title: "Semester VIII (Even)", session: "2025-26", note: EVEN_NOTE, events: [["Commencement of Classes", "01.01.2026"], ["First Mid Term", "24.02.2026"], ["Second Mid Term", "28.03.2026"], ["Last Working Day", "15.04.2026"], ["Commencement of Practical Exams", "17.04.2026"], ["Commencement of Theory Exams", "21.04.2026"], ["Project (VIII)", "24.04.2026 to 01.05.2026 (Revised)"]] }
};

// ---------- IMPORTANT RTU LINKS ----------
export const rtuLinks = [
  { id: 'linkRtuOfficial', icon: 'fa-university', name: 'RTU OFFICIAL WEBSITE', link: 'https://rtu.sumsraj.com' },
  { id: 'linkRtuOfficial2', icon: 'fa-university', name: '2 RTU OFFICIAL WEBSITE', link: 'https://www.rtu.ac.in/index/index.php' },
  { id: 'linkAdmitCard', icon: 'fa-ticket-alt', name: 'ADMIT CARD', link: 'https://rtu.sumsraj.com/Exam/Exam_Material/Download_AdmitCard.aspx' },
  { id: 'linkResult', icon: 'fa-chart-line', name: 'RESULT', link: 'https://rtu.sumsraj.com/Exam/Report/DownloadGradesheet.aspx' }
];

// ---------- LATEST NEWS ----------
export const news = [
  { date: '10 March 2026', title: '1st Mid Term Exams for 1st Year Students', desc: 'The first mid-term examinations for all 1st year B.Tech students will be conducted from <strong>23rd March to 25th March</strong>. Please check your subject schedules and prepare accordingly.', badge: 'Important' },
  { date: '8 March 2026', title: 'Academic Calendar 2026-27 Released', desc: 'The academic calendar for the next session has been published. Check the "Academic Calendar" section for detailed dates.', badge: 'Update' },
  { date: '5 March 2026', title: 'Practical Exam Schedule for Even Semesters', desc: 'Practical exams for even semesters (II, IV, VI, VIII) will commence from 17th April 2026. Get your hall tickets from the department.', badge: 'Exam' },
  { date: '1 March 2026', title: 'RTU Innovation Cell Hackathon 2026', desc: 'Registrations open for the annual hackathon. Last date: 31st March. Win prizes and recognition!', badge: 'Event' }
];

// =====================================================================
//  SGPA CALCULATOR ka data + result-PDF parsing
// =====================================================================
export const GRADE_POINTS = {"A++":10,"A+":9,"A":8.5,"B+":8,"B":7.5,"C+":7,"C":6.5,"D+":6,"D":5.5,"E+":5,"E":4,"F":0};
export const SEMS = [
 {"Engineering Mathematics-I":4,"Engineering Chemistry":4,"Human Values":2,"Programming for Problem Solving":2,"Basic Civil Engineering":2,"Engineering Chemistry Lab":1,"Human Values Activities":1,"Computer Programming Lab":1.5,"Basic Civil Engineering Lab":1,"Computer Aided Engineering Graphics":1.5,"DECA":0.5},
 {"Engineering Mathematics-II":4,"Engineering Physics":4,"Communication Skills":2,"Basic Mechanical Engineering":2,"Basic Electrical Engineering":2,"Engineering Physics Lab":1,"Language Lab":1,"Manufacturing Practices Workshop":1.5,"Basic Electrical Engineering Lab":1,"Computer Aided Machine Drawing":1.5,"DECA":0.5},
 {"Advanced Engineering Mathematics":3,"Managerial Economics & Financial Accounting":2,"Digital Electronics":3,"Data Structures and Algorithms":3,"Object Oriented Programming":3,"Software Engineering":3,"Data Structures and Algorithms Lab":1.5,"Object Oriented Programming Lab":1.5,"Software Engineering Lab":1.5,"Digital Electronics Lab":1.5,"Industrial Training":1,"Social Outreach, Discipline & Extracurricular Activities":0.5},
 {"Discrete Mathematics Structure":3,"Technical Communication":2,"Microprocessor & Interfaces":3,"Database Management System":3,"Theory of Computation":3,"Data Communication and Computer Networks":3,"Microprocessor & Interfaces Lab":1,"Database Management System Lab":1.5,"Network Programming Lab":1.5,"Linux Shell Programming Lab":1,"Java Lab":1,"Social Outreach, Discipline & Extracurricular Activities":0.5},
 {"Information Theory & Coding":2,"Compiler Design":3,"Operating System":3,"Computer Graphics & Multimedia":3,"Analysis of Algorithms":3,"Human-Computer Interaction":2,"Computer Graphics & Multimedia Lab":1,"Compiler Design Lab":1,"Analysis of Algorithms Lab":1,"Advance Java Lab":1,"Industrial Training":2.5,"Social Outreach, Discipline & Extracurricular Activities":0.5},
 {"Digital Image Processing":2,"Machine Learning":3,"Information Security Systems":2,"Computer Architecture and Organization":3,"Artificial Intelligence":2,"Cloud Computing":3,"Distributed Systems":2,"Digital Image Processing Lab":1.5,"Machine Learning Lab":1.5,"Python Lab":1.5,"Mobile App Development Lab":1.5,"Social Outreach, Discipline & Extracurricular Activities":0.5},
 {"Environmental Engineering & Disaster Management":3,"Internet Of Things":3,"Internet Of Things Lab":2,"Cyber Security Lab":2,"Industrial Training":2.5,"Seminar":2,"Social Outreach, Discipline & Extracurricular Activities":0.5},
 {"Big Data Analytics":3,"Big Data Analytics Lab":2,"Software Testing & Validation Lab":1,"Project":7,"Social Outreach, Discipline & Extracurricular Activities":0.5,"Disaster Management":3}
];
export const MIN_PASS = "E";   // lowest passing grade
export const PASS_MARKS = 36;  // lowest passing total (mid-term + end-term, out of 100)
// total marks -> grade. Worked out from recent RTU results; not an official table.
export const MARK_BANDS = [[81,"A++"],[76,"A+"],[71,"A"],[67,"B+"],[63,"B"],[58,"C+"],[54,"C"],[50,"D+"],[46,"D"],[41,"E+"],[36,"E"]];
export function gradeFromMarks(m){ for (const [min, g] of MARK_BANDS) if (m >= min) return g; return "F"; }
export const CREDITS_TILL = {1:20.5,2:41,3:65.5,4:89,5:112,6:135.5,7:150.5,8:167};

const norm = s => s.toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]/g,"");
const ROMAN = {I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8};
const ROW_RE = /^(.+?)\s+(\d?[A-Z]{2,5}\d{0,2}-?\d{2})(?:\s+(.*?))?\s+(A\s?\+\s?\+|[A-E]\s?\+|[A-F]|AB)\s*$/;

function lookupCredits(title, code, sem){
  const key = norm(title);
  const order = [];
  if (sem) order.push(SEMS[sem-1]);
  SEMS.forEach(s => order.push(s));
  for (const s of order) for (const name in s) if (norm(name) === key) return {credits:s[name], sure:true};
  // title that starts with a known subject name, e.g. "Human Values Activities & Sports"
  let best = null;
  for (const s of order) for (const name in s){ const k = norm(name); if (k.length > 8 && key.startsWith(k) && (!best || k.length > best.k.length)) best = {k, c:s[name]}; }
  if (best) return {credits:best.c, sure:false};
  // activity-type courses (Sports, DECA, FEC codes) carry 0.5 credit in the RTU scheme
  if (/^FEC/i.test(code) || /sports|deca|social outreach|extracurricular|anandam|nss|ncc/i.test(title)) return {credits:0.5, sure:false};
  return {credits:null, sure:false};
}

export function parseResult(lines){
  const text = lines.join("\n");
  const out = {name:"", roll:"", sem:null, rows:[]};
  let m;
  if ((m = text.match(/B\.?\s*Tech\.?\s+([IVX]+)\s+SEM/i))) out.sem = ROMAN[m[1].toUpperCase()] || null;
  if ((m = text.match(/Roll\s*No\s*:\s*(\S+)/i))) out.roll = m[1];
  if ((m = text.match(/REMARKS\s*:\s*(PASS|FAIL)/i))) out.remark = m[1].toUpperCase();
  if ((m = text.match(/(?:^|\n)\s*Name\s*:\s*(.+?)\s+Father/i))) out.name = m[1].trim();
  for (const raw of lines){
const line = raw.replace(/\s+/g," ").trim();
const r = line.match(ROW_RE);
if (!r) continue;
let grade = r[4].replace(/\s/g,"");
if (grade === "AB") grade = "F";   // absent counts as fail
const code = r[2];
if (!out.sem && /^\d/.test(code)) out.sem = +code[0];
out.rows.push({title:r[1].trim(), code, grade, marks:(r[3] || "").match(/\d+/g) || []});
  }
  out.rows.forEach(r => Object.assign(r, lookupCredits(r.title, r.code, out.sem)));
  return out;
}

/* pdf.js text items -> visual lines */
export function itemsToLines(items){
  const rows = [];
  for (const it of items){
if (!it.str || !it.str.trim()) continue;
const x = it.transform[4], y = it.transform[5];
let row = rows.find(r => Math.abs(r.y - y) < 3);
if (!row){ row = {y, parts:[]}; rows.push(row); }
row.parts.push({x, s:it.str});
  }
  rows.sort((a,b) => b.y - a.y);
  return rows.map(r => r.parts.sort((a,b) => a.x - b.x).map(p => p.s).join(" "));
}

// =====================================================================
//  ROUTES  —  har screen ka apna URL, jaise /1styear/pyq/engineering-physics/2025
// =====================================================================
export const SITE = 'https://www.rtuhub.in';   // Vercel par www hi main domain hai (rtuhub.in -> www par jata hai)
export const R2_BASE = 'https://pub-b038a4e459b348ca866cf5ebc2e874ac.r2.dev/BTECH/';

export const YEARS = [
  { n: 1, slug: '1styear', label: '1ST YEAR', short: '1ST', nice: '1st Year', sems: [1, 2] },
  { n: 2, slug: '2ndyear', label: '2ND YEAR', short: '2ND', nice: '2nd Year', sems: [3, 4] },
  { n: 3, slug: '3rdyear', label: '3RD YEAR', short: '3RD', nice: '3rd Year', sems: [5, 6] },
  { n: 4, slug: '4thyear', label: '4TH YEAR', short: '4TH', nice: '4th Year', sems: [7, 8] }
];

// URL mein branch ka chhota naam
export const BRANCH_CODES = {
  "COMPUTER SCIENCE AND ENGINEERING": "cse",
  "COMPUTER SCIENCE AND ENGINEERING (AI)": "cse-ai",
  "ARTIFICIAL INTELLIGENCE AND DATA SCIENCE": "ai-ds",
  "INFORMATION TECHNOLOGY": "it",
  "ELECTRICAL ENGINEERING": "ee",
  "ELECTRICAL AND ELECTRONICS ENGINEERING": "eee",
  "ELECTRONICS AND COMMUNICATION ENGINEERING": "ece",
  "ELECTRONICS INSTRUMENTATION AND CONTROL ENGINEERING": "eic",
  "MECHANICAL ENGINEERING": "mechanical",
  "MECHATRONICS ENGINEERING": "mechatronics",
  "CIVIL ENGINEERING": "civil",
  "CHEMICAL ENGINEERING": "chemical",
  "PETROCHEMICAL ENGINEERING": "petrochemical",
  "PETROLEUM ENGINEERING": "petroleum",
  "AERONAUTICAL ENGINEERING": "aeronautical",
  "AGRICULTURAL ENGINEERING": "agricultural",
  "AUTOMOBILE ENGINEERING": "automobile",
  "CERAMIC ENGINEERING": "ceramic",
  "MINING ENGINEERING": "mining",
  "PRODUCTION AND INDUSTRIAL ENGINEERING": "production"
};
const BRANCH_BY_CODE = Object.fromEntries(Object.entries(BRANCH_CODES).map(([name, code]) => [code, name]));

export const slug = s => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const SMALL = new Set(['AND', 'OF', 'FOR', 'IN', 'TO', 'THE', 'ON', 'WITH', 'BY']);
const KEEP = /^(?:[IVX]+|.{1,2}|AI|IT|CSE|RTU|PYQ|VLSI|CAD|CAM|CNC|CMOS|EHV|ERP|HVDC|IPR|MEMS|IOT|DBMS|[A-Z]+\d+)$/;
// "ENGINEERING PHYSICS-II" -> "Engineering Physics-II"
export const nice = s => s.replace(/[A-Z0-9]+/g, (w, i) =>
  (i && SMALL.has(w)) ? w.toLowerCase() : KEEP.test(w) ? w : w[0] + w.slice(1).toLowerCase());
// list item ka saaf naam: emoji hatao, [CAMD] jaise short form waise hi rakho
export const itemName = it => it.name.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim()
  .split(/(\[[^\]]*\])/).map((part, i) => i % 2 ? part : nice(part)).join('');

// 1st year ke Google Drive wale sections
export const SECTIONS = {
  notes:     { items: notesItems,     word: 'Notes',      open: 'Open notes' },
  lab:       { items: labs,           word: 'Lab Work',   open: 'Open lab files' },
  syllabus:  { items: syllabusItems,  word: 'Syllabus',   open: 'Open syllabus' },
  books:     { items: booksItems,     word: 'Book',       open: 'Open book' },
  cram:      { items: cramItems,      word: '1-Day Cram', open: 'Open cram notes' },
  timetable: { items: timetableItems, word: 'Time Table', open: 'Open time table' }
};
for (const sec of Object.values(SECTIONS)) for (const it of sec.items) it.slug = slug(it.name);

// Home page ke seedhe links (Google inhi se site ke hisse samajhta hai)
export const HOME_LINKS = [
  ['/sgpa-calculator', 'calculator', 'SGPA Calculator'], ['/1styear/pyq', 'history', 'PYQ Papers'], ['/1styear/notes', 'book-open', 'Notes'],
  ['/1styear/animated', 'film', 'Animated Notes'], ['/1styear/syllabus', 'layer-group', 'Syllabus'], ['/1styear/lab', 'flask', 'Lab Work'], ['/1styear/books', 'book', 'Books'],
  ['/1styear/cram', 'rocket', '1-Day Cram'], ['/1styear/timetable', 'clock', 'Time Table'], ['/1styear/calendar', 'calendar-alt', 'Academic Calendar'],
  ['/news', 'newspaper', 'RTU News'], ['/links', 'link', 'Result & Admit Card'], ['/map', 'map-marked-alt', 'Campus Map']
];

export const TOOLS = ['sgpa-calculator', 'calculator', 'news', 'links', 'query', 'upload', 'map', 'about', 'contact'];

// ----- PYQ -----
const pyqCache = {};
// ek year (+branch) ke saare subjects jinke papers hain
export function pyqSubjects(year, branch) {
  const key = year + '|' + branch;
  if (pyqCache[key]) return pyqCache[key];
  const y = YEARS[year - 1];
  const yearData = year === 1 ? pyq.first : (pyq.branches[branch] || {})[y.label];
  const list = [];
  for (const sem in yearData || {}) {
    for (const s of yearData[sem]) {
      if (s.f && s.f.length) list.push({ name: s.n, files: s.f, semester: sem, branch: year === 1 ? '' : branch, year: y.label, slug: slug(s.n) });
    }
  }
  // sabse naya paper sabse upar: 2026, 2025, 2025-2, 2024 ...
  for (const s of list) {
    const key = f => { const [y, n] = paperSlug(s, f).split('-'); return [+y || 0, +n || 1]; };
    s.files = [...s.files].sort((a, b) => key(b)[0] - key(a)[0] || key(a)[1] - key(b)[1]);
  }
  // same naam do baar ho to URL alag rakho
  const count = {};
  list.forEach(s => { count[s.slug] = (count[s.slug] || 0) + 1; });
  list.forEach(s => { if (count[s.slug] > 1) s.slug += '-sem-' + parseInt(s.semester); });
  const seen = {};
  list.forEach(s => { seen[s.slug] = (seen[s.slug] || 0) + 1; if (seen[s.slug] > 1) s.slug += '-' + seen[s.slug]; });
  return (pyqCache[key] = list);
}

// Abhi ke (latest) syllabus wale subject upar, purane naam wale neeche.
// 1st year: RTU ke abhi ke 10 subject. Baaki years: jinke paper pichhle 2 saal mein aaye.
const FIRST_NOW = ['ENGINEERING MATHEMATICS-I', 'ENGINEERING MATHEMATICS-II', 'ENGINEERING PHYSICS', 'ENGINEERING CHEMISTRY', 'PROGRAMMING FOR PROBLEM SOLVING',
  'BASIC ELECTRICAL ENGINEERING', 'BASIC MECHANICAL ENGINEERING', 'BASIC CIVIL ENGINEERING', 'HUMAN VALUES', 'COMMUNICATION SKILLS'];
export function splitCurrent(list, year) {
  if (year === 1) {
    const now = FIRST_NOW.map(n => list.find(s => s.name === n)).filter(Boolean);
    return { now, old: list.filter(s => !now.includes(s)) };
  }
  const last = s => Math.max(0, ...s.files.map(f => +f.slice(0, 4) || 0));
  const top = Math.max(0, ...list.map(last));
  const now = list.filter(s => last(s) >= top - 1);
  return { now, old: list.filter(s => !now.includes(s)) };
}

// "2025-ENGINEERING PHYSICS-2.pdf" -> "2025-2"
export function paperSlug(subj, file) {
  const base = file.replace(/\.pdf$/i, '');
  if (/^\d{4}-/.test(base) && base.slice(5).startsWith(subj.name)) {
    const tail = base.slice(5 + subj.name.length);
    if (/^(-\d+)?$/.test(tail)) return base.slice(0, 4) + tail;
  }
  return slug(base);
}
export const paperName = file => file.replace(/\.pdf$/i, '');
const paperPath = (subj, file) => [subj.branch, subj.year, subj.semester, subj.name, file].filter(Boolean).map(encodeURIComponent).join('/');
export const paperUrl = (subj, file) => R2_BASE + paperPath(subj, file);
// DOMAIN LOCK: paper apni site ke /api/paper se aata hai (cookie + same-site check, dekho api/paper.js)
export const paperApiUrl = (subj, file, download) =>
  '/api/paper?p=' + encodeURIComponent([subj.branch, subj.year, subj.semester, subj.name, file].filter(Boolean).join('/')) + (download ? '&dl=1' : '');
// Jab tak R2 bucket public hai, /api/paper na chale to seedha storage se. Bucket private karne ke baad ise false kar do.
export const PUBLIC_FALLBACK = true;

// papers ko saal ke hisaab se: [{ year: '2026', papers: [{ file, slug, n }] }, ...]
export function paperGroups(subj) {
  const groups = [];
  for (const file of subj.files) {
    const ps = paperSlug(subj, file), [year, n] = ps.split('-');
    let g = groups[groups.length - 1];
    if (!g || g.year !== year) groups.push(g = { year, papers: [] });
    g.papers.push({ file, slug: ps, n: +n || 1 });
  }
  return groups;
}
// "Engineering Physics 2025, paper 2"
export function paperTitle(subj, file) {
  const [year, n] = paperSlug(subj, file).split('-');
  const many = subj.files.filter(f => paperSlug(subj, f).split('-')[0] === year).length > 1;
  return `${nice(subj.name)} ${year}${many ? ', paper ' + (n || 1) : ''}`;
}

function findSubject(list, s) {
  return list.find(x => x.slug === s)
    || list.find(x => x.slug === 'engineering-' + s)          // /pyq/physics -> engineering-physics
    || (list.filter(x => x.slug.includes(s)).length === 1 ? list.find(x => x.slug.includes(s)) : null);
}

export const dashPath = (year, branch) =>
  '/' + YEARS[year - 1].slug + (year === 1 ? '' : '/' + BRANCH_CODES[branch]);

// URL -> route. Galat URL par null.
export function parseRoute(pathname) {
  let seg;
  try { seg = decodeURIComponent(pathname).toLowerCase().split('/').filter(Boolean); } catch (e) { return null; }
  if (!seg.length) return { kind: 'home', path: '/' };
  if (seg.length === 1 && TOOLS.includes(seg[0])) return { kind: 'tool', tool: seg[0], path: '/' + seg[0] };
  const y = YEARS.find(v => v.slug === seg[0]);
  if (!y) return null;
  let i = 1, branch = 'COMMON';
  if (y.n > 1) {
    if (seg.length === 1) return { kind: 'branch', year: y.n, path: '/' + y.slug };
    branch = BRANCH_BY_CODE[seg[1]];
    if (!branch) return null;
    i = 2;
  }
  const base = dashPath(y.n, branch);
  const r = { kind: 'dash', year: y.n, branch, base, path: base };
  const [sec, a, b, extra] = seg.slice(i);
  if (!sec) return r;
  if (extra) return null;
  r.section = sec;
  r.path += '/' + sec;

  if (sec === 'pyq') {
    const list = pyqSubjects(y.n, branch);
    if (!list.length) return null;
    if (!a) return r;
    const subj = findSubject(list, a);
    if (!subj) return null;
    r.subject = subj;
    r.path += '/' + subj.slug;
    if (!b) return r;
    const file = subj.files.find(f => paperSlug(subj, f) === b) || subj.files.find(f => paperSlug(subj, f).startsWith(b));
    if (!file) return null;
    r.paper = file;
    r.path += '/' + paperSlug(subj, file);
    return r;
  }
  if (sec === 'animated') {   // /1styear/animated/engineering-chemistry/unit-3
    if (y.n !== 1 || !ANOTES.length) return null;
    if (!a) return r;
    const hits = ANOTES.filter(x => x.slug.includes(a));
    const note = ANOTES.find(x => x.slug === a) || (hits.length === 1 ? hits[0] : null);
    if (!note) return null;
    r.note = note;
    r.path += '/' + note.slug;
    if (!b) return r;
    const m = b.match(/^unit-(\d+)$/), unit = m && note.units.find(u => u.n === +m[1]);
    if (!unit) return null;
    r.unit = unit;
    r.path += '/unit-' + unit.n;
    return r;
  }
  if (sec === 'calendar') {
    if (b) return null;
    r.sem = y.sems[0];
    if (!a) return r;
    const m = a.match(/^semester-(\d)$/);
    if (!m || !y.sems.includes(+m[1])) return null;
    r.sem = +m[1];
    r.path += '/' + a;
    return r;
  }
  if (sec === 'syllabus') {   // /2ndyear/cse/syllabus/digital-electronics  (list browser mein bucket se aati hai)
    if (b) return null;
    if (!a) return r;
    if (!/^[a-z0-9-]{2,90}$/.test(a)) return null;
    r.slug = a;
    r.item = y.n === 1 ? SECTIONS.syllabus.items.find(x => x.slug === a) : undefined;
    r.path += '/' + a;
    return r;
  }
  if (y.n === 1 && SECTIONS[sec]) {
    if (b) return null;
    if (!a) return r;
    const item = SECTIONS[sec].items.find(x => x.slug === a);
    if (!item) return null;
    r.item = item;
    r.path += '/' + item.slug;
    return r;
  }
  return null;
}

// Galat / adhoora URL ho to sabse paas wala sahi page
export function resolveRoute(pathname) {
  const seg = String(pathname || '/').split('/').filter(Boolean);
  for (let n = seg.length; n > 0; n--) {
    const r = parseRoute('/' + seg.slice(0, n).join('/'));
    if (r) return r;
  }
  return { kind: 'home', path: '/' };
}

// ----- SEO: har page ka apna title + description -----
const TOOL_SEO = {
  'sgpa-calculator': ['RTU SGPA Calculator – Result PDF Upload or Grade Wise', 'Free RTU SGPA and CGPA calculator. Upload your RTU result PDF or enter grades / marks subject wise and get your SGPA instantly, with backlog prediction.'],
  calculator: ['Scientific Calculator for Engineering Students', 'Online scientific calculator with sin, cos, tan, log, ln, powers, roots and factorial for RTU B.Tech students.'],
  news: ['Latest RTU News – Exams, Mid Terms & Updates', 'Latest Rajasthan Technical University (RTU) news: mid term dates, practical exam schedule, academic calendar updates and events.'],
  links: ['Important RTU Links – Official Website, Admit Card & Result', 'Direct links to the RTU official website, admit card download and RTU result / grade sheet pages.'],
  about: ['About rtuhub.in – Why It Exists & B.Tech Roadmap', 'Why rtuhub.in was built for RTU students, what it offers, and a year by year B.Tech roadmap (1st to 4th year) focused on real skills.'],
  contact: ['Contact rtuhub.in', 'Contact the rtuhub.in team by email for missing papers, corrections, suggestions or collaboration.'],
  query: ['Query & Support', 'Have a question, feedback or suggestion? Contact the rtuhub.in team.'],
  upload: ['Upload Notes or PDF', 'Share your notes, assignments or PYQ PDFs with rtuhub.in so that other RTU students can use them.'],
  map: ['RTU Campus Map', 'Rajasthan Technical University (RTU) Kota campus map for easy navigation.']
};
const SEC_SEO = {
  notes: ['Notes', 'subject wise notes PDF'],
  lab: ['Lab Work, Manuals & Viva', 'lab manuals, files and viva questions'],
  syllabus: ['Syllabus', 'subject wise syllabus PDF'],
  books: ['Books PDF', 'subject wise books and reference PDF'],
  cram: ['1-Day Cram Notes', 'one day before exam revision notes'],
  timetable: ['Time Table', 'section wise class time table']
};
// "COMPUTER SCIENCE AND ENGINEERING" -> "CSE", "MECHANICAL ENGINEERING" -> "Mechanical"
export const branchShort = b => {
  const c = BRANCH_CODES[b];
  return c === 'cse-ai' ? 'CSE (AI)' : c === 'ai-ds' ? 'AI & DS' : c.length <= 3 ? c.toUpperCase() : nice(b).replace(/ Engineering$/, '');
};
const years = files => {
  const ys = [...new Set(files.map(f => f.slice(0, 4)).filter(v => /^\d{4}$/.test(v)))].sort();
  return ys.length > 1 ? ys[0] + '–' + ys[ys.length - 1] : (ys[0] || '');
};

const titleFromSlug = s => s.split('-').map(w => /^(i{1,3}|iv|ai|it|lab|ii)$/.test(w) ? (w === 'lab' ? 'Lab' : w.toUpperCase()) : SMALL.has(w.toUpperCase()) ? w : w[0].toUpperCase() + w.slice(1)).join(' ');

export function seo(r) {
  const tail = ' | rtuhub.in';
  let title, desc, crumbs = [];
  if (r.kind === 'home') {
    title = 'RTU Hub – RTU B.Tech Notes, PYQ Papers, Syllabus & SGPA Calculator';
    desc = 'rtuhub.in – RTU (Rajasthan Technical University) B.Tech notes, previous year question papers (PYQ), syllabus, lab work, books, academic calendar and SGPA calculator for all branches and years.';
    return { title: title + tail, desc, crumbs };
  }
  if (r.kind === 'tool') {
    [title, desc] = TOOL_SEO[r.tool];
    return { title: title + tail, desc, crumbs: [[title.split(' – ')[0], r.path]] };
  }
  const y = YEARS[r.year - 1];
  if (r.kind === 'branch') {
    title = `RTU ${y.nice} B.Tech – Select Branch for PYQ & Study Material`;
    desc = `Choose your branch to get RTU B.Tech ${y.nice} previous year question papers (PYQ), academic calendar and study material.`;
    return { title: title + tail, desc, crumbs: [[y.nice, r.path]] };
  }
  const br = r.year === 1 ? '' : nice(r.branch);
  const code = r.year === 1 ? '' : branchShort(r.branch);
  const who = r.year === 1 ? y.nice : `${code} ${y.nice}`;
  crumbs.push([y.nice, '/' + y.slug]);
  if (r.year > 1) crumbs.push([br, r.base]);

  if (!r.section) {
    title = r.year === 1 ? 'RTU 1st Year Notes, PYQ, Syllabus, Lab Work & Books' : `RTU ${who} PYQ & Study Material – ${br}`;
    desc = r.year === 1
      ? 'RTU B.Tech 1st year study material: subject wise notes, previous year question papers (PYQ), syllabus, lab work, books, 1-day cram notes, time table and academic calendar.'
      : `RTU B.Tech ${br} ${y.nice} (${code}) previous year question papers (PYQ), academic calendar and study resources.`;
  } else if (r.section === 'pyq') {
    crumbs.push(['PYQ', r.base + '/pyq']);
    if (r.subject) {
      const s = r.subject, sn = nice(s.name), sem = parseInt(s.semester);
      crumbs.push([sn, r.base + '/pyq/' + s.slug]);
      if (r.paper) {
        const pn = paperSlug(s, r.paper).replace(/-(\d+)$/, ' (Paper $1)');
        title = `RTU ${sn} ${pn} Question Paper PDF – ${who} PYQ`;
        desc = `View and download the RTU B.Tech ${sn} ${pn} previous year question paper (${who}, Semester ${sem}) as PDF.`;
        crumbs.push([pn, r.path]);
      } else {
        title = `RTU ${sn} PYQ – ${who} Previous Year Question Papers PDF`;
        desc = `RTU B.Tech ${sn} previous year question papers (${who}, Semester ${sem}): ${s.files.length} papers${years(s.files) ? ' from ' + years(s.files) : ''}. View online or download PDF.`;
      }
    } else {
      const n = pyqSubjects(r.year, r.branch).length;
      title = `RTU ${who} PYQ – Previous Year Question Papers (All Subjects)`;
      desc = `RTU B.Tech ${r.year === 1 ? y.nice : br + ' ' + y.nice} previous year question papers (PYQ) for ${n} subjects, semester wise. View online or download PDF.`;
    }
  } else if (r.section === 'animated') {
    crumbs.push(['Animated Notes', r.base + '/animated']);
    if (r.note) crumbs.push([r.note.name, `${r.base}/animated/${r.note.slug}`]);
    if (r.unit) {
      const topics = r.unit.heads.slice(0, 5).map(h => h.replace(/^\d+\.\s*/, '')).join(', ');
      title = `${r.note.name} Unit ${r.unit.n} Animated Notes – ${r.unit.title}`;
      desc = `RTU B.Tech 1st year ${r.note.name} Unit ${r.unit.n} (${r.unit.title}) animated notes with diagrams${topics ? ': ' + topics : ''}.`;
      crumbs.push(['Unit ' + r.unit.n, r.path]);
    } else if (r.note) {
      title = `RTU ${r.note.name} Animated Notes – Unit Wise (1st Year)`;
      desc = `RTU B.Tech 1st year ${r.note.name} animated notes, unit wise with diagrams: ${r.note.units.map(u => 'Unit ' + u.n + ' ' + u.title).join(', ')}.`;
    } else {
      title = 'RTU 1st Year Animated Notes – Unit Wise with Diagrams';
      desc = `Animated unit wise notes for RTU B.Tech 1st year: ${ANOTES.map(n => n.name).join(', ')}. Read them online on rtuhub.in.`;
    }
  } else if (r.section === 'calendar') {
    const session = calendarData[r.sem].session;
    title = `RTU Academic Calendar ${session} – Semester ${r.sem} (${y.nice})`;
    desc = `RTU academic calendar ${session} for B.Tech Semester ${r.sem}: ${calendarData[r.sem].events.map(e => e[0]).slice(0, 4).join(', ')} and more dates.`;
    crumbs.push(['Academic Calendar', r.path]);
  } else if (r.section === 'syllabus' && r.year > 1) {
    crumbs.push(['Syllabus', r.base + '/syllabus']);
    const sems = y.sems.join(' & ');
    if (r.slug) {
      const n = titleFromSlug(r.slug);
      title = `RTU ${n} Syllabus – ${who} (Semester ${sems})`;
      desc = `RTU B.Tech ${br} ${y.nice} ${n} syllabus, unit wise, latest RTU scheme. View online on rtuhub.in.`;
      crumbs.push([n, r.path]);
    } else {
      title = `RTU ${who} Syllabus – ${br} (Semester ${sems})`;
      desc = `Latest RTU B.Tech ${br} ${y.nice} syllabus: full syllabus PDF plus subject wise and lab wise syllabus for semester ${sems}. View online on rtuhub.in.`;
    }
  } else if (r.section === 'syllabus' && r.slug && !r.item) {
    crumbs.push(['Syllabus', r.base + '/syllabus']);
    const n = titleFromSlug(r.slug);
    title = `RTU ${n} Syllabus – 1st Year`;
    desc = `RTU B.Tech 1st year ${n} syllabus, unit wise. View online on rtuhub.in.`;
    crumbs.push([n, r.path]);
  } else {
    const [w, d] = SEC_SEO[r.section];
    crumbs.push([w, r.base + '/' + r.section]);
    if (r.item) {
      const n = itemName(r.item);
      title = `RTU ${n} ${SECTIONS[r.section].word} – 1st Year`;
      desc = `RTU B.Tech 1st year ${n} ${SECTIONS[r.section].word.toLowerCase()} – free PDF on rtuhub.in.`;
      crumbs.push([n, r.path]);
    } else {
      title = `RTU 1st Year ${w}`;
      desc = `RTU B.Tech 1st year ${d} for all subjects – free on rtuhub.in.`;
    }
  }
  return { title: title + tail, desc, crumbs };
}

// Saare valid URL (prerender + sitemap ke liye)
export function allRoutes() {
  const out = ['/', ...TOOLS.map(t => '/' + t)];
  for (const y of YEARS) {
    const branchList = y.n === 1 ? ['COMMON'] : branches;
    if (y.n > 1) out.push('/' + y.slug);
    for (const b of branchList) {
      const base = dashPath(y.n, b);
      out.push(base, base + '/calendar', ...y.sems.map(s => `${base}/calendar/semester-${s}`));
      if (y.n === 1) for (const [sec, def] of Object.entries(SECTIONS)) out.push(`${base}/${sec}`, ...def.items.map(it => `${base}/${sec}/${it.slug}`));
      if (y.n > 1) out.push(base + '/syllabus');
      if (y.n === 1 && ANOTES.length) out.push(base + '/animated', ...ANOTES.flatMap(n => [`${base}/animated/${n.slug}`, ...n.units.map(u => `${base}/animated/${n.slug}/unit-${u.n}`)]));
      const subs = pyqSubjects(y.n, b);
      if (!subs.length) continue;
      out.push(base + '/pyq');
      for (const s of subs) out.push(`${base}/pyq/${s.slug}`, ...s.files.map(f => `${base}/pyq/${s.slug}/${paperSlug(s, f)}`));
    }
  }
  return out;
}
