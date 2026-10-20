// =====================================================================
//  Scholarship CHECKER — student ke jawab (profile) se har scheme ka faisla:
//  'yes' = shartein poori, 'maybe' = shayad (koi baat hum check nahi kar sakte), null = nahi.
//  why = kyun match hua (ya kya check karna hai). Rules src/scholarships.js ki details ke hisaab se.
// =====================================================================

// sawaal: [key, label, options[[value, text]], multi?]
export const QUESTIONS = [
  ['state', 'Where is your home (domicile)?', [['rj', 'Rajasthan'], ['other', 'Other state']]],
  ['cat', 'Your category', [['sc', 'SC'], ['st', 'ST'], ['obc', 'OBC'], ['mbc', 'MBC'], ['dnt', 'DNT'], ['ews', 'EWS'], ['gen', 'General']]],
  ['gender', 'You are a', [['f', 'Girl'], ['m', 'Boy']]],
  ['income', 'Family income (all sources, per year)', [['1', 'Up to ₹1 lakh'], ['1.5', '₹1–1.5 lakh'], ['2', '₹1.5–2 lakh'], ['2.5', '₹2–2.5 lakh'], ['4.5', '₹2.5–4.5 lakh'], ['6', '₹4.5–6 lakh'], ['8', '₹6–8 lakh'], ['99', 'Above ₹8 lakh']]],
  ['college', 'Your college', [['govt', 'Government'], ['pvt', 'Private']]],
  ['year', 'Your year', [['1', '1st year'], ['lat', '2nd year (lateral entry)'], ['up', '2nd year or above']]],
  ['board', 'Class 12 board', [['rbse', 'RBSE (Rajasthan)'], ['cbse', 'CBSE'], ['other', 'Other']]],
  ['marks', 'Class 12 marks', [['0', 'Below 50%'], ['50', '50–59%'], ['60', '60–64%'], ['65', '65–69%'], ['70', '70–74%'], ['75', '75–79%'], ['80', '80–89%'], ['90', '90% or more']]],
  ['special', 'Anything special? (tap all that apply)', [
    ['minority', 'Minority religion'], ['divyang', 'Divyang (40%+)'], ['outstation', 'Home in another city, live in rent'],
    ['exsm', 'Parent is an ex-serviceman'], ['capf', 'Parent in CAPF / Assam Rifles'], ['bocw', 'Parent is a registered construction worker'],
    ['labour', 'Parent is a beedi / cine / mine worker'], ['orphan', 'Orphan / parent died or seriously ill']], true]
];
export const BLANK = { state: 'rj', cat: '', gender: '', income: '', college: '', year: '', board: '', marks: '', special: [] };
export const missing = p => QUESTIONS.filter(([k, , , multi]) => !multi && !p[k]).map(q => q[0]);

const L = n => '₹' + (n >= 1 ? n + ' lakh' : n * 100 + 'k');
export function check(s, p) {
  const inc = +p.income, marks = +p.marks, rj = p.state === 'rj', f = p.gender === 'f', govt = p.college === 'govt';
  const y1 = p.year === '1', lat = p.year === 'lat', sp = k => (p.special || []).includes(k), c = p.cat;
  const why = [];
  const need = (cond, text) => { if (cond) why.push(text); return cond; };
  const incOk = lim => inc <= lim;
  let r = null;
  switch (s.id) {
    case 'rj-pms-sc': r = rj && c === 'sc' && incOk(2.5) ? 'yes' : null; if (r) why.push('Rajasthan SC student', 'Income within ₹2.5 lakh'); break;
    case 'rj-pms-st': r = rj && c === 'st' && incOk(2.5) ? 'yes' : null; if (r) why.push('Rajasthan ST student', 'Income within ₹2.5 lakh'); break;
    case 'rj-pms-obc': if (rj && c === 'obc') { r = incOk(1) ? 'yes' : incOk(1.5) ? 'maybe' : null; why.push('Rajasthan OBC student', r === 'maybe' ? 'Income limit is ₹1 lakh in most guides (₹1.5 lakh in one): confirm on the portal' : 'Income within ₹1 lakh'); } break;
    case 'rj-pms-sbc': if (rj && c === 'mbc') { r = incOk(1) ? 'yes' : incOk(2.5) ? 'maybe' : null; why.push('Rajasthan MBC student', r === 'maybe' ? 'Income limit differs between guides (₹1.08–2.5 lakh): confirm on the portal' : 'Income within the limit'); } break;
    case 'rj-pms-dnt': r = rj && c === 'dnt' && incOk(2) ? 'yes' : null; if (r) why.push('Rajasthan DNT student', 'Income within ₹2 lakh'); break;
    case 'rj-ebc': r = rj && (c === 'ews' || c === 'gen') && incOk(1) ? 'yes' : null; if (r) why.push('Rajasthan general / EWS student', 'Income within ₹1 lakh'); break;
    case 'rj-cmuss': if (rj && p.board === 'rbse' && marks >= 60 && incOk(2.5)) { r = 'maybe'; why.push('RBSE Class 12 with 60%+', 'Income within ₹2.5 lakh', 'Only if you are in the RBSE top 1 lakh merit list'); } break;
    case 'rj-dbt-voucher': if (rj && govt && sp('outstation')) {
      if ((c === 'sc' || c === 'st') && incOk(2.5)) { r = 'yes'; why.push('SC / ST student of a government college', 'Home in another city, living in rent', 'Income within ₹2.5 lakh'); }
      else if (['obc', 'mbc', 'ews', 'dnt'].includes(c) && incOk(1.5)) { r = 'yes'; why.push('OBC / MBC / EWS student of a government college', 'Home in another city, living in rent', 'Income within ₹1.5 lakh'); }
    } break;
    case 'rj-kalibai': if (rj && f && y1 && c !== 'mbc' && incOk(2.5) && ((p.board === 'rbse' && marks >= 65) || (p.board === 'cbse' && marks >= 75))) { r = 'yes'; why.push('Girl in 1st year', p.board === 'rbse' ? 'RBSE 65%+' : 'CBSE 75%+', 'Income within ₹2.5 lakh', 'Only if you passed Class 12 last year'); } break;
    case 'rj-devnarayan': if (rj && f && c === 'mbc' && govt && marks >= 50 && incOk(2.5)) { r = 'yes'; why.push('MBC girl in a government college', '50%+ in Class 12', 'Income within ₹2.5 lakh'); } break;
    case 'rj-sainik': if (rj && sp('exsm')) { r = 'maybe'; why.push('Rajasthan ex-serviceman family', 'Only if the parent’s rank was Havildar or below, and you don’t get PMSS'); } break;
    case 'rj-bocw': if (rj && sp('bocw')) { r = 'yes'; why.push('Parent is a registered construction worker'); } break;
    case 'aicte-pragati': if (f && (y1 || lat) && incOk(8)) { r = 'yes'; why.push('Girl in 1st year (or lateral entry 2nd year)', 'Income within ₹8 lakh', 'Selection on marks, limited seats'); } break;
    case 'aicte-saksham': if (sp('divyang') && (y1 || lat) && incOk(8)) { r = 'yes'; why.push('Divyang student in 1st year (or lateral entry)', 'Income within ₹8 lakh'); } break;
    case 'aicte-swanath': if (sp('orphan') && incOk(8)) { r = 'yes'; why.push('Orphan / special case', 'Income within ₹8 lakh'); } break;
    case 'nsp-csss': if (incOk(4.5) && marks >= 75) { r = 'maybe'; why.push('Income within ₹4.5 lakh', 'Only if you were in the top 20% (80th percentile) of your Class 12 board', y1 ? 'Fresh form closed on 30 Sep; renewal only for already-selected students' : 'Renewal for already-selected students'); } break;
    case 'nsp-minority': if (sp('minority') && marks >= 50 && incOk(2)) { r = 'yes'; why.push('Minority community', '50%+ marks', 'Income within ₹2 lakh'); } break;
    case 'nsp-depwd': if (sp('divyang') && incOk(2.5)) { r = 'yes'; why.push('Divyang (40%+)', 'Income within ₹2.5 lakh'); } break;
    case 'nsp-labour': if (sp('labour')) { r = incOk(1) ? 'yes' : incOk(1.5) ? 'maybe' : null; why.push('Parent is a beedi / cine / mine worker', r === 'maybe' ? 'Income limit is ₹1.2 lakh: check your exact income' : 'Income within ₹1.2 lakh'); } break;
    case 'nsp-capf': if (sp('capf') && y1 && marks >= 60) { r = 'maybe'; why.push('CAPF / Assam Rifles family, 1st year, 60%+', 'Priority to wards of personnel who died or were disabled in service'); } break;
    case 'ksb-pmss': if (sp('exsm') && y1 && marks >= 60) { r = 'yes'; why.push('Ex-serviceman family', '1st year with 60%+ in Class 12'); } break;
    case 'psu-lic': if (y1 && marks >= 60 && incOk(4.5)) { r = 'yes'; why.push('1st year with 60%+ in Class 12', 'Income within ₹4.5 lakh'); } break;
    case 'psu-ongc': if (y1 && marks >= 60 && (((c === 'sc' || c === 'st') && incOk(4.5)) || ((c === 'obc' || c === 'ews') && incOk(2)))) { r = 'yes'; why.push('1st year engineering, 60%+', `${c.toUpperCase()} with income within ${L(c === 'sc' || c === 'st' ? 4.5 : 2)}`); } break;
    case 'pvt-reliance': if (y1 && marks >= 60 && incOk(15)) { r = 'yes'; why.push('1st year with 60%+ in Class 12', 'Income below ₹15 lakh', 'Online aptitude test needed'); } break;
    case 'pvt-hdfc': if (marks >= 60 && incOk(2.5)) { r = 'yes'; why.push('55%+ in the last exam', 'Income within ₹2.5 lakh'); } break;
    case 'pvt-kotak': if (f && y1 && marks >= 75 && incOk(6)) { r = 'maybe'; why.push('Girl in 1st year with 75%+', 'Income within ₹6 lakh', 'Only if your college is NIRF / NAAC accredited'); } break;
    case 'pvt-infosys': if (f && y1 && incOk(8)) { r = 'maybe'; why.push('Girl in 1st year of B.Tech', 'Income within ₹8 lakh', 'Only if your college is NIRF-ranked or an eligible government college'); } break;
    case 'pvt-legrand': if (f && y1 && incOk(5) && (marks >= 70 || ((sp('divyang') || sp('orphan')) && marks >= 60))) { r = 'maybe'; why.push('Girl in 1st year', 'Income within ₹5 lakh', 'Needs 70%+ in both Class 10 and 12 (60% for special category)'); } break;
    case 'pvt-aditya': if (marks >= 60 && incOk(6)) { r = 'yes'; why.push('60%+ marks', 'Income within ₹6 lakh'); } break;
    case 'pvt-tata': if (marks >= 60 && incOk(4.5)) { r = incOk(2.5) ? 'yes' : 'maybe'; why.push('60%+ marks', r === 'yes' ? 'Income within ₹2.5 lakh' : 'Income limit is ₹2.5 lakh in some guides, ₹4 lakh in others'); } break;
    case 'pvt-siemens': if (govt && y1 && incOk(2)) { r = 'yes'; why.push('1st year in a government engineering college', 'Income within ₹2 lakh'); } break;
    case 'pvt-glow': if (f && marks >= 60 && incOk(6)) { r = 'yes'; why.push('Girl with 60%+ in Class 10 and 12', 'Income within ₹6 lakh'); } break;
    case 'pvt-ffe': if (y1 && marks >= 70 && incOk(4.5) && inc <= 3) { r = 'maybe'; why.push('1st year with 70%+', 'Income within ₹3 lakh', 'Selection needs a good state / national entrance rank'); } break;
    default: r = null;
  }
  return r ? { r, why } : null;
}

// profile ki saaf line (result aur PDF me)
export function describe(p) {
  const pick = (k) => { const q = QUESTIONS.find(x => x[0] === k); const o = q && q[2].find(x => x[0] === p[k]); return o ? o[1] : ''; };
  const sp = (p.special || []).map(v => QUESTIONS.find(q => q[0] === 'special')[2].find(o => o[0] === v)?.[1]).filter(Boolean);
  return [pick('state') + ' domicile', pick('cat'), pick('gender'), 'income ' + pick('income'), pick('college') + ' college', pick('year'), pick('board') + ' ' + pick('marks'), ...sp].filter(x => x && !x.startsWith(' ')).join(' · ');
}
