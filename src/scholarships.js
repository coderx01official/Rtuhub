// =====================================================================
//  Scholarships for RTU B.Tech students (session 2026-27)
//  Har scheme ki details official portal / guideline ya bharosemand source se check ki gayi.
//  CHECKED = jis din ye details check hui. Last date badle to yahi file badlo.
//  Live notices (official portals + har college ki site) GitHub Action har ghante laata hai:
//  tools/scholarship-live.mjs -> "data" branch -> LIVE_URL
// =====================================================================
export const SCH_CHECKED = '2026-10-20';
export const SCH_SESSION = '2026-27';
export const LIVE_URL = 'https://raw.githubusercontent.com/coderx01official/Rtuhub/data/scholarships.json';

// filter chips: [id, label]
export const SCH_CATS = [
  ['all', 'All'], ['sc', 'SC'], ['st', 'ST'], ['obc', 'OBC'], ['mbc', 'MBC / SBC'], ['ews', 'EWS / General'],
  ['girls', 'Girls'], ['minority', 'Minority'], ['divyang', 'Divyang'], ['defence', 'Defence families'], ['merit', 'Merit (any category)']
];

const SSO = 'https://sso.rajasthan.gov.in';
const SJMS = 'https://sjmsnew.rajasthan.gov.in/scholarship/';
const NSP = 'https://scholarships.gov.in';
const AICTE_SCH = 'https://www.aicte-india.org/schemes/students-development-schemes';

// by: kaun deta hai. cats: kis category ke liye (open: true = har category ke filter me dikhe). last: student ki last date (YYYY-MM-DD) ya null.
// dateNote: last date ke baare me saaf baat. live: kis official portal ke live notices saath dikhayein.
export const SCHOLARSHIPS = [
  {
    id: 'rj-pms-sc', name: 'Post Matric Scholarship for SC students', by: 'Rajasthan Govt (Social Justice Dept)', state: true,
    cats: ['sc'], income: 'Family income up to ₹2.5 lakh a year',
    who: 'SC students of Rajasthan in college (B.Tech included), regular course.',
    benefit: 'Compulsory fee reimbursement + monthly maintenance allowance (paid by DBT to your Aadhaar-linked bank account).',
    last: '2026-10-31', dateNote: 'Session 2026-27 form window: 15 Aug to 31 Oct 2026. Institute portal date also extended to 31 Oct 2026 (SJE notice).',
    apply: SSO, applyNote: 'SSO login → "Scholarship (SJMS)" app', info: SJMS, live: 'sje',
    src: [['SJE Rajasthan', 'https://sje.rajasthan.gov.in/'], ['Buddy4Study', 'https://www.buddy4study.com/article/sje-scholarship']]
  },
  {
    id: 'rj-pms-st', name: 'Post Matric Scholarship for ST students', by: 'Rajasthan Govt (Tribal Area Development Dept)', state: true,
    cats: ['st'], income: 'Family income up to ₹2.5 lakh a year',
    who: 'ST students of Rajasthan in college, regular course.',
    benefit: 'Compulsory fee reimbursement + monthly maintenance allowance (DBT).',
    last: '2026-10-31', dateNote: 'Applied on the same SJMS portal as other post matric scholarships (window 15 Aug to 31 Oct 2026).',
    apply: SSO, applyNote: 'SSO login → "Scholarship (SJMS)" app', info: SJMS, live: 'sje',
    src: [['SJE Rajasthan', 'https://sje.rajasthan.gov.in/'], ['Careers360', 'https://school.careers360.com/articles/rajasthan-scholarship']]
  },
  {
    id: 'rj-pms-obc', name: 'Post Matric Scholarship for OBC students', by: 'Rajasthan Govt (Social Justice Dept)', state: true,
    cats: ['obc'], income: 'Family income up to ₹1 lakh a year (some guides say ₹1.5 lakh; check the guideline on the portal)',
    who: 'OBC students of Rajasthan in college, regular course.',
    benefit: 'Compulsory fee reimbursement + monthly maintenance allowance (DBT).',
    last: '2026-10-31', dateNote: 'Window 15 Aug to 31 Oct 2026 on the SJMS portal.',
    apply: SSO, applyNote: 'SSO login → "Scholarship (SJMS)" app', info: SJMS, live: 'sje',
    src: [['Careers360', 'https://school.careers360.com/articles/rajasthan-scholarship'], ['IndiaScholarships', 'https://www.indiascholarships.in/scholarships/rajasthan-post-matric-scholarship-obc/last-date']]
  },
  {
    id: 'rj-pms-sbc', name: 'Post Matric Scholarship for MBC / SBC students', by: 'Rajasthan Govt (Social Justice Dept)', state: true,
    cats: ['mbc'], income: 'Family income limit: guides list ₹1.08 lakh to ₹2.5 lakh. Check the current guideline on the portal before applying.',
    who: 'MBC (Special Backward Class) students of Rajasthan in college.',
    benefit: 'Fee reimbursement + maintenance allowance (DBT).',
    last: '2026-10-31', dateNote: 'Window 15 Aug to 31 Oct 2026 on the SJMS portal.',
    apply: SSO, applyNote: 'SSO login → "Scholarship (SJMS)" app', info: SJMS, live: 'sje',
    src: [['Careers360', 'https://school.careers360.com/articles/rajasthan-scholarship'], ['Buddy4Study', 'https://www.buddy4study.com/article/sje-scholarship']]
  },
  {
    id: 'rj-pms-dnt', name: 'Post Matric Scholarship for DNT students', by: 'Rajasthan Govt (Social Justice Dept)', state: true,
    cats: ['obc', 'mbc'], income: 'Family income up to ₹2 lakh a year',
    who: 'Denotified, nomadic and semi-nomadic tribe (DNT) students of Rajasthan in college.',
    benefit: 'Fee reimbursement + maintenance allowance (DBT).',
    last: '2026-10-31', dateNote: 'Window 15 Aug to 31 Oct 2026 on the SJMS portal.',
    apply: SSO, applyNote: 'SSO login → "Scholarship (SJMS)" app', info: SJMS, live: 'sje',
    src: [['Careers360', 'https://school.careers360.com/articles/rajasthan-scholarship']]
  },
  {
    id: 'rj-ebc', name: 'Dr. Ambedkar Post Matric Scholarship for EBC students', by: 'Rajasthan Govt (Social Justice Dept)', state: true,
    cats: ['ews'], income: 'Family income up to ₹1 lakh a year',
    who: 'Economically backward General category (EBC) students of Rajasthan in college.',
    benefit: 'Fee reimbursement + maintenance allowance (DBT).',
    last: '2026-10-31', dateNote: 'Window 15 Aug to 31 Oct 2026 on the SJMS portal.',
    apply: SSO, applyNote: 'SSO login → "Scholarship (SJMS)" app', info: SJMS, live: 'sje',
    src: [['Careers360', 'https://school.careers360.com/articles/rajasthan-scholarship'], ['Buddy4Study', 'https://www.buddy4study.com/article/sje-scholarship']]
  },
  {
    id: 'aicte-pragati', name: 'AICTE Pragati Scholarship (girls, degree)', by: 'AICTE, Govt of India', state: false,
    cats: ['girls'], income: 'Family income up to ₹8 lakh a year',
    who: 'Girl students in 1st year of B.Tech (or 2nd year by lateral entry) at an AICTE approved college. Max 2 girls per family.',
    benefit: '₹50,000 every year for the whole degree.',
    last: '2026-10-31', dateNote: 'Students apply by 31 Oct 2026; college verification by 15 Nov 2026.',
    apply: NSP, applyNote: 'NSP → One Time Registration (OTR) → apply', info: AICTE_SCH, live: 'nsp',
    src: [['AICTE notice (via Thapar)', 'https://www.thapar.edu/upload/files/NOTICE-AICTE PRAGATI, SAKSHAM & SWANATH  2026-27.pdf'], ['Buddy4Study', 'https://www.buddy4study.com/article/aicte-scholarships']]
  },
  {
    id: 'aicte-saksham', name: 'AICTE Saksham Scholarship (divyang, degree)', by: 'AICTE, Govt of India', state: false,
    cats: ['divyang'], income: 'Family income up to ₹8 lakh a year',
    who: 'Students with 40% or more disability in 1st year of B.Tech (or 2nd year by lateral entry) at an AICTE approved college.',
    benefit: '₹50,000 every year for the whole degree.',
    last: '2026-10-31', dateNote: 'Students apply by 31 Oct 2026; college verification by 15 Nov 2026.',
    apply: NSP, applyNote: 'NSP → One Time Registration (OTR) → apply', info: AICTE_SCH, live: 'nsp',
    src: [['AICTE notice (via Thapar)', 'https://www.thapar.edu/upload/files/NOTICE-AICTE PRAGATI, SAKSHAM & SWANATH  2026-27.pdf'], ['Buddy4Study', 'https://www.buddy4study.com/article/aicte-scholarships']]
  },
  {
    id: 'aicte-swanath', name: 'AICTE Swanath Scholarship (orphans & special cases)', by: 'AICTE, Govt of India', state: false,
    cats: ['defence'], open: true, income: 'Family income up to ₹8 lakh a year',
    who: 'Orphans, students who lost parent(s) to COVID-19, wards of armed forces / paramilitary personnel martyred in action, or whose parent is critically ill or 80%+ disabled. Any year of B.Tech. Not with another scholarship.',
    benefit: '₹50,000 every year.',
    last: '2026-10-31', dateNote: 'Students apply by 31 Oct 2026; college verification by 15 Nov 2026.',
    apply: NSP, applyNote: 'NSP → One Time Registration (OTR) → apply', info: AICTE_SCH, live: 'nsp',
    src: [['AICTE notice (via Thapar)', 'https://www.thapar.edu/upload/files/NOTICE-AICTE PRAGATI, SAKSHAM & SWANATH  2026-27.pdf'], ['Buddy4Study', 'https://www.buddy4study.com/article/aicte-scholarships']]
  },
  {
    id: 'nsp-csss', name: 'PM-USP Central Sector Scheme of Scholarship (CSSS)', by: 'Ministry of Education, Govt of India', state: false,
    cats: ['merit'], open: true, income: 'Family income up to ₹4.5 lakh a year',
    who: 'Students above the 80th percentile in their Class 12 board, in a regular college course. Any category.',
    benefit: '₹12,000 a year for the first 3 years of graduation, ₹20,000 a year after that (professional courses).',
    last: '2026-10-31', dateNote: 'Renewal (already selected students): apply by 31 Oct 2026, as shown on the NSP portal. Fresh applications closed on 30 Sep 2026.',
    apply: NSP, applyNote: 'NSP → login with OTR → renewal', info: NSP, live: 'nsp',
    src: [['NSP portal', 'https://scholarships.gov.in/'], ['IndiaScholarships', 'https://www.indiascholarships.in/scholarships/central-sector-scholarship-csss']]
  },
  {
    id: 'nsp-minority', name: 'Post Matric Scholarship for Minorities', by: 'Ministry of Minority Affairs, Govt of India', state: false,
    cats: ['minority'], income: 'Family income up to ₹2 lakh a year',
    who: 'Muslim, Christian, Sikh, Buddhist, Jain and Parsi students with at least 50% marks in the last exam.',
    benefit: 'Course fee (up to ₹20,000 a year for professional courses) + maintenance allowance.',
    last: '2026-10-31', dateNote: 'Fresh and renewal by 31 Oct 2026 (per scholarship guides; confirm on NSP).',
    apply: NSP, applyNote: 'NSP → One Time Registration (OTR) → apply', info: 'https://minority.rajasthan.gov.in/', live: 'nsp',
    src: [['IndiaScholarships', 'https://www.indiascholarships.in/scholarships/post-matric-scholarship-scheme-for-minorities-nsp/last-date']]
  },
  {
    id: 'nsp-depwd', name: 'Post Matric Scholarship for Students with Disabilities', by: 'Dept of Empowerment of PwD, Govt of India', state: false,
    cats: ['divyang'], income: 'Family income up to ₹2.5 lakh a year',
    who: 'Students with 40% or more benchmark disability (certificate / UDID needed).',
    benefit: 'Maintenance and disability allowance, book allowance, and fee reimbursement (tuition up to ₹1.4 lakh a year).',
    last: '2026-10-31', dateNote: 'Apply by 31 Oct 2026 (per scholarship guides; confirm on NSP). Give UDID consent on swavlambancard.gov.in first.',
    apply: NSP, applyNote: 'NSP → One Time Registration (OTR) → apply', info: NSP, live: 'nsp',
    src: [['IndiaScholarships', 'https://www.indiascholarships.in/scholarships/post-matric-scholarship-for-students-with-disabilities-depwd']]
  },
  {
    id: 'ksb-pmss', name: "Prime Minister's Scholarship Scheme (ex-servicemen wards)", by: 'Kendriya Sainik Board, Govt of India', state: false,
    cats: ['defence'], income: 'No income limit',
    who: 'Children / widows of ex-servicemen and ex-Coast Guard personnel, in the 1st year of a professional course like B.Tech, with 60%+ in Class 12.',
    benefit: '₹2,500 a month for boys, ₹3,000 a month for girls.',
    last: '2026-12-31', dateNote: 'Fresh applications for 2026-27 close on 31 Dec 2026 (per scholarship guides; confirm on the KSB portal).',
    apply: 'https://online.ksb.gov.in', applyNote: 'KSB online portal', info: 'https://ksb.gov.in', live: null,
    src: [['IndiaScholarships', 'https://www.indiascholarships.in/scholarships/prime-ministers-scholarship-scheme-pmss-for-wardswidows-of-ex-servicemen-and-ex-coast-guar']]
  },
  {
    id: 'tfws', name: 'Tuition Fee Waiver Scheme (TFWS)', by: 'AICTE, through REAP admission', state: true,
    cats: ['merit'], open: true, income: 'Family income up to ₹8 lakh a year',
    who: 'Taken at the time of B.Tech admission through REAP counselling (TFWS seats in each branch). Not something to apply for later.',
    benefit: 'Full tuition fee waived for the whole course.',
    last: null, dateNote: 'Next chance: REAP 2027 counselling (choose TFWS seats during counselling).',
    apply: null, info: 'https://www.poornima.org/uploads/reap/REAP-2026_Booklet.pdf', live: null,
    src: [['REAP 2025 booklet', 'https://anandice.ac.in/wp-content/uploads/2025/06/REAP-2025.pdf']]
  }
];

export const SCH_DOCS = [
  'Aadhaar card linked with your bank account (DBT needs Aadhaar seeding)',
  'Jan Aadhaar card (for Rajasthan schemes)',
  'Caste certificate (SC / ST / OBC / MBC / DNT schemes)',
  'Income certificate of the family (current year)',
  'Domicile (Mool Niwas) certificate (Rajasthan schemes)',
  'Last exam marksheet (Class 12 for 1st year)',
  'Fee receipt of this year from the college',
  'Bank passbook (account in your own name)',
  'Disability certificate / UDID (divyang schemes)',
  'Passport size photo'
];

export const SCH_STEPS = [
  ['Pick the right scheme', 'Use the filter above. Rajasthan schemes go on the SSO/SJMS portal; central and AICTE schemes go on NSP.'],
  ['Register once', 'Rajasthan: make an SSO ID on sso.rajasthan.gov.in. Central: do One Time Registration (OTR) on scholarships.gov.in with Aadhaar face authentication.'],
  ['Fill the form early', 'Upload clear scans of all documents. Do not wait for the last day: portals slow down near the deadline.'],
  ['Get college verification', 'After you submit, your college verifies the form. Tell your college scholarship cell, since their deadline comes after yours.'],
  ['Track status', 'Check the status on the same portal. Money comes by DBT to your Aadhaar-seeded bank account.']
];
