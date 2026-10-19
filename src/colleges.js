// =====================================================================
//  RTU se jude B.Tech colleges — RTU ki official list
//  ("List of Colleges running under the Jurisdiction of RTU, Kota", session 2019-20, Dean Academic).
//  Inka syllabus, exam aur paper RTU ka hi hai, isliye rtuhub.in ka sab kuch inke students ke kaam ka hai.
//  Naya college jodna ho to bas ek line add karo. short = jo naam students search karte hain (JECRC, SKIT ...).
// =====================================================================
export const COLLEGES_SOURCE = 'RTU official list of colleges, session 2019-20';
// branches: [label, seats per year (null = not published), rtuhub branch code (null = no separate RTU page)]
// logo: college ka logo, public/logos me 128px (college ki site / listing pages se liya)
// web: official college website (logo in the list is loaded from this site's icon; none = initials badge)
// seats: AICTE approved intake (Careers360) / REAP seat matrix for govt colleges; UCE Kota = RTU's 2025 admitted list
export const COLLEGES = [
 {
  "slug": "uce-kota",
  "logo": "/logos/uce-kota.webp",
  "web": "https://www.rtu.ac.in/",
  "name": "University College of Engineering, RTU Kota",
  "short": [
   "UCE Kota",
   "RTU Kota",
   "UCE RTU"
  ],
  "city": "Kota",
  "govt": true,
  "address": "Akelgarh Rawatbhata Road Kota-324010",
  "programmes": [
   "B.Tech",
   "M.Tech",
   "MBA"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    132,
    "cse"
   ],
   [
    "Civil",
    127,
    "civil"
   ],
   [
    "EE",
    125,
    "ee"
   ],
   [
    "IT",
    66,
    "it"
   ],
   [
    "ECE",
    64,
    "ece"
   ],
   [
    "EIC",
    62,
    "eic"
   ],
   [
    "Mechanical",
    61,
    "mechanical"
   ],
   [
    "Chemical",
    59,
    "chemical"
   ],
   [
    "Aeronautical",
    27,
    "aeronautical"
   ],
   [
    "Petroleum",
    17,
    "petroleum"
   ],
   [
    "Production",
    16,
    "production"
   ],
   [
    "Petrochemical",
    12,
    "petrochemical"
   ]
  ],
  "seats": 768,
  "seatsPartial": false,
  "seatsKind": "admitted",
  "dataSrc": "RTU official list of students admitted in 2025"
 },
 {
  "slug": "gec-banswara",
  "logo": "/logos/gec-banswara.webp",
  "web": "http://www.gecbanswara.ac.in/",
  "name": "Government Engineering College, Banswara",
  "short": [
   "GEC Banswara"
  ],
  "city": "Banswara",
  "govt": true,
  "address": "Behind Mayur Mill Kupda Dungarpur Road Banswara-327001",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "Civil",
    54,
    "civil"
   ],
   [
    "CSE",
    54,
    "cse"
   ],
   [
    "EE",
    54,
    "ee"
   ],
   [
    "Mechanical",
    54,
    "mechanical"
   ]
  ],
  "seats": 216,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "REAP 2024 seat matrix (Careers360)"
 },
 {
  "slug": "gec-baran",
  "logo": "/logos/gec-baran.webp",
  "name": "Government Engineering College, Baran",
  "short": [
   "GEC Baran"
  ],
  "city": "Baran",
  "govt": true,
  "address": "Govt. Polytechnic College Baran, NH-27, Village- Batavadi, Tehsil-Antah, Baran(Raj.)-325202",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "Civil",
    48,
    "civil"
   ],
   [
    "CSE",
    48,
    "cse"
   ],
   [
    "EE",
    48,
    "ee"
   ],
   [
    "ECE",
    48,
    "ece"
   ],
   [
    "Agricultural",
    48,
    "agricultural"
   ]
  ],
  "seats": 240,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "REAP 2024 seat matrix (Careers360)"
 },
 {
  "slug": "gec-bharatpur",
  "logo": "/logos/gec-bharatpur.webp",
  "web": "https://www.ecbharatpur.ac.in/",
  "name": "Government Engineering College, Bharatpur",
  "short": [
   "GEC Bharatpur"
  ],
  "city": "Bharatpur",
  "govt": true,
  "address": "Village Shyorana Near NH-11, Bharatpur-321303",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "Civil",
    60,
    "civil"
   ],
   [
    "CSE",
    60,
    "cse"
   ],
   [
    "EE",
    60,
    "ee"
   ],
   [
    "ECE",
    60,
    "ece"
   ],
   [
    "Mechanical",
    60,
    "mechanical"
   ]
  ],
  "seats": 300,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "REAP 2024 seat matrix (Careers360)"
 },
 {
  "slug": "gec-dholpur",
  "name": "Government Engineering College, Dholpur",
  "short": [
   "GEC Dholpur"
  ],
  "city": "Dholpur",
  "govt": true,
  "address": "Village & Tehsil-Surajpura, Dholpur-328001",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "Civil",
    54,
    "civil"
   ],
   [
    "EE",
    54,
    "ee"
   ],
   [
    "ECE",
    54,
    "ece"
   ],
   [
    "Mechanical",
    54,
    "mechanical"
   ],
   [
    "Mining",
    54,
    "mining"
   ]
  ],
  "seats": 270,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "REAP 2024 seat matrix (Careers360)"
 },
 {
  "slug": "gec-jhalawar",
  "logo": "/logos/gec-jhalawar.webp",
  "web": "http://www.gecj.ac.in/",
  "name": "Government Engineering College, Jhalawar",
  "short": [
   "GEC Jhalawar"
  ],
  "city": "Jhalawar",
  "govt": true,
  "address": "Village-Chandlai Sunel Road Tehsil- Jhalarapatan Distt. - Jhalawar-326023",
  "programmes": [
   "B.Tech",
   "MBA"
  ],
  "note": "",
  "branches": [
   [
    "Civil",
    60,
    "civil"
   ],
   [
    "CSE",
    60,
    "cse"
   ],
   [
    "EE",
    60,
    "ee"
   ],
   [
    "ECE",
    60,
    "ece"
   ],
   [
    "IT",
    30,
    "it"
   ],
   [
    "Mechanical",
    60,
    "mechanical"
   ]
  ],
  "seats": 330,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "REAP 2024 seat matrix (Careers360)"
 },
 {
  "slug": "gec-karauli",
  "name": "Government Engineering College, Karauli",
  "short": [
   "GEC Karauli"
  ],
  "city": "Karauli",
  "govt": true,
  "address": "Village-Manchi, Tahshil-Karauli, Near Mega Highway, Karauli-322241",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "Civil",
    54,
    "civil"
   ],
   [
    "CSE",
    54,
    "cse"
   ],
   [
    "EE",
    54,
    "ee"
   ],
   [
    "ECE",
    54,
    "ece"
   ],
   [
    "Mechanical",
    54,
    "mechanical"
   ]
  ],
  "seats": 270,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "REAP 2024 seat matrix (Careers360)"
 },
 {
  "slug": "mlvtec",
  "logo": "/logos/mlvtec.webp",
  "web": "https://mlvti.ac.in/",
  "name": "M. L. V. Textile & Engineering College",
  "short": [
   "MLVTEC",
   "MLV Bhilwara"
  ],
  "city": "Bhilwara",
  "govt": true,
  "address": "Pratap Nagar Pur Road Bhilwara--311001",
  "programmes": [
   "B.Tech",
   "M.Tech"
  ],
  "note": "",
  "branches": [
   [
    "ECE",
    60,
    "ece"
   ],
   [
    "IT",
    60,
    "it"
   ],
   [
    "Mechanical",
    60,
    "mechanical"
   ],
   [
    "Textile Chemistry",
    40,
    null
   ],
   [
    "Textile Technology",
    119,
    null
   ]
  ],
  "seats": 339,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "REAP 2024 seat matrix (Careers360)"
 },
 {
  "slug": "advait-vedanta-institute-of-technology",
  "logo": "/logos/advait-vedanta-institute-of-technology.webp",
  "name": "Advait Vedanta Institute of Technology",
  "short": [],
  "city": "Jaipur",
  "govt": false,
  "address": "Adved Knowledge Park Kanota-Sambhariya Road Village Gangarampura Tehsil-Bassi Dist. Jaipur- 303903",
  "programmes": [
   "B.Tech"
  ],
  "note": "No admission category in 2019-20",
  "branches": [],
  "seats": null
 },
 {
  "slug": "anand-international-college-of-engineering",
  "logo": "/logos/anand-international-college-of-engineering.webp",
  "web": "https://anandice.ac.in/",
  "name": "Anand International College of Engineering",
  "short": [],
  "city": "Jaipur",
  "govt": false,
  "address": "814, Near Kanota Agra Road Jaipur-303012",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "CSE (AI)",
    120,
    "cse-ai"
   ],
   [
    "CSE",
    120,
    "cse"
   ],
   [
    "Civil",
    60,
    "civil"
   ],
   [
    "Data Science",
    60,
    null
   ],
   [
    "EE",
    60,
    "ee"
   ],
   [
    "Mechanical",
    30,
    "mechanical"
   ]
  ],
  "seats": 450,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "aits-udaipur",
  "logo": "/logos/aits-udaipur.webp",
  "web": "https://aravalieducation.org/",
  "name": "Aravali Institute of Technical Studies",
  "short": [
   "AITS Udaipur"
  ],
  "city": "Udaipur",
  "govt": false,
  "address": "Umarada Railway Station Udaipur-313015",
  "programmes": [
   "B.Tech",
   "M.Tech",
   "MCA"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    60,
    "cse"
   ],
   [
    "ECE",
    30,
    "ece"
   ],
   [
    "Mechanical",
    30,
    "mechanical"
   ],
   [
    "Civil",
    30,
    "civil"
   ],
   [
    "EE",
    30,
    "ee"
   ],
   [
    "CSE (AI)",
    30,
    "cse-ai"
   ]
  ],
  "seats": 210,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "aceit",
  "logo": "/logos/aceit.webp",
  "web": "https://www.aryacollege.in/",
  "name": "Arya College of Engineering & Information Technology",
  "short": [
   "ACEIT",
   "Arya College Kukas"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "SP-42 Kukas Industrial Area (RIICO) Delhi Road Kukas Jaipur-302028",
  "programmes": [
   "B.Tech",
   "M.Tech",
   "MBA"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    300,
    "cse"
   ],
   [
    "AI & DS",
    180,
    "ai-ds"
   ],
   [
    "ECE",
    120,
    "ece"
   ],
   [
    "IT",
    120,
    "it"
   ],
   [
    "EE",
    60,
    "ee"
   ],
   [
    "Mechanical",
    60,
    "mechanical"
   ]
  ],
  "seats": 840,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "acerc",
  "logo": "/logos/acerc.webp",
  "web": "https://aryacollege.org/acerc",
  "name": "Arya College of Engineering & Research Centre",
  "short": [
   "ACERC"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "SP-40 Kukas Industrial Area (RIICO) Kukas Jaipur-302028",
  "programmes": [
   "B.Tech",
   "M.Tech"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    360,
    "cse"
   ],
   [
    "CSE (AI)",
    120,
    "cse-ai"
   ],
   [
    "AI & DS",
    120,
    "ai-ds"
   ],
   [
    "Cyber Security",
    60,
    null
   ],
   [
    "Civil",
    30,
    "civil"
   ],
   [
    "EE",
    30,
    "ee"
   ],
   [
    "Mechanical",
    30,
    "mechanical"
   ],
   [
    "ECE",
    30,
    "ece"
   ]
  ],
  "seats": 780,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "aiet",
  "logo": "/logos/aiet.webp",
  "web": "https://www.aryainstitutejpr.com/",
  "name": "Arya Institute of Engineering & Technology",
  "short": [
   "AIET"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "SP-40 Kukas Industrial Area (RIICO) Kukas Jaipur-302028",
  "programmes": [
   "B.Tech",
   "M.Tech",
   "MBA"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    360,
    "cse"
   ],
   [
    "AI & DS",
    120,
    "ai-ds"
   ],
   [
    "CSE (AI)",
    120,
    "cse-ai"
   ],
   [
    "Cyber Security",
    60,
    null
   ],
   [
    "IT",
    60,
    "it"
   ],
   [
    "Civil",
    30,
    "civil"
   ],
   [
    "EE",
    30,
    "ee"
   ],
   [
    "ECE",
    30,
    "ece"
   ],
   [
    "Mechanical",
    30,
    "mechanical"
   ]
  ],
  "seats": 840,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360 (now Arya College of Engineering)"
 },
 {
  "slug": "aietm",
  "logo": "/logos/aietm.webp",
  "web": "https://www.aryacollege.org/aietm/",
  "name": "Arya Institute of Engineering Technology & Management",
  "short": [
   "AIETM"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "F-29 Omaxe City Phase-II Jaipur Ajmer Express Highway Jaipur Rajasthan-302026",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    null,
    "cse"
   ],
   [
    "CSE (AI)",
    null,
    "cse-ai"
   ],
   [
    "CS & Design",
    null,
    null
   ],
   [
    "Civil",
    null,
    "civil"
   ],
   [
    "EE",
    null,
    "ee"
   ],
   [
    "Mechanical",
    null,
    "mechanical"
   ]
  ],
  "seats": null,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "asians-institute-of-technology",
  "logo": "/logos/asians-institute-of-technology.webp",
  "name": "Asians Institute of Technology",
  "short": [],
  "city": "Tonk",
  "govt": false,
  "address": "Post-Luhara, Tahsil-Neewai, Tonk-304019",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "Civil",
    null,
    "civil"
   ],
   [
    "Mechanical",
    null,
    "mechanical"
   ],
   [
    "EE",
    null,
    "ee"
   ],
   [
    "CSE",
    null,
    "cse"
   ]
  ],
  "seats": null,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "bkit",
  "logo": "/logos/bkit.webp",
  "web": "https://www.bkitkota.com/",
  "name": "Bal Krishna Institute of Technology",
  "short": [
   "BKIT",
   "BKIT Kota"
  ],
  "city": "Kota",
  "govt": false,
  "address": "IPC-15 RIICO Institutional Area Ranpur Kota Rajasthan-324005",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    30,
    "cse"
   ],
   [
    "Civil",
    30,
    "civil"
   ],
   [
    "EE",
    30,
    "ee"
   ],
   [
    "Automobile",
    15,
    "automobile"
   ],
   [
    "Mechanical",
    15,
    "mechanical"
   ]
  ],
  "seats": 120,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "baldev-ram-mirdha-institute-of-technology-east-campus",
  "logo": "/logos/baldev-ram-mirdha-institute-of-technology-east-campus.webp",
  "web": "https://www.bmitjaipur.org/",
  "name": "Baldev Ram Mirdha Institute of Technology (East Campus)",
  "short": [],
  "city": "Jaipur",
  "govt": false,
  "address": "ITS-3 IT Park EPIP Sitapura Jaipur-302022",
  "programmes": [
   "B.Tech"
  ],
  "note": "Did not take part in counselling in 2019-20",
  "branches": [],
  "seats": null
 },
 {
  "slug": "biff-and-bright-college-of-engineering-and-technology",
  "logo": "/logos/biff-and-bright-college-of-engineering-and-technology.webp",
  "web": "http://www.bbcetindia.org/",
  "name": "Biff & Bright College of Engineering & Technology",
  "short": [],
  "city": "Jaipur",
  "govt": false,
  "address": "Village & Post - Padasoli NH-8 Dudu Distt-Jaipur -303008",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [],
  "seats": null
 },
 {
  "slug": "chandrawati-group-of-institutions",
  "logo": "/logos/chandrawati-group-of-institutions.webp",
  "name": "Chandrawati Group of Institutions",
  "short": [],
  "city": "Bharatpur",
  "govt": false,
  "address": "NH-11 Opposite Ghana National Park Bharatpur - 321001",
  "programmes": [
   "B.Tech",
   "M.Tech",
   "MBA",
   "BHMCT"
  ],
  "note": "Did not take part in counselling in 2019-20",
  "branches": [
   [
    "Civil",
    null,
    "civil"
   ],
   [
    "Mechanical",
    null,
    "mechanical"
   ],
   [
    "CSE",
    null,
    "cse"
   ],
   [
    "ECE",
    null,
    "ece"
   ],
   [
    "EE",
    null,
    "ee"
   ]
  ],
  "seats": null,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "compucom-institute-of-technology-and-management",
  "logo": "/logos/compucom-institute-of-technology-and-management.webp",
  "web": "https://www.ciitm.org/",
  "name": "Compucom Institute of Technology & Management",
  "short": [],
  "city": "Jaipur",
  "govt": false,
  "address": "SP-3, 5, 5A, EPIP, RIICO Industrial Area Sitapura Jaipur-302022",
  "programmes": [
   "B.Tech",
   "M.Tech",
   "MBA"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    60,
    "cse"
   ],
   [
    "Civil",
    60,
    "civil"
   ],
   [
    "CSE (AI)",
    60,
    "cse-ai"
   ],
   [
    "EE",
    30,
    "ee"
   ],
   [
    "ECE",
    null,
    "ece"
   ]
  ],
  "seats": 210,
  "seatsPartial": true,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "dr-radhakrishnan-institute-of-technology",
  "logo": "/logos/dr-radhakrishnan-institute-of-technology.webp",
  "web": "https://www.dritjaipur.org/",
  "name": "Dr. Radhakrishnan Institute of Technology",
  "short": [],
  "city": "Jaipur",
  "govt": false,
  "address": "Kalwara Near Mahendra World City (Sez) Ajmer Road Jaipur-302037",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "EE",
    120,
    "ee"
   ],
   [
    "Mechanical",
    60,
    "mechanical"
   ],
   [
    "Civil",
    60,
    "civil"
   ],
   [
    "CSE",
    30,
    "cse"
   ],
   [
    "ECE",
    15,
    "ece"
   ]
  ],
  "seats": 285,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "gits",
  "logo": "/logos/gits.webp",
  "web": "https://gits.ac.in/",
  "name": "Geetanjali Institute of Technical Studies",
  "short": [
   "GITS",
   "GITS Udaipur"
  ],
  "city": "Udaipur",
  "govt": false,
  "address": "Airport Road Dabok, Taluka Mavli, Udaipur- 313022",
  "programmes": [
   "B.Tech",
   "M.Tech",
   "MBA",
   "MCA"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    240,
    "cse"
   ],
   [
    "EE",
    60,
    "ee"
   ],
   [
    "Mechanical",
    60,
    "mechanical"
   ],
   [
    "Civil",
    60,
    "civil"
   ],
   [
    "ECE",
    60,
    "ece"
   ],
   [
    "CSE (AI)",
    60,
    "cse-ai"
   ]
  ],
  "seats": 540,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "git",
  "logo": "/logos/git.webp",
  "web": "https://www.gitjaipur.com/",
  "name": "Global Institute of Technology",
  "short": [
   "GIT",
   "GIT Jaipur"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "ITS-1 IT Park EPIP Sitapura Jaipur-302022",
  "programmes": [
   "B.Tech",
   "M.Tech",
   "MBA"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    240,
    "cse"
   ],
   [
    "IT",
    60,
    "it"
   ],
   [
    "Civil",
    60,
    "civil"
   ],
   [
    "AI & DS",
    60,
    "ai-ds"
   ],
   [
    "EE",
    30,
    "ee"
   ],
   [
    "CSE (Cyber Security)",
    30,
    null
   ],
   [
    "CSE (IoT)",
    30,
    null
   ],
   [
    "Mechanical",
    30,
    "mechanical"
   ]
  ],
  "seats": 540,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "giet-kota",
  "logo": "/logos/giet-kota.webp",
  "web": "http://gurukulkota.org/",
  "name": "Gurukul Institute of Engineering & Technology",
  "short": [
   "GIET Kota"
  ],
  "city": "Kota",
  "govt": false,
  "address": "IPB-13 RIICO Institutional Area Ranpur Kota- 325003",
  "programmes": [
   "B.Tech",
   "M.Tech"
  ],
  "note": "",
  "branches": [
   [
    "Civil",
    60,
    "civil"
   ],
   [
    "CSE",
    45,
    "cse"
   ],
   [
    "EE",
    45,
    "ee"
   ],
   [
    "Mechanical",
    45,
    "mechanical"
   ],
   [
    "ECE",
    null,
    "ece"
   ]
  ],
  "seats": 195,
  "seatsPartial": true,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "jgiet",
  "logo": "/logos/jgiet.webp",
  "web": "https://www.jnit.org/",
  "name": "Jagannath Gupta Institute of Engineering & Technology",
  "short": [
   "JGIET"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "Plot No. IP-2&3 Phase IV Sitapura Industrial Area Opp. Chokhi Dhani Jaipur-302022",
  "programmes": [
   "B.Tech"
  ],
  "note": "Did not take part in counselling in 2019-20",
  "branches": [
   [
    "CSE",
    null,
    "cse"
   ],
   [
    "Civil",
    null,
    "civil"
   ],
   [
    "EE",
    null,
    "ee"
   ],
   [
    "Mechanical",
    null,
    "mechanical"
   ],
   [
    "ECE",
    null,
    "ece"
   ]
  ],
  "seats": null,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "jec",
  "logo": "/logos/jec.webp",
  "web": "https://www.jeckukas.org.in/",
  "name": "Jaipur Engineering College",
  "short": [
   "JEC",
   "JEC Kukas"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "SP-43 RIICO Industrial Area Kukas Jaipur- 303101",
  "programmes": [
   "B.Tech",
   "M.Tech"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    180,
    "cse"
   ],
   [
    "CSE (AI)",
    120,
    "cse-ai"
   ],
   [
    "Mechanical",
    60,
    "mechanical"
   ],
   [
    "EE",
    60,
    "ee"
   ],
   [
    "Civil",
    60,
    "civil"
   ],
   [
    "ECE",
    30,
    "ece"
   ]
  ],
  "seats": 510,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "jecrc",
  "logo": "/logos/jecrc.webp",
  "web": "https://jecrcfoundation.com/",
  "name": "Jaipur Engineering College & Research Centre",
  "short": [
   "JECRC",
   "JECRC Foundation"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "Sri Ram Ki Nangal, Via-Vitika, Opp. EPIP Gate, Tonk Road, Jaipur-302022",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    480,
    "cse"
   ],
   [
    "CSE (AI)",
    360,
    "cse-ai"
   ],
   [
    "AI & DS",
    240,
    "ai-ds"
   ],
   [
    "ECE",
    180,
    "ece"
   ],
   [
    "IT",
    180,
    "it"
   ],
   [
    "EE",
    60,
    "ee"
   ],
   [
    "Civil",
    60,
    "civil"
   ],
   [
    "Mechanical",
    30,
    "mechanical"
   ]
  ],
  "seats": 1590,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "jiem",
  "logo": "/logos/jiem.webp",
  "name": "Jaipur Institute of Engineering and Management",
  "short": [
   "JIEM"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "NH-8 Jaipur - Ajmer Highway Village - Gadota Jaipur-303007",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "Mechanical",
    30,
    "mechanical"
   ],
   [
    "EE",
    30,
    "ee"
   ],
   [
    "CSE",
    30,
    "cse"
   ],
   [
    "Civil",
    30,
    "civil"
   ]
  ],
  "seats": 120,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "jit",
  "logo": "/logos/jit.webp",
  "web": "https://jitjaipur.com/",
  "name": "Jaipur Institute of Technology - Group of Institutions",
  "short": [
   "JIT",
   "JIT Jaipur"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "Newta - Kalwara Road Kalwara Sanganer Distt. - Jaipur -303007",
  "programmes": [
   "B.Tech",
   "M.Tech"
  ],
  "note": "",
  "branches": [
   [
    "Civil",
    72,
    "civil"
   ],
   [
    "Mechanical",
    72,
    "mechanical"
   ],
   [
    "EE",
    72,
    "ee"
   ],
   [
    "CSE",
    48,
    "cse"
   ],
   [
    "ECE",
    24,
    "ece"
   ]
  ],
  "seats": 288,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "kite",
  "logo": "/logos/kite.webp",
  "web": "http://www.kautilya.net/",
  "name": "Kautilya Institute of Technology & Engineering",
  "short": [
   "KITE"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "ISI-16, RIICO Institutional Complex, Kautilya Circle, Sitapura, Jaipur -302022",
  "programmes": [
   "B.Tech",
   "M.Tech",
   "MBA"
  ],
  "note": "",
  "branches": [
   [
    "Civil",
    240,
    "civil"
   ],
   [
    "EE",
    60,
    "ee"
   ],
   [
    "Mechanical",
    60,
    "mechanical"
   ],
   [
    "CSE",
    30,
    "cse"
   ]
  ],
  "seats": 390,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "maharani-girls-engineering-college",
  "logo": "/logos/maharani-girls-engineering-college.webp",
  "web": "http://mgec.ac.in/",
  "name": "Maharani Girls Engineering College",
  "short": [],
  "city": "Jaipur",
  "govt": false,
  "address": "Kalwara Near Mahendra World City (Sez) Ajmer Road Jaipur-302037",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    30,
    "cse"
   ],
   [
    "ECE",
    15,
    "ece"
   ],
   [
    "EEE",
    15,
    "eee"
   ],
   [
    "Civil",
    15,
    "civil"
   ]
  ],
  "seats": 75,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "maiet",
  "logo": "/logos/maiet.webp",
  "web": "http://www.maietindia.org/",
  "name": "Maharishi Arvind Institute of Engineering & Technology",
  "short": [
   "MAIET"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "Sector-7 Madhyam Marg Mansarovar Jaipur- 302020",
  "programmes": [
   "B.Tech",
   "M.Tech",
   "MBA"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    60,
    "cse"
   ],
   [
    "Mechanical",
    60,
    "mechanical"
   ],
   [
    "Civil",
    60,
    "civil"
   ],
   [
    "EE",
    60,
    "ee"
   ]
  ],
  "seats": 240,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "maiit",
  "logo": "/logos/maiit.webp",
  "name": "Maharishi Arvind International Institute of Technology",
  "short": [
   "MAIIT"
  ],
  "city": "Kota",
  "govt": false,
  "address": "IPA-1 RIICO, Institutional Area, Jhalawar Road, Ranpur Kota-325003",
  "programmes": [
   "B.Tech",
   "M.Tech",
   "MBA"
  ],
  "note": "",
  "branches": [
   [
    "Civil",
    120,
    "civil"
   ],
   [
    "CSE",
    90,
    "cse"
   ],
   [
    "Mechanical",
    60,
    "mechanical"
   ],
   [
    "EE",
    60,
    "ee"
   ]
  ],
  "seats": 330,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "mgec-jaipur",
  "logo": "/logos/mgec-jaipur.webp",
  "web": "https://mgecjaipur.com/",
  "name": "Mahatma Gandhi Engineering College",
  "short": [
   "MGEC Jaipur"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "Bada Padampura Road Shivdaspura Tonk Road Jaipur-303903",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    null,
    "cse"
   ],
   [
    "Mechanical",
    null,
    "mechanical"
   ],
   [
    "ECE",
    null,
    "ece"
   ],
   [
    "Civil",
    null,
    "civil"
   ],
   [
    "EE",
    null,
    "ee"
   ]
  ],
  "seats": null,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "mit-kota",
  "logo": "/logos/mit-kota.webp",
  "web": "https://mitkota.com/",
  "name": "Modi Institute of Technology",
  "short": [
   "MIT Kota"
  ],
  "city": "Kota",
  "govt": false,
  "address": "Nayagaon Rawatbhata Road Post Office-Borabas Kota-324001",
  "programmes": [
   "B.Tech",
   "M.Tech"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    60,
    "cse"
   ],
   [
    "AI & DS",
    60,
    "ai-ds"
   ],
   [
    "Mechanical",
    60,
    "mechanical"
   ],
   [
    "EE",
    60,
    "ee"
   ],
   [
    "ECE",
    30,
    "ece"
   ]
  ],
  "seats": 270,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "niet-nathdwara",
  "logo": "/logos/niet-nathdwara.webp",
  "web": "https://ngi.edu.in/niet/",
  "name": "Nathdwara Institute of Engineering & Technology",
  "short": [
   "NIET Nathdwara"
  ],
  "city": "Rajsamand",
  "govt": false,
  "address": "Upali Oden Nathdwara Distt. - Rajsamand (Raj.)- 313301",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "Civil",
    60,
    "civil"
   ],
   [
    "ECE",
    30,
    "ece"
   ],
   [
    "EE",
    30,
    "ee"
   ],
   [
    "Mechanical",
    30,
    "mechanical"
   ]
  ],
  "seats": 150,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "pacific-college-of-engineering",
  "logo": "/logos/pacific-college-of-engineering.webp",
  "name": "Pacific College of Engineering",
  "short": [],
  "city": "Udaipur",
  "govt": false,
  "address": "P.B. No. 12, Pratap Nagar Extension Airport Road Udaipur-313003",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [],
  "seats": null
 },
 {
  "slug": "pinkcity-engineering-college-and-research-centre",
  "logo": "/logos/pinkcity-engineering-college-and-research-centre.webp",
  "web": "http://www.pecrc.in/",
  "name": "Pinkcity Engineering College & Research Centre",
  "short": [],
  "city": "Jaipur",
  "govt": false,
  "address": "Gawar Jatan, Sanganer Jaipur-303905",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "Civil",
    null,
    "civil"
   ],
   [
    "CSE",
    null,
    "cse"
   ],
   [
    "EE",
    null,
    "ee"
   ],
   [
    "ECE",
    null,
    "ece"
   ],
   [
    "Mechanical",
    null,
    "mechanical"
   ]
  ],
  "seats": null,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "pce",
  "logo": "/logos/pce.webp",
  "web": "https://www.poornima.org/",
  "name": "Poornima College of Engineering",
  "short": [
   "PCE",
   "Poornima College"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "ISI-6 RIICO Institutional Area Goner Road Sitapura Jaipur-302022",
  "programmes": [
   "B.Tech",
   "M.Tech"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    180,
    "cse"
   ],
   [
    "EE",
    60,
    "ee"
   ],
   [
    "ECE",
    60,
    "ece"
   ],
   [
    "IT",
    60,
    "it"
   ],
   [
    "Mechanical",
    60,
    "mechanical"
   ],
   [
    "Cyber Security",
    60,
    null
   ],
   [
    "Civil",
    60,
    "civil"
   ],
   [
    "CSE (AI)",
    60,
    "cse-ai"
   ],
   [
    "AI & DS",
    60,
    "ai-ds"
   ]
  ],
  "seats": 660,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "pgi",
  "logo": "/logos/pgi.webp",
  "name": "Poornima Group of Institutions - Faculty of Engineering & Faculty of Management",
  "short": [
   "PGI",
   "Poornima Group"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "BT-1 Bio-Technology Park RIICO Sitapura Jaipur-302022",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    240,
    "cse"
   ],
   [
    "Data Science",
    60,
    null
   ],
   [
    "CSE (AI)",
    60,
    "cse-ai"
   ],
   [
    "AI & DS",
    60,
    "ai-ds"
   ],
   [
    "IoT",
    60,
    null
   ]
  ],
  "seats": 480,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "piet",
  "web": "http://www.piet.poornima.org/",
  "name": "Poornima Institute of Engineering & Technology",
  "short": [
   "PIET"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "ISI-2 RIICO Institutional Area Goner Road Sitapura Jaipur-302022",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    240,
    "cse"
   ],
   [
    "Data Science",
    60,
    null
   ],
   [
    "AI & DS",
    60,
    "ai-ds"
   ],
   [
    "CSE (AI)",
    60,
    "cse-ai"
   ],
   [
    "IoT",
    60,
    null
   ],
   [
    "ECE",
    30,
    "ece"
   ],
   [
    "EE",
    30,
    "ee"
   ]
  ],
  "seats": 540,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "rcew",
  "logo": "/logos/rcew.webp",
  "web": "https://rcew.ac.in/",
  "name": "Rajasthan College of Engineering for Women",
  "short": [
   "RCEW"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "Bhankrota Ajmer Road Jaipur-302026",
  "programmes": [
   "B.Tech",
   "M.Tech",
   "MBA",
   "MCA"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    120,
    "cse"
   ],
   [
    "CSE (AI)",
    60,
    "cse-ai"
   ],
   [
    "ECE",
    60,
    "ece"
   ],
   [
    "Civil",
    30,
    "civil"
   ],
   [
    "AI & DS",
    30,
    "ai-ds"
   ],
   [
    "EE",
    30,
    "ee"
   ]
  ],
  "seats": 330,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "rajasthan-engineering-college",
  "logo": "/logos/rajasthan-engineering-college.webp",
  "web": "https://www.rajasthangroupofcolleges.com/",
  "name": "Rajasthan Engineering College",
  "short": [],
  "city": "Dausa",
  "govt": false,
  "address": "Somnath Nagar,Ganeshpura Road, Dausa-303303",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "EE",
    120,
    "ee"
   ],
   [
    "Civil",
    90,
    "civil"
   ],
   [
    "Mechanical",
    15,
    "mechanical"
   ]
  ],
  "seats": 225,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "riet-chittorgarh",
  "logo": "/logos/riet-chittorgarh.webp",
  "name": "Rajasthan Institute of Engineering & Technology",
  "short": [
   "RIET Chittorgarh"
  ],
  "city": "Chittorgarh",
  "govt": false,
  "address": "Village-Aachoda PO-Samelpura, Chittor-Kota Highway, Chittorgarh-312001",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    null,
    "cse"
   ],
   [
    "Civil",
    null,
    "civil"
   ],
   [
    "EE",
    null,
    "ee"
   ],
   [
    "ECE",
    null,
    "ece"
   ],
   [
    "Mechanical",
    null,
    "mechanical"
   ]
  ],
  "seats": null,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "riet",
  "logo": "/logos/riet.webp",
  "web": "https://www.rietjaipur.ac.in/",
  "name": "Rajasthan Institute of Engineering & Technology",
  "short": [
   "RIET",
   "RIET Jaipur"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "Bhankrota Ajmer Road Jaipur-302026",
  "programmes": [
   "B.Tech",
   "M.Tech",
   "MBA",
   "MCA"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    120,
    "cse"
   ],
   [
    "AI & DS",
    120,
    "ai-ds"
   ],
   [
    "Cyber Security",
    60,
    null
   ],
   [
    "ECE",
    34,
    "ece"
   ],
   [
    "Mechanical",
    30,
    "mechanical"
   ],
   [
    "Civil",
    30,
    "civil"
   ],
   [
    "IoT",
    30,
    null
   ],
   [
    "EE",
    30,
    "ee"
   ],
   [
    "IT",
    30,
    "it"
   ],
   [
    "EEE",
    30,
    "eee"
   ],
   [
    "CS & Design",
    30,
    null
   ]
  ],
  "seats": 544,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "rajdhani-engineering-college",
  "logo": "/logos/rajdhani-engineering-college.webp",
  "web": "https://rajdhanijaipur.org/",
  "name": "Rajdhani Engineering College",
  "short": [],
  "city": "Jaipur",
  "govt": false,
  "address": "Rohini Nagar Phase - I Sanganer Renwal Road Jaipur-303904",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "Civil",
    120,
    "civil"
   ],
   [
    "Mechanical",
    60,
    "mechanical"
   ],
   [
    "EE",
    60,
    "ee"
   ],
   [
    "CSE (AI)",
    60,
    "cse-ai"
   ]
  ],
  "seats": 300,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "rcert",
  "logo": "/logos/rcert.webp",
  "web": "https://regional.ac.in/",
  "name": "Regional College for Education Research & Technology",
  "short": [
   "RCERT"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "ISI-17 RIICO Institutional Area Sitapura Jaipur- 302022",
  "programmes": [
   "B.Tech",
   "M.Tech",
   "MBA",
   "MCA"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    120,
    "cse"
   ],
   [
    "Mechanical",
    90,
    "mechanical"
   ],
   [
    "Civil",
    90,
    "civil"
   ],
   [
    "EE",
    90,
    "ee"
   ],
   [
    "ECE",
    30,
    "ece"
   ]
  ],
  "seats": 420,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "s-s-college-of-engineering",
  "logo": "/logos/s-s-college-of-engineering.webp",
  "name": "S. S. College of Engineering",
  "short": [],
  "city": "Udaipur",
  "govt": false,
  "address": "Jamar Kotra Road, Post-Umarda, Panchayat- Kanpur, Udaipur-313001",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "Civil",
    null,
    "civil"
   ],
   [
    "CSE",
    null,
    "cse"
   ],
   [
    "EE",
    null,
    "ee"
   ],
   [
    "Mechanical",
    null,
    "mechanical"
   ],
   [
    "Mining",
    null,
    "mining"
   ]
  ],
  "seats": null,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "sawai-madhopur-college-of-engineering-and-technology",
  "logo": "/logos/sawai-madhopur-college-of-engineering-and-technology.webp",
  "name": "Sawai Madhopur College of Engineering and Technology",
  "short": [],
  "city": "Sawai Madhopur",
  "govt": false,
  "address": "Village-Thingla Sawai Madhopur Rajasthan- 322001",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "Civil",
    30,
    "civil"
   ],
   [
    "Mechanical",
    30,
    "mechanical"
   ],
   [
    "EE",
    30,
    "ee"
   ],
   [
    "CSE",
    30,
    "cse"
   ],
   [
    "ECE",
    30,
    "ece"
   ]
  ],
  "seats": 150,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "shankara-institute-of-technology",
  "logo": "/logos/shankara-institute-of-technology.webp",
  "web": "https://shankaratechnology.org/",
  "name": "Shankara Institute of Technology",
  "short": [],
  "city": "Jaipur",
  "govt": false,
  "address": "SP-44 RIICO Industrial Area Kukas Jaipur- 302028",
  "programmes": [
   "B.Tech",
   "MBA",
   "MCA"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    90,
    "cse"
   ],
   [
    "Mechanical",
    60,
    "mechanical"
   ],
   [
    "EE",
    60,
    "ee"
   ],
   [
    "IT",
    60,
    "it"
   ],
   [
    "ECE",
    30,
    "ece"
   ],
   [
    "Automobile",
    30,
    "automobile"
   ]
  ],
  "seats": 330,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "shree-bhawani-niketan-institute-of-technology-and-management",
  "web": "https://sbnitm.com/",
  "name": "Shree Bhawani Niketan Institute of Technology & Management",
  "short": [],
  "city": "Jaipur",
  "govt": false,
  "address": "Shree Bhawani Niketan Shiksha Samiti Campus Maharao Shekha Circle, Near Chomu Pulia, Sikar Road, Jaipur-302023",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [],
  "seats": null
 },
 {
  "slug": "shri-digamber-institute-of-technology",
  "logo": "/logos/shri-digamber-institute-of-technology.webp",
  "web": "http://www.sditdausa.in/",
  "name": "Shri Digamber Institute of Technology",
  "short": [],
  "city": "Dausa",
  "govt": false,
  "address": "NH-11, Mitrapura, Bhandarej Mode, Dausa-303501",
  "programmes": [
   "B.Tech",
   "M.Tech"
  ],
  "note": "",
  "branches": [
   [
    "EE",
    60,
    "ee"
   ],
   [
    "Civil",
    60,
    "civil"
   ],
   [
    "CSE",
    30,
    "cse"
   ],
   [
    "Mechanical",
    15,
    "mechanical"
   ]
  ],
  "seats": 165,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "site-nathdwara",
  "logo": "/logos/site-nathdwara.webp",
  "web": "https://shrinathjiinstitute.com/",
  "name": "Shrinathji Institute of Technology & Engineering",
  "short": [
   "SITE Nathdwara"
  ],
  "city": "Rajsamand",
  "govt": false,
  "address": "Upali Oden Nathdwara, Rajsamand-313301",
  "programmes": [
   "B.Tech",
   "M.Tech",
   "MBA"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    120,
    "cse"
   ],
   [
    "Mechanical",
    60,
    "mechanical"
   ],
   [
    "EE",
    60,
    "ee"
   ]
  ],
  "seats": 240,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "sine-international-institute-of-technology",
  "logo": "/logos/sine-international-institute-of-technology.webp",
  "name": "Sine International Institute of Technology",
  "short": [],
  "city": "Jaipur",
  "govt": false,
  "address": "Balawala -Lakhna Road Via Sanganer Bazar Jaipur-302029",
  "programmes": [
   "B.Tech"
  ],
  "note": "Did not take part in counselling in 2019-20",
  "branches": [],
  "seats": null
 },
 {
  "slug": "sbcet",
  "logo": "/logos/sbcet.webp",
  "web": "https://sbcet.sbss.ac.in/",
  "name": "Sri Balaji College of Engineering & Technology",
  "short": [
   "SBCET"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "Village-Macheda, Tehsil-Ajmer, Benad Road Dadi Ka Phatak Jaipur-302013",
  "programmes": [
   "B.Tech",
   "M.Tech",
   "MCA"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    60,
    "cse"
   ],
   [
    "CSE (AI)",
    60,
    "cse-ai"
   ],
   [
    "Mechanical",
    30,
    "mechanical"
   ],
   [
    "EE",
    30,
    "ee"
   ],
   [
    "Civil",
    30,
    "civil"
   ],
   [
    "Data Science",
    30,
    null
   ],
   [
    "Cyber Security",
    30,
    null
   ]
  ],
  "seats": 270,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "stani-memorial-college-of-engineering-and-technology",
  "logo": "/logos/stani-memorial-college-of-engineering-and-technology.webp",
  "web": "https://www.smcet.in/",
  "name": "Stani Memorial College of Engineering & Technology",
  "short": [],
  "city": "Jaipur",
  "govt": false,
  "address": "Phagi Jaipur-303005",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    60,
    "cse"
   ],
   [
    "EE",
    60,
    "ee"
   ],
   [
    "Civil",
    60,
    "civil"
   ],
   [
    "Mechanical",
    60,
    "mechanical"
   ],
   [
    "ECE",
    30,
    "ece"
   ],
   [
    "CSE (AI)",
    30,
    "cse-ai"
   ]
  ],
  "seats": 300,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "skit",
  "logo": "/logos/skit.webp",
  "web": "https://www.skit.ac.in/",
  "name": "Swami Keshvanand Institute of Technology, Management & Gramothan",
  "short": [
   "SKIT",
   "SKIT Jaipur"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "Ramnagaria Jagatpura Jaipur-302017",
  "programmes": [
   "B.Tech",
   "M.Tech",
   "MBA"
  ],
  "note": "",
  "branches": [
   [
    "CSE (AI)",
    360,
    "cse-ai"
   ],
   [
    "CSE",
    360,
    "cse"
   ],
   [
    "IT",
    180,
    "it"
   ],
   [
    "ECE",
    120,
    "ece"
   ],
   [
    "Civil",
    120,
    "civil"
   ],
   [
    "CSE (Data Science)",
    120,
    null
   ],
   [
    "EE",
    90,
    "ee"
   ],
   [
    "IoT",
    60,
    null
   ],
   [
    "Mechanical",
    60,
    "mechanical"
   ]
  ],
  "seats": 1470,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "techno-njr",
  "logo": "/logos/techno-njr.webp",
  "web": "https://www.technonjr.org/",
  "name": "Techno India NJR Institute of Technology",
  "short": [
   "Techno NJR",
   "TINJRIT"
  ],
  "city": "Udaipur",
  "govt": false,
  "address": "Plot-SPL-T Bhamashah Industrial Area Kaladwas Udaipur-313003",
  "programmes": [
   "B.Tech",
   "M.Tech"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    180,
    "cse"
   ],
   [
    "AI & DS",
    60,
    "ai-ds"
   ],
   [
    "ECE",
    60,
    "ece"
   ],
   [
    "Civil",
    30,
    "civil"
   ],
   [
    "Mechanical",
    null,
    "mechanical"
   ],
   [
    "Mechatronics",
    null,
    "mechatronics"
   ],
   [
    "EE",
    null,
    "ee"
   ]
  ],
  "seats": 330,
  "seatsPartial": true,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "vedant-college-of-engineering-and-technology",
  "logo": "/logos/vedant-college-of-engineering-and-technology.webp",
  "name": "Vedant College of Engineering & Technology",
  "short": [],
  "city": "Bundi",
  "govt": false,
  "address": "Village-Tulsi Post-Jhakmund Distt- Bundi - 323021",
  "programmes": [
   "B.Tech",
   "M.Tech"
  ],
  "note": "",
  "branches": [
   [
    "EE",
    60,
    "ee"
   ],
   [
    "EEE",
    60,
    "eee"
   ],
   [
    "Mechanical",
    30,
    "mechanical"
   ],
   [
    "CSE",
    30,
    "cse"
   ],
   [
    "ECE",
    null,
    "ece"
   ],
   [
    "Civil",
    null,
    "civil"
   ]
  ],
  "seats": 180,
  "seatsPartial": true,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "vedic-gurukul-institute-of-engineering-and-technology",
  "logo": "/logos/vedic-gurukul-institute-of-engineering-and-technology.webp",
  "name": "Vedic Gurukul Institute of Engineering & Technology",
  "short": [],
  "city": "Jaipur",
  "govt": false,
  "address": "Gram-Pawalia, Tehsil-Sanaganer, Khasra Number- 173-180,247,249, Distt.-Jaipur-302014",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [],
  "seats": null
 },
 {
  "slug": "vit-jaipur",
  "logo": "/logos/vit-jaipur.webp",
  "web": "https://vitj.ac.in/",
  "name": "Vivekanand Institute of Technology",
  "short": [
   "VIT Jaipur"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "Sisyawas NRI Road Jagatpura Jaipur-303012",
  "programmes": [
   "B.Tech"
  ],
  "note": "",
  "branches": [
   [
    "CSE",
    null,
    "cse"
   ],
   [
    "Civil",
    null,
    "civil"
   ],
   [
    "EE",
    null,
    "ee"
   ],
   [
    "Mechanical",
    null,
    "mechanical"
   ]
  ],
  "seats": null,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 },
 {
  "slug": "yit",
  "logo": "/logos/yit.webp",
  "web": "https://www.yitjaipur.com/",
  "name": "Yagyavalkya Institute of Technology",
  "short": [
   "YIT"
  ],
  "city": "Jaipur",
  "govt": false,
  "address": "IP-1, Phase-IV, RIICO Industrial Area, Sitapura, Tonk Road, Jaipur-302022-302022",
  "programmes": [
   "B.Tech",
   "M.Tech"
  ],
  "note": "",
  "branches": [
   [
    "Civil",
    120,
    "civil"
   ],
   [
    "EE",
    60,
    "ee"
   ],
   [
    "Mechanical",
    60,
    "mechanical"
   ],
   [
    "CSE",
    60,
    "cse"
   ],
   [
    "ECE",
    30,
    "ece"
   ]
  ],
  "seats": 330,
  "seatsPartial": false,
  "seatsKind": "intake",
  "dataSrc": "careers360"
 }
];

// RTU ke NAHI: apni university, apna syllabus aur exam (naam milte-julte hain, isliye alag dikhate hain)
export const NOT_RTU = [
  ['JECRC University, Jaipur', 'Private university (JECRC Foundation / Jaipur Engineering College & Research Centre is RTU)'],
  ['Poornima University, Jaipur', 'Private university (Poornima College of Engineering, PIET and PGI are RTU)'],
  ['Manipal University Jaipur', 'Private university'],
  ['Vivekananda Global University (VGU), Jaipur', 'Private university (Vivekanand Institute of Technology is RTU)'],
  ['Amity University, Jaipur', 'Private university'],
  ['Suresh Gyan Vihar University, Jaipur', 'Private university'],
  ['Jaipur National University', 'Private university'],
  ['LNMIIT, Jaipur', 'Deemed university'],
  ['Career Point University, Kota', 'Private university'],
  ['MBM University, Jodhpur', 'State university'],
  ['Bikaner Technical University and its colleges (Bikaner, Ajmer, Barmer, Jodhpur area)', 'Separate state technical university'],
  ['Apex Institute of Engineering & Technology, Jaipur', 'Now a constituent college of Apex University'],
  ['MNIT Jaipur, IIT Jodhpur, IIIT Kota', 'Central institutes']
];
