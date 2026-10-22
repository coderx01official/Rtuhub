#!/usr/bin/env python3
"""
jobs_live.py — rtuhub.in "Engineering Jobs" live feed (GitHub Action har 6 ghante -> "jobs-data" branch -> /api/jobs) (sirf B.Tech / engineering jobs)

SOURCES (sab public RSS / official APIs — koi captcha, login ya scraping-bypass nahi):
  1. Google News RSS search  -> govt recruitment + private hiring news (India)
  2. Job portals ke RSS feeds (WordPress /feed) -> off-campus drives, govt notifications
  3. Adzuna Jobs API (India)  -> real job listings (optional, free key)
  4. Company career boards (Greenhouse / Lever public JSON) -> fresher/intern roles (optional)

OUTPUT: out/jobs.json
  {checkedAt, everyHours, count, by_sector, sources, items:[{id,title,org,sector,type,branches,location,posted,
   start_date,last_date,vacancies,salary,link,source,tags}]}

RUN:   python tools/jobs_live.py   (pichla out/jobs.json ho to usme naye jod deta hai)
ENV (GitHub Secrets, optional): ADZUNA_APP_ID, ADZUNA_APP_KEY
"""
import os
import re
import sys
import json
import time
import html
import random
import hashlib
import urllib.parse
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

# ============================ CONFIG ============================
OUT_FILE = os.environ.get("JOBS_OUT", "out/jobs.json")
EVERY_HOURS = 6
KEEP_DAYS = 45                 # itne din purane items hata do (last date aage ho to rakho)
MAX_ITEMS = 700
GAP = (2.0, 5.0)               # har request ke beech random gap (sec) — IP block se bacho
UA = "Mozilla/5.0 (compatible; rtuhub-jobs/1.0; +https://rtuhub.in)"

ADZUNA_ID = os.environ.get("ADZUNA_APP_ID", "")
ADZUNA_KEY = os.environ.get("ADZUNA_APP_KEY", "")

GNEWS_GOVT = [
    "engineer recruitment notification", "junior engineer recruitment", "assistant engineer recruitment",
    "PSU recruitment through GATE", "engineer trainee recruitment", "executive trainee recruitment GATE",
    "ISRO scientist engineer recruitment", "DRDO engineer recruitment", "BARC recruitment engineer",
    "RRB JE recruitment", "SSC JE notification", "UPSC ESE notification",
    "RPSC AEN recruitment", "RSSB JEN recruitment", "Rajasthan junior engineer vacancy",
    "BHEL recruitment engineer", "NTPC recruitment engineer", "ONGC recruitment engineer",
    "IOCL recruitment engineer", "BEL recruitment engineer", "HAL recruitment engineer",
    "graduate apprentice engineering recruitment", "metro rail recruitment engineer",
    "JE admit card", "AE result engineering",
]
GNEWS_PRIVATE = [
    "off campus drive freshers B.Tech", "off campus drive 2026 batch", "off campus drive 2027 batch",
    "hiring freshers software engineer India", "graduate engineer trainee hiring",
    "TCS hiring freshers", "Infosys hiring freshers", "Wipro hiring freshers", "Accenture hiring freshers",
    "Cognizant hiring freshers", "Capgemini hiring freshers", "HCLTech hiring freshers",
    "Tech Mahindra hiring freshers", "LTIMindtree hiring freshers", "Deloitte hiring freshers",
    "internship engineering students India", "VLSI fresher jobs", "core engineering jobs freshers",
    "electrical engineer fresher hiring", "mechanical engineer fresher hiring", "civil engineer fresher hiring",
]
# (naam, url, default sector) — kisi feed ka URL band ho to script skip kar dega
RSS_FEEDS = [
    ("FreshersHunt", "https://freshershunt.in/feed/", "private"),
    ("OffCampusJobs4u", "https://offcampusjobs4u.com/feed/", "private"),
    ("FreeJobAlert", "https://www.freejobalert.com/feed/", "govt"),
]
ADZUNA_QUERIES = [
    "graduate engineer trainee", "fresher software engineer", "junior engineer fresher",
    "electrical engineer fresher", "mechanical engineer fresher", "civil engineer fresher",
    "electronics engineer fresher", "instrumentation engineer fresher", "engineering intern",
]
# Company career boards: boards.greenhouse.io/<token>  |  jobs.lever.co/<company>
GREENHOUSE_BOARDS = []         # e.g. ["company_token"]
LEVER_COMPANIES = []           # e.g. ["company"]
# ================================================================

IST = timezone(timedelta(hours=5, minutes=30))
NOW = datetime.now(IST)

# ------------------------------------------------------------------ http
def get(url, as_json=False, tries=2):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
            time.sleep(random.uniform(*GAP))
            return json.loads(data.decode("utf-8", "replace")) if as_json else data
        except urllib.error.HTTPError as e:
            if e.code in (403, 404, 410, 451):
                print(f"   ✗ {e.code} {url[:90]}")
                return None
            time.sleep(5 * (i + 1))
        except Exception as e:
            print(f"   ✗ {type(e).__name__} {url[:90]}")
            time.sleep(5 * (i + 1))
    return None


# ------------------------------------------------------------------ text helpers
def strip_html(s):
    s = re.sub(r"<[^>]+>", " ", s or "")
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


MONTHS = {m: i for i, m in enumerate(
    ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], 1)}
DATE_RE = re.compile(
    r"(?P<d1>\d{1,2})(?:ST|ND|RD|TH)?\s*(?:OF\s+)?(?P<m1>JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\.?,?\s*(?P<y1>20\d\d)?"
    r"|(?P<m2>JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\.?\s+(?P<d2>\d{1,2})(?:ST|ND|RD|TH)?,?\s*(?P<y2>20\d\d)?"
    r"|(?P<d3>\d{1,2})[./-](?P<m3>\d{1,2})[./-](?P<y3>20\d\d)")
LAST_KW = re.compile(r"(LAST\s*DATE|TILL|UNTIL|BEFORE|\bBY\b|CLOS(E|ES|ING)|DEADLINE|ENDS?\s*ON|UP\s*TO|UPTO|EXTENDED)[^0-9A-Z]{0,4}[A-Z ]{0,25}$")
START_KW = re.compile(r"(FROM|START(S|ING)?|BEGIN(S|NING)?|OPEN(S|ING)?|COMMENCE)[^0-9A-Z]{0,4}[A-Z ]{0,25}$")


def _mkdate(d, m, y):
    try:
        if y is None:
            y = NOW.year
            dt = datetime(y, m, d, tzinfo=IST)
            if (NOW - dt).days > 60:
                dt = datetime(y + 1, m, d, tzinfo=IST)
            return dt
        return datetime(int(y), m, d, tzinfo=IST)
    except ValueError:
        return None


def find_dates(text):
    """(start_date, last_date) ISO strings from text, if mentioned."""
    T = text.upper()
    start = last = None
    for m in DATE_RE.finditer(T):
        if m.group("d1"):
            dt = _mkdate(int(m.group("d1")), MONTHS[m.group("m1")[:3]], m.group("y1"))
        elif m.group("d2"):
            dt = _mkdate(int(m.group("d2")), MONTHS[m.group("m2")[:3]], m.group("y2"))
        else:
            mo = int(m.group("m3"))
            dt = _mkdate(int(m.group("d3")), mo, m.group("y3")) if 1 <= mo <= 12 else None
        if not dt:
            continue
        before = T[max(0, m.start() - 45):m.start()]
        if LAST_KW.search(before) and not last:
            last = dt
        elif START_KW.search(before) and not start:
            start = dt
    # "16 Nov to 15 Dec" -> range
    rng = re.search(r"(" + DATE_RE.pattern + r")\s*(TO|-|–|TILL)\s*(" + DATE_RE.pattern.replace("?P<", "?P<r_") + r")", T)
    if rng and not last:
        ds = [d for d in DATE_RE.finditer(rng.group(0))]
        if len(ds) >= 2:
            a, b = find_one(ds[0]), find_one(ds[-1])
            start, last = start or a, b
    f = lambda x: x.date().isoformat() if x else None
    return f(start), f(last)


def find_one(m):
    if m.group("d1"):
        return _mkdate(int(m.group("d1")), MONTHS[m.group("m1")[:3]], m.group("y1"))
    if m.group("d2"):
        return _mkdate(int(m.group("d2")), MONTHS[m.group("m2")[:3]], m.group("y2"))
    mo = int(m.group("m3"))
    return _mkdate(int(m.group("d3")), mo, m.group("y3")) if 1 <= mo <= 12 else None


# ------------------------------------------------------------------ classification
ENGG = re.compile(
    r"ENGINEER|ENGINEERING|ENGG|B\.?\s?TECH|\bB\.?\s?E\b|\bGATE\b|\bJEN?\b|\bAEN?\b|JUNIOR ENGINEER|ASSISTANT ENGINEER|"
    r"SCIENTIST|TECHNICAL OFFICER|SOFTWARE|DEVELOPER|\bSDE\b|PROGRAMMER|IT OFFICER|DATA (ANALYST|SCIENTIST|ENGINEER)|"
    r"GRADUATE (ENGINEER|TRAINEE|APPRENTICE)|\bGET\b|\bE?ET\b|EXECUTIVE TRAINEE|VLSI|EMBEDDED|ELECTRICAL|MECHANICAL|"
    r"CIVIL|ELECTRONICS|INSTRUMENTATION|CHEMICAL ENGINEER|\bESE\b|\bIES\b|OFF[\s-]?CAMPUS|FRESHERS?.*(TECH|IT|ENGINEER)|"
    r"TECHNICAL|CODING|HACKATHON|HACKQUEST|ANALYST TRAINEE|SYSTEMS? ENGINEER")
EXCLUDE = re.compile(
    r"10TH|12TH|CLASS\s*(10|12|X|XII)\b|MATRIC|NURS|\bTEACHERS?\b|\bTGT\b|\bPGT\b|PRT\b|CONSTABLE|POLICE|ANGANWADI|"
    r"\bCLERK|\bPEON|\bMTS\b|DRIVER|STENO|HOME GUARD|GRAMIN DAK|GDS\b|MBBS|PHARMACIST|LIBRARIAN|ACCOUNTANT|"
    r"JUDICIAL|\bLAW\b|PATWARI|NEET|\bJEE\s+(MAIN|ADVANCED)|CUET|BPO|CALL CENTER|VOICE PROCESS|TELECALLER|"
    r"\bAGNIVEER|GROUP D\b|STAFF NURSE|MEDICAL OFFICER|FACULTY|PROFESSOR|LECTURER|PRINCIPAL")
# title me hi engineering ka saaf signal chahiye (description me site ka menu/sidebar bhi aata hai)
ENGG_TITLE = re.compile(
    r"ENGINEER|ENGINEERING|ENGG|B\.?\s?TECH|\bB\.?\s?E\b|\bGATE\b|\bJEN?\b|\bAEN?\b|\bAEE\b|\bSAE\b|SCIENTIST|"
    r"TECHNICAL (OFFICER|ASSISTANT)|SOFTWARE|DEVELOPER|\bSDE\b|PROGRAMMER|IT OFFICER|DATA (ANALYST|SCIENTIST)|"
    r"GRADUATE (APPRENTICE|TRAINEE)|\bGET\b|EXECUTIVE TRAINEE|\bE?ET\b|MANAGEMENT TRAINEE|VLSI|EMBEDDED|OFF[\s-]?CAMPUS|"
    r"HACKATHON|HACKQUEST|CODEVITA|FRESHERS?|SYSTEMS? ENGINEER|ANALYST TRAINEE|\bESE\b|\bIES\b|CYBER SECURITY|DEVOPS|"
    r"FULL\s*STACK|\bCLOUD\b")
# PSU / tech org ki recruitment, title me "engineer" na bhi ho
TECH_ORG = re.compile(
    r"\bNTPC|BHEL|ONGC|IOCL|INDIAN OIL|\bGAIL|POWER ?GRID|PGCIL|\bSAIL\b|HPCL|BPCL|NHPC|THDC|NSPCL|NPCIL|\bBEL\b|"
    r"BHARAT ELECTRONICS|\bHAL\b|ISRO|DRDO|BARC|\bDMRC|METRO RAIL|\bRITES|IRCON|NHAI|CPWD|COAL INDIA|\bNLC\b|NMDC|"
    r"MECON|\bEIL\b|ENGINEERS INDIA|C-?DAC|SJVN|NEEPCO|RVUNL|RVPN|JVVNL|AVVNL|JDVVNL|GRID[- ]INDIA|TRANSCO|MAZAGON|"
    r"GRSE|COCHIN SHIPYARD|\bBDL\b|MIDHANI|\bAAI\b|AIRPORTS AUTHORITY")
RECRUIT = re.compile(r"RECRUITMENT|VACANC|NOTIFICATION|APPRENTICE|ADMIT CARD|RESULT|HIRING|CAREERS?|EXECUTIVE|TRAINEE|OFFICER")
NOT_JOB = re.compile(
    r"REVIEW|MOVIE|TRAILER|MOCK TEST|SYLLABUS|EXAM PATTERN|PREVIOUS YEAR PAPER|ICAI|\bCA (FOUNDATION|INTER|FINAL)|"
    r"COUNSELL?OR|CONSULTANT|DIRECTOR\b|SECRETARY|EDITOR|RESEARCH (ASSOCIATE|FELLOW|ASSISTANT)|\bJRF\b|\bSRF\b|"
    r"PROJECT (ASSOCIATE|ASSISTANT)|LABORATORY ASSISTANT|LAB ASSISTANT|STOREKEEPER|FITTER|\bITI\b|MATERNAL|HEALTH|"
    r"STAFF NURSE|\bANM\b|\bGNM\b|PEON|ATTENDANT|COOK|SWEEPER|WARDEN|\bSPORTS\b|ARTISAN|LAB TECHNICIAN|"
    r"JOB MARKET|SQUEEZE|LAYOFFS?|STRATEGY|\bSEEKS?\b|PROTEST|\bCMD\b|CHAIRMAN|\bRACE\b|INTERVIEWED|SALARY HIKE|OPINION|"
    r"EXPLAINED|HOW TO|\bTIPS\b|\bGUIDE\b|ROADMAP|PREPARATION|\bBEST\b|\bTOP \d|BUSINESS DEVELOPMENT|\bSALES\b|"
    r"MARKETING|\bHR\b|RECRUITER|TELE ?CALLER|PETITION|\bCOURT\b|NIGERIA|DEBATE|SPARKS|STEPS TO FIX|DIGILOCKER|"
    r"\bPET\b|ADMISSIONS?\b|COUNSELLING|TEACHING|\bRTI\b|\bSEES\b|PLANS TO|ARE CREATED|COURSE\b|CERTIFICATION|"
    r"COLLEGE OF ENGINEERING|\bNIRF\b|PLACEMENT (RECORD|REPORT|STATS?)")
# job jaisa title: recruitment/apply/hiring wagairah, ya seedha post ka naam ("KLA Engineer, Product Applications")
JOB_INTENT = re.compile(
    r"RECRUITMENT|VACANC|NOTIFICATION|\bAPPLY|HIRING|OFF[\s-]?CAMPUS|\bDRIVE\b|ADMIT CARD|HALL TICKET|\bRESULTS?\b|"
    r"ANSWER KEY|CUT ?OFF|EXAM (DATE|CITY)|INTIMATION|WALK[- ]?IN|INTERNSHIP|\bJOBS?\b|OPENINGS|\bPOSTS\b|APPRENTICE|"
    r"CAREERS?|REGISTRATION|THROUGH GATE|\bTRAINEE\b|HACKQUEST|HACKATHON|CODEVITA")
POSTING = re.compile(r"^[^:]{0,70}\b(ENGINEER|DEVELOPER|INTERN|ANALYST|SCIENTIST|PROGRAMMER)\b")
GOVT = re.compile(
    r"\bNTPC|BHEL|ONGC|IOCL|INDIAN OIL|\bGAIL|POWER ?GRID|PGCIL|\bSAIL\b|HPCL|BPCL|NHPC|THDC|NSPCL|NPCIL|\bBEL\b|"
    r"BHARAT ELECTRONICS|\bHAL\b|HINDUSTAN AERONAUTICS|ISRO|DRDO|BARC|\bAAI\b|AIRPORTS AUTHORITY|RAILWAY|\bRRB\b|"
    r"\bRITES|IRCON|\bDMRC|METRO RAIL|\bSSC\b|UPSC|\bESE\b|\bIES\b|RPSC|RSMSSB|\bRSSB|PSSSB|JKSSB|HSSC|UPSSSC|UPPSC|"
    r"MPESB|MPPSC|BPSC|BSSC|OSSC|OPSC|TNPSC|KPSC|APPSC|TSPSC|GPSC|WBPSC|\bPSC\b|NHAI|CPWD|\bPWD|JVVNL|AVVNL|JDVVNL|"
    r"RVUNL|RVPN|COAL INDIA|\bCIL\b|\bNLC|NMDC|MECON|ENGINEERS INDIA|\bEIL\b|CONCOR|BSNL|MTNL|C-?DOT|C-?DAC|NIELIT|"
    r"GRID[- ]INDIA|TRANSCO|GENCO|DISCOM|\bSBI SO\b|IBPS SO|\bTGC\b|SSC TECH|COAST GUARD|\bBRO\b|\bMES\b|"
    r"MINISTRY|GOVT|GOVERNMENT|SARKARI|\bPSU|NUCLEAR POWER|NAVY|ARMY|AIR FORCE|IAF|AFCAT|ISRO|VSSC|URSC|SAC\b|"
    r"\bNIC\b|NHPC|SJVN|NEEPCO|HUDCO|\bIRCTC|WAPCOS|NBCC|BRPL|BBMB|SECI|IREDA|MIDHANI|BDL\b|GRSE|MAZAGON|COCHIN SHIPYARD|"
    r"\bIITS?\b|\bNITS?\b|IIIT|MANIT|MNIT|UNIVERSITY|COMMISSION|DIRECTORATE|\bNHM\b|CORPORATION|AUTHORITY|INSTITUTE|"
    r"\bBOARD\b|DEPARTMENT|MUNICIPAL|NAGAR NIGAM|COUNCIL|\bCSIR\b|\bICAR\b|\bICMR\b")
PRIVATE = re.compile(
    r"OFF[\s-]?CAMPUS|HIRING|\bLPA\b|\bCTC\b|TCS\b|INFOSYS|WIPRO|ACCENTURE|COGNIZANT|CAPGEMINI|\bHCL|TECH MAHINDRA|"
    r"LTIMINDTREE|MINDTREE|DELOITTE|\bIBM\b|ORACLE|AMAZON|GOOGLE|MICROSOFT|ADOBE|INTEL\b|QUALCOMM|SAMSUNG|NVIDIA|"
    r"CISCO|SAP\b|SALESFORCE|ZOHO|FLIPKART|PAYTM|SWIGGY|ZOMATO|RAZORPAY|L&T|LARSEN|TATA (POWER|STEEL|MOTORS|ELXSI|"
    r"TECHNOLOGIES)|RELIANCE|\bJIO\b|ADANI|SIEMENS|\bABB\b|BOSCH|HONEYWELL|SCHNEIDER|MAHINDRA|MARUTI|HYUNDAI|"
    r"KPIT|PERSISTENT|COFORGE|MPHASIS|HEXAWARE|ZENSAR|NAGARRO|EPAM|THOUGHTWORKS|AKAMAI|WALMART|GOLDMAN|JP ?MORGAN|"
    r"STARTUP|PVT\.?\s*LTD|PRIVATE LIMITED|FRESHERS?\s+(JOB|HIRING|DRIVE)|SOFTWARE ENGINEER|DEVELOPER|\bSDE\b|"
    r"ASSOCIATE (SOFTWARE|CLIENT|SYSTEMS?|ENGINEER)|\bINTERN\b|BANGALORE|BENGALURU|GURUGRAM|HYDERABAD|PUNE|NOIDA")

BRANCH_RULES = [
    ("CSE", r"COMPUTER SCIENCE|\bCSE\b|\bCS\s*/\s*IT|SOFTWARE|DEVELOPER|PROGRAMMER|\bSDE\b|FULL\s*STACK|FRONT\s*END|"
            r"BACK\s*END|DATA (SCIENTIST|ANALYST|ENGINEER)|MACHINE LEARNING|\bAI\b|\bML\b|GENERATIVE|CLOUD|DEVOPS|CYBER|"
            r"\bIT\b|INFORMATION TECHNOLOGY|JAVA|PYTHON|\bWEB\b|CODING|SYSTEMS? ENGINEER|ANALYST TRAINEE|HACKATHON"),
    ("IT", r"COMPUTER SCIENCE|\bCSE\b|\bCS\s*/\s*IT|SOFTWARE|DEVELOPER|PROGRAMMER|\bSDE\b|FULL\s*STACK|DATA (SCIENTIST|"
           r"ANALYST|ENGINEER)|MACHINE LEARNING|\bAI\b|GENERATIVE|CLOUD|DEVOPS|CYBER|\bIT\b|INFORMATION TECHNOLOGY|JAVA|PYTHON|\bWEB\b|CODING|"
           r"SYSTEMS? ENGINEER|ANALYST TRAINEE|HACKATHON"),
    ("EE", r"ELECTRICAL|\bEEE?\b|POWER (SYSTEM|PLANT|SECTOR)|ELECTRICITY|TRANSMISSION|SUBSTATION|GRID|DISCOM|VIDYUT"),
    ("ECE", r"ELECTRONICS|COMMUNICATION|\bECE?\b|VLSI|EMBEDDED|\bRF\b|MICROWAVE|TELECOM|SEMICONDUCTOR|CHIP|HARDWARE|SIGNAL"),
    ("EIC", r"INSTRUMENTATION|CONTROL (SYSTEM|ENGINEER)|\bEIC\b|\bE&I\b|AUTOMATION|PLC|SCADA"),
    ("CIVIL", r"CIVIL|CONSTRUCTION|STRUCTURAL|HIGHWAY|\bPWD\b|IRRIGATION|SURVEY|WATER RESOURCES|\bPHED\b|BUILDING"),
    ("ME", r"MECHANICAL|PRODUCTION|AUTOMOBILE|MANUFACTURING|THERMAL|\bQUALITY\b|DESIGN ENGINEER|MAINTENANCE|CAD\b"),
    ("CHEM", r"CHEMICAL|PETROLEUM|PROCESS ENGINEER|REFINERY|PETROCHEM"),
]
BRANCH_RULES = [(b, re.compile(p)) for b, p in BRANCH_RULES]
ALL_BRANCH_HINT = re.compile(r"\bGATE\b|ALL (ENGINEERING )?BRANCHES|ANY (ENGINEERING )?(BRANCH|DISCIPLINE)|\bE?ET\b|"
                             r"EXECUTIVE TRAINEE|ENGINEER TRAINEE|GRADUATE APPRENTICE|\bESE\b|\bIES\b|ANY B\.?\s?TECH")

TYPE_RULES = [
    ("Result", r"\bRESULTS?\b|MERIT LIST|SCORE ?CARD|CUT ?OFF|SELECTED CANDIDATES"),
    ("Admit Card", r"ADMIT CARD|HALL TICKET|CALL LETTER"),
    ("Answer Key", r"ANSWER KEY"),
    ("Exam Date", r"EXAM (DATE|SCHEDULE|CALENDAR)|EXAM CITY"),
    ("Internship", r"INTERN(SHIP)?\b|\bINTERNS\b|TRAINEESHIP|APPRENTICE"),
    ("Hiring Challenge", r"HACKATHON|HACKQUEST|CODING (CHALLENGE|CONTEST)|CODEVITA|HIRING CHALLENGE"),
]
TYPE_RULES = [(t, re.compile(p)) for t, p in TYPE_RULES]

ORG_NAMES = ["NTPC", "BHEL", "ONGC", "IOCL", "GAIL", "POWERGRID", "SAIL", "HPCL", "BPCL", "NHPC", "THDC", "NSPCL",
             "NPCIL", "BEL", "HAL", "ISRO", "DRDO", "BARC", "AAI", "RRB", "DMRC", "SSC", "UPSC", "RPSC", "RSSB",
             "RSMSSB", "JKSSB", "PSSSB", "HSSC", "UPSSSC", "MPESB", "BPSC", "NHAI", "CPWD", "Coal India", "NLC",
             "NMDC", "RITES", "IRCON", "C-DAC", "Grid-India", "SJVN", "TCS", "Infosys", "Wipro", "Accenture",
             "Cognizant", "Capgemini", "HCLTech", "Tech Mahindra", "LTIMindtree", "Deloitte", "IBM", "Amazon",
             "Google", "Microsoft", "KPIT", "L&T", "Tata Power", "Reliance", "Adani", "Siemens", "Bosch", "Akamai",
             "EdgeVerve", "Walmart", "Zoho", "Samsung", "Qualcomm", "Intel", "Oracle", "Adobe"]
ORG_RE = re.compile(r"\b(" + "|".join(re.escape(o) for o in sorted(ORG_NAMES, key=len, reverse=True)) + r")\b", re.I)


def classify(title, desc, default_sector=None):
    text = f"{title} {desc}"
    T = text.upper()
    TT = title.upper()
    if EXCLUDE.search(TT) or NOT_JOB.search(TT):
        return None
    if not (ENGG_TITLE.search(TT) or (TECH_ORG.search(TT) and RECRUIT.search(TT))):
        return None
    if not (JOB_INTENT.search(TT) or POSTING.search(TT)):
        return None
    g, p = len(GOVT.findall(T)), len(PRIVATE.findall(T))
    if g > p:
        sector = "govt"
    elif p > g:
        sector = "private"
    else:
        sector = default_sector or ("govt" if re.search(r"RECRUITMENT|NOTIFICATION|VACANC", T) else "private")
    branches = [b for b, rx in BRANCH_RULES if rx.search(T)]
    if not branches or (ALL_BRANCH_HINT.search(T) and len(branches) < 3):
        branches = ["ALL"] if not branches else branches + ["ALL"]
    typ = "Job"
    for t, rx in TYPE_RULES:
        if rx.search(T):
            typ = t
            break
    m = ORG_RE.search(title) or ORG_RE.search(desc)
    org = m.group(1) if m else None
    if not org:
        m = re.match(r"\s*([A-Z][\w&.\-]*(?:\s+[A-Z][\w&.\-]*){0,3})\s+(?:Recruitment|Off\s*Campus|Hiring|is hiring|"
                     r"Notification|Vacancy|JE|AE|Careers)", title)
        org = m.group(1) if m else ""
    vac = re.search(r"(\d[\d,]{0,6})\s*(?:\+\s*)?(?:[A-Z&()./-]+\s+){0,3}(POSTS|VACANC\w*|OPENINGS|SEATS|POSITIONS)", T)
    sal = re.search(r"((?:RS\.?|₹|INR)\s?[\d,]+(?:\s*[-–TO]+\s*(?:RS\.?|₹)?\s?[\d,]+)?(?:\s*/-)?(?:\s*(?:PER MONTH|P\.?M\.?|/MONTH))?"
                    r"|\d+(?:\.\d+)?\s*(?:[-–]\s*\d+(?:\.\d+)?\s*)?LPA)", T)
    loc = re.search(r"\b(BENGALURU|BANGALORE|HYDERABAD|PUNE|CHENNAI|NOIDA|GURUGRAM|GURGAON|MUMBAI|DELHI|NEW DELHI|KOLKATA|"
                    r"JAIPUR|KOTA|AHMEDABAD|INDORE|COIMBATORE|KOCHI|BHUBANESWAR|CHANDIGARH|MOHALI|LUCKNOW|REMOTE|"
                    r"PAN INDIA|ALL INDIA|RAJASTHAN)\b", T)
    start, last = find_dates(text)
    tags = []
    if re.search(r"\bGATE\b", T):
        tags.append("Via GATE")
    if re.search(r"FRESHER|0\s*-\s*[12]\s*Y|ENTRY LEVEL|NEW GRAD|202[5-8] BATCH|PASS[- ]?OUT", T):
        tags.append("Freshers")
    if re.search(r"REMOTE|WORK FROM HOME|WFH", T):
        tags.append("Remote")
    if re.search(r"RAJASTHAN|RPSC|RSSB|RSMSSB|JVVNL|AVVNL|JDVVNL|RVUNL|RVPN|JAIPUR|KOTA", T):
        tags.append("Rajasthan")
    if re.search(r"DIPLOMA", T) and re.search(r"DEGREE|B\.?\s?TECH|B\.?E\b", T):
        tags.append("Degree/Diploma")
    return {
        "sector": sector, "type": typ, "branches": branches, "org": (org or "").strip(),
        "vacancies": int(vac.group(1).replace(",", "")) if vac and vac.group(1).replace(",", "").isdigit() else None,
        "salary": sal.group(1).title().replace("Lpa", "LPA").replace("Rs", "₹").strip() if sal else None,
        "location": loc.group(1).title() if loc else None,
        "start_date": start, "last_date": last, "tags": tags,
    }


def mk_item(title, link, desc, posted, source, default_sector=None, extra=None):
    title = strip_html(title)
    desc = strip_html(desc)[:600]
    c = classify(title, desc, default_sector)
    if not c:
        return None
    it = {
        "id": hashlib.sha1((link or title).encode()).hexdigest()[:12],
        "title": title[:180], "summary": desc[:260], "link": link, "source": source,
        "posted": posted.astimezone(IST).isoformat(timespec="minutes") if posted else NOW.isoformat(timespec="minutes"),
    }
    it.update(c)
    if extra:
        it.update({k: v for k, v in extra.items() if v})
    return it


# ------------------------------------------------------------------ sources
def parse_rss(data):
    out = []
    try:
        root = ET.fromstring(data)
    except ET.ParseError:
        return out
    for item in root.iter("item"):
        g = lambda tag: (item.findtext(tag) or "").strip()
        try:
            posted = parsedate_to_datetime(g("pubDate")) if g("pubDate") else None
        except (TypeError, ValueError):
            posted = None
        src = item.find("source")
        out.append({"title": g("title"), "link": g("link"), "desc": g("description"), "posted": posted,
                    "publisher": src.text.strip() if src is not None and src.text else ""})
    return out


def src_google_news():
    items = []
    for sector, queries in (("govt", GNEWS_GOVT), ("private", GNEWS_PRIVATE)):
        for q in queries:
            url = ("https://news.google.com/rss/search?q=" + urllib.parse.quote(f"{q} when:7d")
                   + "&hl=en-IN&gl=IN&ceid=IN:en")
            data = get(url)
            if not data:
                continue
            n = 0
            for r in parse_rss(data):
                title = r["title"]
                pub = r["publisher"]
                if pub and title.endswith(" - " + pub):
                    title = title[: -len(pub) - 3]
                it = mk_item(title, r["link"], r["desc"], r["posted"], pub or "Google News", sector)
                if it:
                    items.append(it)
                    n += 1
            print(f"   📰 {q}: {n}")
    return items


def src_rss_feeds():
    items = []
    for name, url, sector in RSS_FEEDS:
        data = get(url)
        if not data:
            continue
        n = 0
        for r in parse_rss(data):
            it = mk_item(r["title"], r["link"], r["desc"], r["posted"], name, sector)
            if it:
                items.append(it)
                n += 1
        print(f"   📡 {name}: {n}")
    return items


def src_adzuna():
    if not (ADZUNA_ID and ADZUNA_KEY):
        print("   (Adzuna key nahi — skip)")
        return []
    items = []
    for q in ADZUNA_QUERIES:
        url = ("https://api.adzuna.com/v1/api/jobs/in/search/1?" + urllib.parse.urlencode({
            "app_id": ADZUNA_ID, "app_key": ADZUNA_KEY, "results_per_page": 50, "what": q,
            "max_days_old": 10, "sort_by": "date", "content-type": "application/json"}))
        js = get(url, as_json=True)
        n = 0
        for r in (js or {}).get("results", []):
            try:
                posted = datetime.fromisoformat(r.get("created", "").replace("Z", "+00:00"))
            except ValueError:
                posted = None
            sal = None
            if r.get("salary_min"):
                lo, hi = r.get("salary_min"), r.get("salary_max") or r.get("salary_min")
                sal = f"₹{lo / 1e5:.1f}–{hi / 1e5:.1f} LPA" if hi > 20000 else None
            it = mk_item(r.get("title", ""), r.get("redirect_url"), r.get("description", ""), posted, "Adzuna",
                         "private", {"org": (r.get("company") or {}).get("display_name"),
                                     "location": (r.get("location") or {}).get("display_name"), "salary": sal})
            if it:
                it["sector"] = "private"
                items.append(it)
                n += 1
        print(f"   💼 Adzuna '{q}': {n}")
    return items


ENTRY = re.compile(r"INTERN|GRADUATE|NEW GRAD|ENTRY|FRESHER|ASSOCIATE|JUNIOR|TRAINEE|\b(SDE|ENGINEER|DEVELOPER)\s*(I|1)\b|"
                   r"0\s*-\s*[12]\s*Y", re.I)
INDIA = re.compile(r"INDIA|BENGALURU|BANGALORE|HYDERABAD|PUNE|CHENNAI|NOIDA|GURUGRAM|GURGAON|MUMBAI|DELHI|KOLKATA|"
                   r"JAIPUR|AHMEDABAD|REMOTE", re.I)


def src_boards():
    items = []
    for tok in GREENHOUSE_BOARDS:
        js = get(f"https://boards-api.greenhouse.io/v1/boards/{tok}/jobs", as_json=True)
        for r in (js or {}).get("jobs", []):
            loc = (r.get("location") or {}).get("name", "")
            if not (ENTRY.search(r.get("title", "")) and INDIA.search(loc)):
                continue
            try:
                posted = datetime.fromisoformat(r.get("updated_at"))
            except (TypeError, ValueError):
                posted = None
            it = mk_item(r["title"] + " engineer" * (not ENGG.search(r["title"].upper())), r.get("absolute_url"),
                         "", posted, f"{tok} careers", "private", {"org": tok.title(), "location": loc})
            if it:
                it["title"] = r["title"]
                items.append(it)
    for co in LEVER_COMPANIES:
        js = get(f"https://api.lever.co/v0/postings/{co}?mode=json", as_json=True)
        for r in js or []:
            loc = (r.get("categories") or {}).get("location", "") or ""
            if not (ENTRY.search(r.get("text", "")) and INDIA.search(loc)):
                continue
            posted = datetime.fromtimestamp(r.get("createdAt", 0) / 1000, IST) if r.get("createdAt") else None
            it = mk_item(r["text"], r.get("hostedUrl"), r.get("descriptionPlain", "")[:400], posted,
                         f"{co} careers", "private", {"org": co.title(), "location": loc})
            if it:
                items.append(it)
    if GREENHOUSE_BOARDS or LEVER_COMPANIES:
        print(f"   🏢 Career boards: {len(items)}")
    return items


# ------------------------------------------------------------------ merge + save
def norm_key(title):
    t = re.sub(r"[^a-z0-9 ]", " ", title.lower())
    w = [x for x in t.split() if x not in {"the", "a", "an", "for", "of", "in", "and", "to", "2025", "2026", "2027",
                                           "apply", "online", "now", "out", "latest", "check", "details", "here", "likely",
                                           "expected", "today", "released", "release", "download", "soon", "direct", "link",
                                           "live", "updates", "news", "notification", "is", "on", "at", "with", "by", "from"}]
    return " ".join(w[:6])


def load_old():
    try:
        with open(OUT_FILE, encoding="utf-8") as f:
            return json.load(f).get("items", [])
    except Exception:
        return []


def keep(it):
    try:
        posted = datetime.fromisoformat(it["posted"])
    except (KeyError, ValueError):
        return False
    if it.get("last_date") and it["last_date"] >= NOW.date().isoformat():
        return True
    return (NOW - posted).days <= KEEP_DAYS


def main():
    print(f"🔎 rtuhub jobs scraper — {NOW:%d %b %Y %H:%M} IST")
    fresh, sources = [], []
    for sid, name, fn, on in (("gnews", "Google News", src_google_news, True),
                              ("rss", "Job portal feeds", src_rss_feeds, bool(RSS_FEEDS)),
                              ("adzuna", "Adzuna", src_adzuna, bool(ADZUNA_ID and ADZUNA_KEY)),
                              ("boards", "Company career pages", src_boards, bool(GREENHOUSE_BOARDS or LEVER_COMPANIES))):
        if not on:
            continue
        print(f"\n▶ {name}")
        try:
            got = fn()
            fresh += got
            sources.append({"id": sid, "name": name, "ok": bool(got), "n": len(got)})
        except Exception as e:
            print(f"   ✗ {name} fail: {e}")
            sources.append({"id": sid, "name": name, "ok": False, "n": 0, "error": str(e)[:80]})

    UPD = {"Admit Card", "Result", "Answer Key", "Exam Date"}

    def keys_of(it):
        ks = [norm_key(it["title"])]
        org = (it.get("org") or "").lower()
        if org and it.get("vacancies"):
            ks.append(f"{org}|{it.get('type')}|{it['vacancies']}")
        if org and it.get("type") in UPD:
            ks.append(f"{org}|{it['type']}")
        return ks

    merged, seen_key = {}, {}
    old = []
    for o in load_old():                       # purane items bhi naye rules se dobara jaancho
        c = classify(o.get("title", ""), o.get("summary", ""), o.get("sector"))
        if not c:
            continue
        if "summary" in o:                     # feed se aaye items: tags/sector naye rules se (hand-checked wale waise hi)
            o.update({k: v for k, v in c.items() if v or k in ("branches", "tags")})
        old.append(o)
    for it in old + fresh:                     # naye items purane ko override karte hain
        ks = keys_of(it)
        hit = next((seen_key[k] for k in ks if k in seen_key and seen_key[k] != it["id"]), None)
        if hit:
            prev = merged.get(hit)
            if prev:                           # same news, doosra source -> missing fields bhar do
                for f in ("last_date", "start_date", "vacancies", "salary", "location", "org"):
                    if not prev.get(f) and it.get(f):
                        prev[f] = it[f]
                continue
        for k in ks:
            seen_key[k] = it["id"]
        merged[it["id"]] = it

    items = [i for i in merged.values() if keep(i)]
    items.sort(key=lambda i: i["posted"], reverse=True)
    items = items[:MAX_ITEMS]
    by = {"govt": sum(i["sector"] == "govt" for i in items), "private": sum(i["sector"] == "private" for i in items)}
    out = {"checkedAt": NOW.isoformat(timespec="seconds"), "everyHours": EVERY_HOURS, "count": len(items),
           "by_sector": by, "sources": sources, "items": items}

    os.makedirs(os.path.dirname(OUT_FILE) or ".", exist_ok=True)
    tmp = OUT_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, OUT_FILE)
    print(f"\n✅ {len(items)} jobs saved -> {OUT_FILE}  (Govt {by['govt']} | Private {by['private']}, naye {len(fresh)})")
    if not fresh:
        sys.exit(0)


if __name__ == "__main__":
    main()
