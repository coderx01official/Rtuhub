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
const BASE = [
  {
    id: 'rj-pms-sc', group: 'rj', forShort: 'SC', incomeShort: '₹2.5 lakh', name: 'Post Matric Scholarship for SC students', by: 'Rajasthan Govt (Social Justice Dept)', state: true,
    cats: ['sc'], income: 'Family income up to ₹2.5 lakh a year',
    who: 'SC students of Rajasthan in college (B.Tech included), regular course.',
    benefit: 'Compulsory fee reimbursement + monthly maintenance allowance (paid by DBT to your Aadhaar-linked bank account).',
    last: '2026-10-31', dateNote: 'Session 2026-27 form window: 15 Aug to 31 Oct 2026. Institute portal date also extended to 31 Oct 2026 (SJE notice).',
    apply: SSO, applyNote: 'SSO login → "Scholarship (SJMS)" app', info: SJMS, live: 'sje',
    src: [['SJE Rajasthan', 'https://sje.rajasthan.gov.in/'], ['Buddy4Study', 'https://www.buddy4study.com/article/sje-scholarship']]
  },
  {
    id: 'rj-pms-st', group: 'rj', forShort: 'ST', incomeShort: '₹2.5 lakh', name: 'Post Matric Scholarship for ST students', by: 'Rajasthan Govt (Tribal Area Development Dept)', state: true,
    cats: ['st'], income: 'Family income up to ₹2.5 lakh a year',
    who: 'ST students of Rajasthan in college, regular course.',
    benefit: 'Compulsory fee reimbursement + monthly maintenance allowance (DBT).',
    last: '2026-10-31', dateNote: 'Applied on the same SJMS portal as other post matric scholarships (window 15 Aug to 31 Oct 2026).',
    apply: SSO, applyNote: 'SSO login → "Scholarship (SJMS)" app', info: SJMS, live: 'sje',
    src: [['SJE Rajasthan', 'https://sje.rajasthan.gov.in/'], ['Careers360', 'https://school.careers360.com/articles/rajasthan-scholarship']]
  },
  {
    id: 'rj-pms-obc', group: 'rj', forShort: 'OBC', incomeShort: '₹1 lakh*', name: 'Post Matric Scholarship for OBC students', by: 'Rajasthan Govt (Social Justice Dept)', state: true,
    cats: ['obc'], income: 'Family income up to ₹1 lakh a year (some guides say ₹1.5 lakh; check the guideline on the portal)',
    who: 'OBC students of Rajasthan in college, regular course.',
    benefit: 'Compulsory fee reimbursement + monthly maintenance allowance (DBT).',
    last: '2026-10-31', dateNote: 'Window 15 Aug to 31 Oct 2026 on the SJMS portal.',
    apply: SSO, applyNote: 'SSO login → "Scholarship (SJMS)" app', info: SJMS, live: 'sje',
    src: [['Careers360', 'https://school.careers360.com/articles/rajasthan-scholarship'], ['IndiaScholarships', 'https://www.indiascholarships.in/scholarships/rajasthan-post-matric-scholarship-obc/last-date']]
  },
  {
    id: 'rj-pms-sbc', group: 'rj', forShort: 'MBC / SBC', incomeShort: 'Check portal*', name: 'Post Matric Scholarship for MBC / SBC students', by: 'Rajasthan Govt (Social Justice Dept)', state: true,
    cats: ['mbc'], income: 'Family income limit: guides list ₹1.08 lakh to ₹2.5 lakh. Check the current guideline on the portal before applying.',
    who: 'MBC (Special Backward Class) students of Rajasthan in college.',
    benefit: 'Fee reimbursement + maintenance allowance (DBT).',
    last: '2026-10-31', dateNote: 'Window 15 Aug to 31 Oct 2026 on the SJMS portal.',
    apply: SSO, applyNote: 'SSO login → "Scholarship (SJMS)" app', info: SJMS, live: 'sje',
    src: [['Careers360', 'https://school.careers360.com/articles/rajasthan-scholarship'], ['Buddy4Study', 'https://www.buddy4study.com/article/sje-scholarship']]
  },
  {
    id: 'rj-pms-dnt', group: 'rj', forShort: 'DNT', incomeShort: '₹2 lakh', name: 'Post Matric Scholarship for DNT students', by: 'Rajasthan Govt (Social Justice Dept)', state: true,
    cats: ['obc', 'mbc'], income: 'Family income up to ₹2 lakh a year',
    who: 'Denotified, nomadic and semi-nomadic tribe (DNT) students of Rajasthan in college.',
    benefit: 'Fee reimbursement + maintenance allowance (DBT).',
    last: '2026-10-31', dateNote: 'Window 15 Aug to 31 Oct 2026 on the SJMS portal.',
    apply: SSO, applyNote: 'SSO login → "Scholarship (SJMS)" app', info: SJMS, live: 'sje',
    src: [['Careers360', 'https://school.careers360.com/articles/rajasthan-scholarship']]
  },
  {
    id: 'rj-ebc', group: 'rj', forShort: 'EBC (General)', incomeShort: '₹1 lakh', name: 'Dr. Ambedkar Post Matric Scholarship for EBC students', by: 'Rajasthan Govt (Social Justice Dept)', state: true,
    cats: ['ews'], income: 'Family income up to ₹1 lakh a year',
    who: 'Economically backward General category (EBC) students of Rajasthan in college.',
    benefit: 'Fee reimbursement + maintenance allowance (DBT).',
    last: '2026-10-31', dateNote: 'Window 15 Aug to 31 Oct 2026 on the SJMS portal.',
    apply: SSO, applyNote: 'SSO login → "Scholarship (SJMS)" app', info: SJMS, live: 'sje',
    src: [['Careers360', 'https://school.careers360.com/articles/rajasthan-scholarship'], ['Buddy4Study', 'https://www.buddy4study.com/article/sje-scholarship']]
  },
  {
    id: 'aicte-pragati', group: 'in', forShort: 'Girls', incomeShort: '₹8 lakh', name: 'AICTE Pragati Scholarship (girls, degree)', by: 'AICTE, Govt of India', state: false,
    cats: ['girls'], income: 'Family income up to ₹8 lakh a year',
    who: 'Girl students in 1st year of B.Tech (or 2nd year by lateral entry) at an AICTE approved college. Max 2 girls per family.',
    benefit: '₹50,000 every year for the whole degree.',
    last: '2026-10-31', dateNote: 'Students apply by 31 Oct 2026; college verification by 15 Nov 2026.',
    apply: NSP, applyNote: 'NSP → One Time Registration (OTR) → apply', info: AICTE_SCH, live: 'nsp',
    src: [['AICTE notice (via Thapar)', 'https://www.thapar.edu/upload/files/NOTICE-AICTE PRAGATI, SAKSHAM & SWANATH  2026-27.pdf'], ['Buddy4Study', 'https://www.buddy4study.com/article/aicte-scholarships']]
  },
  {
    id: 'aicte-saksham', group: 'in', forShort: 'Divyang (40%+)', incomeShort: '₹8 lakh', name: 'AICTE Saksham Scholarship (divyang, degree)', by: 'AICTE, Govt of India', state: false,
    cats: ['divyang'], income: 'Family income up to ₹8 lakh a year',
    who: 'Students with 40% or more disability in 1st year of B.Tech (or 2nd year by lateral entry) at an AICTE approved college.',
    benefit: '₹50,000 every year for the whole degree.',
    last: '2026-10-31', dateNote: 'Students apply by 31 Oct 2026; college verification by 15 Nov 2026.',
    apply: NSP, applyNote: 'NSP → One Time Registration (OTR) → apply', info: AICTE_SCH, live: 'nsp',
    src: [['AICTE notice (via Thapar)', 'https://www.thapar.edu/upload/files/NOTICE-AICTE PRAGATI, SAKSHAM & SWANATH  2026-27.pdf'], ['Buddy4Study', 'https://www.buddy4study.com/article/aicte-scholarships']]
  },
  {
    id: 'aicte-swanath', group: 'in', forShort: 'Orphans, special cases', incomeShort: '₹8 lakh', name: 'AICTE Swanath Scholarship (orphans & special cases)', by: 'AICTE, Govt of India', state: false,
    cats: ['defence'], open: true, income: 'Family income up to ₹8 lakh a year',
    who: 'Orphans, students who lost parent(s) to COVID-19, wards of armed forces / paramilitary personnel martyred in action, or whose parent is critically ill or 80%+ disabled. Any year of B.Tech. Not with another scholarship.',
    benefit: '₹50,000 every year.',
    last: '2026-10-31', dateNote: 'Students apply by 31 Oct 2026; college verification by 15 Nov 2026.',
    apply: NSP, applyNote: 'NSP → One Time Registration (OTR) → apply', info: AICTE_SCH, live: 'nsp',
    src: [['AICTE notice (via Thapar)', 'https://www.thapar.edu/upload/files/NOTICE-AICTE PRAGATI, SAKSHAM & SWANATH  2026-27.pdf'], ['Buddy4Study', 'https://www.buddy4study.com/article/aicte-scholarships']]
  },
  {
    id: 'nsp-csss', group: 'in', forShort: 'Top 20% in Class 12', incomeShort: '₹4.5 lakh', name: 'PM-USP Central Sector Scheme of Scholarship (CSSS)', by: 'Ministry of Education, Govt of India', state: false,
    cats: ['merit'], open: true, income: 'Family income up to ₹4.5 lakh a year',
    who: 'Students above the 80th percentile in their Class 12 board, in a regular college course. Any category.',
    benefit: '₹12,000 a year for the first 3 years of graduation, ₹20,000 a year after that (professional courses).',
    last: '2026-10-31', dateNote: 'Renewal (already selected students): apply by 31 Oct 2026, as shown on the NSP portal. Fresh applications closed on 30 Sep 2026.',
    apply: NSP, applyNote: 'NSP → login with OTR → renewal', info: NSP, live: 'nsp',
    src: [['NSP portal', 'https://scholarships.gov.in/'], ['IndiaScholarships', 'https://www.indiascholarships.in/scholarships/central-sector-scholarship-csss']]
  },
  {
    id: 'nsp-minority', group: 'in', forShort: 'Minorities', incomeShort: '₹2 lakh', name: 'Post Matric Scholarship for Minorities', by: 'Ministry of Minority Affairs, Govt of India', state: false,
    cats: ['minority'], income: 'Family income up to ₹2 lakh a year',
    who: 'Muslim, Christian, Sikh, Buddhist, Jain and Parsi students with at least 50% marks in the last exam.',
    benefit: 'Course fee (up to ₹20,000 a year for professional courses) + maintenance allowance.',
    last: '2026-10-31', dateNote: 'Fresh and renewal by 31 Oct 2026 (per scholarship guides; confirm on NSP).',
    apply: NSP, applyNote: 'NSP → One Time Registration (OTR) → apply', info: 'https://minority.rajasthan.gov.in/', live: 'nsp',
    src: [['IndiaScholarships', 'https://www.indiascholarships.in/scholarships/post-matric-scholarship-scheme-for-minorities-nsp/last-date']]
  },
  {
    id: 'nsp-depwd', group: 'in', forShort: 'Divyang (40%+)', incomeShort: '₹2.5 lakh', name: 'Post Matric Scholarship for Students with Disabilities', by: 'Dept of Empowerment of PwD, Govt of India', state: false,
    cats: ['divyang'], income: 'Family income up to ₹2.5 lakh a year',
    who: 'Students with 40% or more benchmark disability (certificate / UDID needed).',
    benefit: 'Maintenance and disability allowance, book allowance, and fee reimbursement (tuition up to ₹1.4 lakh a year).',
    last: '2026-10-31', dateNote: 'Apply by 31 Oct 2026 (per scholarship guides; confirm on NSP). Give UDID consent on swavlambancard.gov.in first.',
    apply: NSP, applyNote: 'NSP → One Time Registration (OTR) → apply', info: NSP, live: 'nsp',
    src: [['IndiaScholarships', 'https://www.indiascholarships.in/scholarships/post-matric-scholarship-for-students-with-disabilities-depwd']]
  },
  {
    id: 'ksb-pmss', group: 'other', forShort: 'Ex-servicemen wards', incomeShort: 'No limit', name: "Prime Minister's Scholarship Scheme (ex-servicemen wards)", by: 'Kendriya Sainik Board, Govt of India', state: false,
    cats: ['defence'], income: 'No income limit',
    who: 'Children / widows of ex-servicemen and ex-Coast Guard personnel, in the 1st year of a professional course like B.Tech, with 60%+ in Class 12.',
    benefit: '₹2,500 a month for boys, ₹3,000 a month for girls.',
    last: '2026-12-31', dateNote: 'Fresh applications for 2026-27 close on 31 Dec 2026 (per scholarship guides; confirm on the KSB portal).',
    apply: 'https://online.ksb.gov.in', applyNote: 'KSB online portal', info: 'https://ksb.gov.in', live: null,
    src: [['IndiaScholarships', 'https://www.indiascholarships.in/scholarships/prime-ministers-scholarship-scheme-pmss-for-wardswidows-of-ex-servicemen-and-ex-coast-guar']]
  },
  {
    id: 'tfws', lastLabel: 'At admission', group: 'other', forShort: 'Any (at admission)', incomeShort: '₹8 lakh', name: 'Tuition Fee Waiver Scheme (TFWS)', by: 'AICTE, through REAP admission', state: true,
    cats: ['merit'], open: true, income: 'Family income up to ₹8 lakh a year',
    who: 'Taken at the time of B.Tech admission through REAP counselling (TFWS seats in each branch). Not something to apply for later.',
    benefit: 'Full tuition fee waived for the whole course.',
    last: null, dateNote: 'Next chance: REAP 2027 counselling (choose TFWS seats during counselling).',
    apply: null, info: 'https://www.poornima.org/uploads/reap/REAP-2026_Booklet.pdf', live: null,
    src: [['REAP 2025 booklet', 'https://anandice.ac.in/wp-content/uploads/2025/06/REAP-2025.pdf']]
  }
  ,{
    id: 'rj-cmuss', lastLabel: 'Usually Jan–Feb', group: 'rj', forShort: 'RBSE top 1 lakh, any category', incomeShort: '₹2.5 lakh', name: 'Mukhyamantri Uchch Shiksha Chhatravriti Yojana', by: 'Rajasthan Govt (Higher & Technical Education)', state: true,
    cats: ['merit'], open: true, income: 'Family income up to ₹2.5 lakh a year',
    who: 'Rajasthan students in the top 1 lakh of the RBSE (Ajmer board) Class 12 merit list with at least 60% marks, now in a regular college course.',
    benefit: '₹5,000 a year (₹500 a month for 10 months); ₹10,000 a year for students with 40%+ disability. Up to 5 years.',
    last: null, dateNote: 'Applications usually open around January–February on the SSO portal; no 2026-27 date announced yet. Watch the HTE live notices below.',
    apply: SSO, applyNote: 'SSO login → "Scholarship (CE)"', info: 'https://hte.rajasthan.gov.in/', live: 'hte',
    src: [['Buddy4Study (Hindi)', 'https://hindi.buddy4study.com/mukhya-mantri-uchh-shiksha-yojana']]
  },
  {
    id: 'rj-dbt-voucher', lastLabel: 'Check portal', group: 'rj', forShort: 'SC, ST, OBC, MBC, EWS (outstation)', incomeShort: '₹2.5 lakh (SC/ST)', name: 'Ambedkar DBT Voucher Yojana (rent help)', by: 'Rajasthan Govt (Social Justice Dept)', state: true,
    cats: ['sc', 'st', 'obc', 'mbc', 'ews'], income: 'SC / ST: up to ₹2.5 lakh a year. OBC, MBC, EWS: up to ₹1.5 lakh a year (per guides; check the portal).',
    who: 'Students from outside the city who study regularly in a government or government-aided college at a division or district headquarters and live in rented rooms (no government hostel).',
    benefit: 'SC / ST: ₹2,000 a month for 10 months (₹20,000 a year). OBC, MBC, EWS: ₹1,500 a month (₹15,000 a year). Paid by DBT.',
    last: null, dateNote: 'Applied on the SJE / SSO portal; no fixed 2026-27 date found. Mainly useful for students of government engineering colleges.',
    apply: SSO, applyNote: 'SSO login → SJE scheme "Ambedkar DBT Voucher"', info: 'https://sje.rajasthan.gov.in/', live: 'sje',
    src: [['Vikaspedia', 'https://schemes.vikaspedia.in/viewcontent/schemesall/state-specific-schemes/welfare-schemes-of-rajasthan/ambedkar-dbt-voucher-yojana?lgn=en'], ['SchemesInIndia', 'https://schemesinindia.in/schemes/rajasthan/ambedkar-dbt-voucher-yojana-rajasthan']]
  },
  {
    id: 'rj-kalibai', group: 'rj', forShort: 'Girls (65%+ RBSE / 75%+ CBSE)', incomeShort: '₹2.5 lakh', name: 'Kalibai Bheel Medhavi Chhatra Scooty Yojana', by: 'Rajasthan Govt (College Education)', state: true,
    cats: ['girls'], income: 'Family income up to ₹2.5 lakh a year',
    who: 'Rajasthan girls who passed Class 12 last year with 65%+ (RBSE) or 75%+ (CBSE) and have joined the 1st year of a regular college course in Rajasthan.',
    benefit: '₹70,000 one time by DBT to buy a scooty (₹40,000 for girls who already got a scooty on their Class 10 result).',
    last: '2026-11-30', dateNote: 'Expected around 30 Nov 2026, not yet confirmed on the official site. Check the HTE notices.',
    apply: SSO, applyNote: 'SSO login → "Scholarship (CE)" → scooty scheme', info: 'https://hte.rajasthan.gov.in/', live: 'hte',
    src: [['IndiaScholarships', 'https://www.indiascholarships.in/scholarships/kali-bai-bhil-meritorious-girls-scooty-scheme']]
  },
  {
    id: 'rj-bocw', lastLabel: 'During session', group: 'rj', forShort: 'Construction workers’ children', incomeShort: 'No income limit', name: 'Nirman Shramik Shiksha evam Kaushal Vikas Yojana', by: 'Rajasthan Govt (Labour Dept, BOCW Board)', state: true,
    cats: ['merit'], open: true, income: 'No income limit; parent must be a registered construction worker',
    who: 'Son, daughter or wife of a construction worker registered with the Rajasthan BOCW welfare board (up to 2 children per worker), studying regularly.',
    benefit: '₹18,000 a year for a professional degree like B.Tech (₹20,000 for divyang students), plus a ₹25,000 merit award for 60%+ marks.',
    last: null, dateNote: 'Apply within the session on the LDMS portal; no fixed 2026-27 date found.',
    apply: SSO, applyNote: 'SSO login → LDMS → Welfare Schemes → BOCW', info: 'https://ldms.rajasthan.gov.in/', live: null,
    src: [['PublicServicesMap', 'https://www.publicservicesmap.in/schemes/nirman-shramik-siksha-kaushal-vikas-yojana--nsskvy?lang=en']]
  }
];


// ---------- poori details: eligibility, kaun nahi, kya milta hai, selection, renewal, khaas documents ----------
const PMS = {
  elig: [
    'Permanent resident (mool niwasi) of Rajasthan.',
    'Studying in a regular course after Class 10 or 12, such as B.Tech, in a college registered on the SJMS portal.',
    'Admission through the proper process (REAP counselling or the college’s approved admission).',
    'Bank account in the student’s own name, linked with Aadhaar and Jan Aadhaar for DBT.'
  ],
  notElig: [
    'A second course at the same level (for example, a second bachelor’s degree).',
    'Students already getting another scholarship for the same course (only one scholarship at a time).',
    'Family income above the limit for the category.'
  ],
  select: 'Not a merit list: every eligible student who applies on time gets it after verification by the college and the department.',
  renew: [
    'Apply again every year on the same portal (renewal form).',
    'Must be promoted to the next year. Central guidelines allow the first failure in engineering to be condoned; after a second failure the scholarship stops until you pass.',
    'Regular attendance. Mark biometric attendance on the Scholarship app when asked (SJE notice: session 2026-27 biometric deadline 31 Mar 2027).',
    'Changing college or course without informing the department can stop the scholarship.'
  ],
  docs: ['Caste certificate', 'Income certificate (current year)', 'Mool Niwas (domicile) certificate', 'Jan Aadhaar and Aadhaar', 'Fee receipt of this year', 'Last exam marksheet', 'Bank passbook']
};
const PMS_BENEFIT = [
  'Compulsory non-refundable college fees reimbursed, as per the fee fixed by the government / fee committee.',
  'Monthly maintenance allowance (central guideline for degree engineering: ₹1,200 a month for hostellers, ₹550 for day scholars; check current rates on the portal).',
  'Study tour charges up to ₹1,600 a year and book bank support for engineering (central guideline).',
  'Paid by DBT to the Aadhaar-seeded bank account.'
];
const NSP_STEPS = ['Do One Time Registration (OTR) on scholarships.gov.in using Aadhaar face authentication (AadhaarFaceRD app).'];
const DETAILS = {
  'rj-pms-sc': { ...PMS, elig: ['Belongs to a Scheduled Caste notified for Rajasthan.', 'Family income up to ₹2.5 lakh a year (parents’ income; guardian’s income only if both parents have died).', ...PMS.elig], benefits: PMS_BENEFIT,
    notElig: [...PMS.notElig, 'Employed students get only the fee reimbursement, not the allowance (if family income is within the limit).'] },
  'rj-pms-st': { ...PMS, elig: ['Belongs to a Scheduled Tribe notified for Rajasthan.', 'Family income up to ₹2.5 lakh a year.', ...PMS.elig], benefits: PMS_BENEFIT },
  'rj-pms-obc': { ...PMS, elig: ['Belongs to an OBC caste (non-creamy layer) of Rajasthan.', 'Family income within the limit (₹1 lakh per most guides; one guide says ₹1.5 lakh; the portal guideline decides).', ...PMS.elig], benefits: PMS_BENEFIT },
  'rj-pms-sbc': { ...PMS, elig: ['Belongs to an MBC / SBC caste of Rajasthan.', 'Family income within the limit given in the current guideline (guides list figures from ₹1.08 lakh to ₹2.5 lakh).', ...PMS.elig], benefits: PMS_BENEFIT },
  'rj-pms-dnt': { ...PMS, elig: ['Belongs to a denotified, nomadic or semi-nomadic tribe (DNT) of Rajasthan.', 'Family income up to ₹2 lakh a year.', ...PMS.elig], benefits: PMS_BENEFIT },
  'rj-ebc': { ...PMS, elig: ['General category student from an economically backward family (EBC).', 'Family income up to ₹1 lakh a year.', ...PMS.elig], benefits: PMS_BENEFIT },
  'rj-cmuss': {
    elig: ['Permanent resident of Rajasthan.', 'Passed Class 12 from RBSE (Ajmer board) with at least 60% and is in the top 1 lakh of the board’s merit list.', 'Family income up to ₹2.5 lakh a year.', 'Studying in a regular college / university course.', 'Bank account in the student’s name.'],
    notElig: ['Students already getting a scholarship under another government scheme.', 'Students who leave the course midway stop getting it.'],
    benefits: ['₹500 a month for 10 months = ₹5,000 a year.', 'Divyang students (40%+): ₹1,000 a month = ₹10,000 a year.', 'For up to 5 years of study.'],
    select: 'Based on the RBSE Class 12 merit list (top 1 lakh) and the income limit.',
    renew: ['Apply again every year on the SSO portal and keep the SSO profile updated.', 'Some guides say you need 60% in the previous year to continue; check the guideline.'],
    docs: ['Class 10 and 12 marksheets', 'Jan Aadhaar and Aadhaar', 'Income certificate', 'Bank passbook', 'Disability certificate (if applicable)']
  },
  'rj-dbt-voucher': {
    elig: ['SC, ST, OBC, MBC or EWS student of Rajasthan.', 'Regular student of a government or government-aided college at a division headquarters (Jaipur, Jodhpur, Udaipur, Kota, Bikaner, Ajmer, Bharatpur) or district headquarters.', 'Home is in another city or town (outstation student) and you live in a rented room.', 'Income within the limit: SC / ST ₹2.5 lakh, OBC / MBC / EWS ₹1.5 lakh a year.'],
    notElig: ['Students living in a government hostel.', 'Students whose home is in the same city as the college.', 'Correspondence or distance-learning students.'],
    benefits: ['SC / ST: ₹2,000 a month for 10 months (₹20,000 a year).', 'OBC / MBC / EWS: ₹1,500 a month for 10 months (₹15,000 a year).', 'Paid by DBT to the Jan Aadhaar-linked bank account.'],
    select: 'All eligible applicants after verification by the college; check the portal for any limit on numbers.',
    renew: ['Apply again each year while you stay eligible.'],
    docs: ['Jan Aadhaar (must)', 'Caste certificate', 'Income certificate', 'Domicile certificate', 'College bonafide certificate / admission proof', 'Bank passbook']
  },
  'rj-kalibai': {
    elig: ['Girl student, permanent resident of Rajasthan.', 'Passed Class 12 in the previous year with 65%+ from RBSE or 75%+ from CBSE.', 'Family income up to ₹2.5 lakh a year.', 'Joined the 1st year of a regular college course in Rajasthan (B.Tech counts).'],
    notElig: ['Girls who already got a scooty under another state scheme (except the Class 10 scooty case, which gets ₹40,000).'],
    benefits: ['₹70,000 one time by DBT to buy a scooty of your choice.', '₹40,000 for girls who already got a scooty on their Class 10 result.'],
    select: 'Merit list made from Class 12 marks within the number of scooties for each category.',
    renew: ['One-time benefit, no renewal.'],
    docs: ['Class 12 marksheet', 'Jan Aadhaar', 'Domicile certificate', 'Income certificate', 'College fee receipt of this year', 'Bank account in the girl’s name', 'Caste certificate (if applicable)']
  },
  'rj-bocw': {
    elig: ['Parent (or husband) is a construction worker registered with the Rajasthan Building and Other Construction Workers welfare board.', 'Up to 2 children per worker (or 1 child and the wife; wife up to 35 years).', 'Studying regularly in a recognised institution.'],
    notElig: ['Families without a valid BOCW registration.'],
    benefits: ['B.Tech / professional degree: ₹18,000 a year (₹20,000 for divyang students).', 'Merit award ₹25,000 for 60% or more in a graduation-level exam (no limit on children for merit awards).'],
    select: 'All eligible applicants after department verification.',
    renew: ['Apply for each year of study on LDMS.'],
    docs: ['BOCW registration (labour card) of the parent', 'Jan Aadhaar', 'Last exam marksheet', 'Fee receipt / bonafide certificate', 'Bank passbook']
  },
  'aicte-pragati': {
    elig: ['Girl student admitted to the 1st year of B.Tech, or the 2nd year by lateral entry, in an AICTE approved college.', 'Family income up to ₹8 lakh a year.', 'At most 2 girls of one family can get it.'],
    notElig: ['Students in the 3rd or 4th year applying fresh.', 'Family income above ₹8 lakh.'],
    benefits: ['₹50,000 every year, for each year of the degree.'],
    select: 'Merit of the qualifying exam (Class 12 for 1st year, diploma for lateral entry), within the number of scholarships.',
    renew: ['Renew every year on NSP; must pass to the next year.'],
    docs: ['Class 12 / diploma marksheet', 'Income certificate (issued by competent authority)', 'Admission letter / fee receipt', 'Aadhaar-seeded bank account', ...NSP_STEPS]
  },
  'aicte-saksham': {
    elig: ['Student with 40% or more disability, admitted to the 1st year of B.Tech, or the 2nd year by lateral entry, in an AICTE approved college.', 'Family income up to ₹8 lakh a year.'],
    notElig: ['Disability below 40%.', 'Family income above ₹8 lakh.'],
    benefits: ['₹50,000 every year, for each year of the degree.'],
    select: 'Merit of the qualifying exam, within the number of scholarships.',
    renew: ['Renew every year on NSP; must pass to the next year.'],
    docs: ['Disability certificate / UDID', 'Class 12 / diploma marksheet', 'Income certificate', 'Admission letter / fee receipt', ...NSP_STEPS]
  },
  'aicte-swanath': {
    elig: ['Orphan; or lost one or both parents to COVID-19; or ward of armed forces / central paramilitary personnel martyred in action; or parent with critical illness, or deceased / 80%+ disabled in an accident.', 'Regular student of any year of B.Tech in an AICTE approved college.', 'Family income up to ₹8 lakh a year.'],
    notElig: ['Students already getting another central, state or AICTE scholarship.'],
    benefits: ['₹50,000 every year.'],
    select: 'For degree courses, selection is on Class 12 marks only; ties go to higher Class 10 marks.',
    renew: ['Renew every year on NSP; must pass to the next year.'],
    docs: ['Proof of the special condition (death certificate, martyrdom / disability / illness certificate)', 'Class 10 and 12 marksheets', 'Income certificate', ...NSP_STEPS]
  },
  'nsp-csss': {
    elig: ['Above the 80th percentile of successful students in your Class 12 board.', 'Family income up to ₹4.5 lakh a year.', 'Regular student of a degree course in a recognised college (B.Tech included).'],
    notElig: ['Students getting another scholarship at the same time.', 'Correspondence / distance courses.'],
    benefits: ['₹12,000 a year for the first 3 years of graduation.', '₹20,000 a year after that, for professional courses such as B.Tech (4th year).'],
    select: 'Fixed number of scholarships divided among state boards by population; selection on Class 12 marks.',
    renew: ['Renew every year on NSP (2026-27 renewal by 31 Oct 2026).', 'Need at least 50% marks in the previous year and 75% attendance (scheme rules, check NSP).'],
    docs: ['Class 12 marksheet', 'Income certificate', 'Fee receipt / bonafide certificate', ...NSP_STEPS]
  },
  'nsp-minority': {
    elig: ['Muslim, Christian, Sikh, Buddhist, Jain or Parsi student.', 'At least 50% marks in the last exam.', 'Family income up to ₹2 lakh a year.'],
    notElig: ['Students getting another scholarship for the same course.'],
    benefits: ['Course fee up to ₹20,000 a year for professional courses.', 'Maintenance allowance (up to ₹1,200 a month for hostellers per guides).'],
    select: 'Merit-cum-means, within the number of scholarships for each state.',
    renew: ['Renew every year on NSP with 50% marks in the previous year.'],
    docs: ['Minority community self-declaration', 'Income certificate', 'Last exam marksheet', 'Fee receipt', ...NSP_STEPS]
  },
  'nsp-depwd': {
    elig: ['Benchmark disability of 40% or more, certified by a competent authority.', 'Family income up to ₹2.5 lakh a year.', 'Regular student after Class 10 (B.Tech included).'],
    notElig: ['Disability below 40%.', 'Students getting another scholarship for the same course.'],
    benefits: ['Monthly maintenance allowance.', 'Disability allowance of ₹2,000 to ₹4,000 a year.', 'Book allowance ₹1,500 a year.', 'Tuition fee reimbursement up to ₹1.4 lakh a year, other compulsory fees up to ₹10,000.'],
    select: 'Within the number of scholarships, on merit.',
    renew: ['Renew every year on NSP.'],
    docs: ['Disability certificate / UDID (give UDID consent on swavlambancard.gov.in first)', 'Income certificate', 'Last exam marksheet', 'Fee receipt', ...NSP_STEPS]
  },
  'ksb-pmss': {
    elig: ['Child or widow of an ex-serviceman / ex-Coast Guard personnel.', 'In the 1st year of a professional course such as B.Tech.', 'At least 60% marks in the minimum qualification (Class 12 / diploma / graduation).'],
    notElig: ['Students in later years applying fresh.'],
    benefits: ['₹2,500 a month for boys (₹30,000 a year).', '₹3,000 a month for girls (₹36,000 a year).', 'For the length of the course.'],
    select: 'Limited number of scholarships each year, on merit.',
    renew: ['Renew every year on the KSB portal; must pass with the required marks.'],
    docs: ['Ex-serviceman identity card / discharge book of the parent', 'Class 12 marksheet', 'Admission and fee proof', 'Bank details']
  },
  'tfws': {
    elig: ['Family income up to ₹8 lakh a year.', 'Takes a TFWS seat during REAP counselling, by merit (rank).'],
    notElig: ['Students who are already admitted on a normal seat (it can’t be taken later).'],
    benefits: ['Full tuition fee waived for the whole course (other fees still payable).'],
    select: 'By REAP merit for the TFWS seats of each branch.',
    renew: ['Continues while you keep passing as per AICTE / university rules.'],
    docs: ['Income certificate at the time of REAP counselling']
  }
};
export const SCHOLARSHIPS = BASE.map(s => ({ ...s, ...(DETAILS[s.id] || {}) }));

// sections jinme cards bante hain (page aur PDF dono me)
export const SCH_GROUPS = [
  ['rj', 'Rajasthan Government', 'Apply on sso.rajasthan.gov.in → Scholarship (SJMS). For students with Rajasthan domicile.'],
  ['in', 'Government of India & AICTE', 'Apply on scholarships.gov.in (NSP) after One Time Registration. For students from any state.'],
  ['other', 'Other schemes', 'Kendriya Sainik Board portal, and the fee waiver taken during REAP admission.']
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
