/* ASEAN EIP Talent Intelligence Engine — data layer
 * All figures are indicative planning benchmarks compiled for campus-hiring
 * strategy. Validate against live sources before contractual use.
 */

const COUNTRIES = [
  { code: "SG", name: "Singapore",   flag: "🇸🇬", currency: "SGD", fxToUSD: 0.74, hub: "Singapore" },
  { code: "MY", name: "Malaysia",    flag: "🇲🇾", currency: "MYR", fxToUSD: 0.22, hub: "Kuala Lumpur" },
  { code: "ID", name: "Indonesia",   flag: "🇮🇩", currency: "IDR", fxToUSD: 0.000061, hub: "Jakarta" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", currency: "PHP", fxToUSD: 0.017, hub: "Metro Manila" },
  { code: "TH", name: "Thailand",    flag: "🇹🇭", currency: "THB", fxToUSD: 0.028, hub: "Bangkok" },
  { code: "VN", name: "Vietnam",     flag: "🇻🇳", currency: "VND", fxToUSD: 0.000039, hub: "Ho Chi Minh City" }
];

const TIERS = {
  1: { label: "Tier 1 — Priority", color: "#2f6df6" },
  2: { label: "Tier 2 — Core",     color: "#12a594" },
  3: { label: "Tier 3 — Reach",    color: "#8b7cf6" }
};

/* ------------------------------------------------------------------ *
 * A1. Top schools
 * ------------------------------------------------------------------ */
const SCHOOLS = [
  // ---------------- Singapore ----------------
  { country: "SG", tier: 1, name: "National University of Singapore", abbr: "NUS", city: "Singapore",
    qsWorld: 8, strengths: ["Computer Science", "Engineering", "Business", "Data Science"],
    intake: "Aug", langs: ["EN"], site: "nus.edu.sg", notes: "Deepest CS/DS bench in ASEAN; heavy MNC competition — engage 9-12 months out." },
  { country: "SG", tier: 1, name: "Nanyang Technological University", abbr: "NTU", city: "Singapore",
    qsWorld: 15, strengths: ["Engineering", "Computer Science", "Business", "Materials"],
    intake: "Aug", langs: ["EN"], site: "ntu.edu.sg", notes: "Strong professional-attachment culture; 20-24 week blocks available." },
  { country: "SG", tier: 2, name: "Singapore Management University", abbr: "SMU", city: "Singapore",
    qsWorld: 511, strengths: ["Business", "Information Systems", "Accountancy", "Economics"],
    intake: "Aug", langs: ["EN"], site: "smu.edu.sg", notes: "Best source for business-analyst / GTM / finance tracks." },
  { country: "SG", tier: 2, name: "Singapore University of Technology & Design", abbr: "SUTD", city: "Singapore",
    qsWorld: 440, strengths: ["Design / HCI", "Engineering", "Computer Science"],
    intake: "Sep", langs: ["EN"], site: "sutd.edu.sg", notes: "Small cohort (~450/yr) but exceptional product-engineering hybrids." },
  { country: "SG", tier: 3, name: "Singapore Institute of Technology", abbr: "SIT", city: "Singapore",
    qsWorld: null, strengths: ["Applied Computing", "Engineering", "Health Sciences"],
    intake: "Sep", langs: ["EN"], site: "singaporetech.edu.sg", notes: "Applied degrees with a mandatory 8-12 month Integrated Work Study Programme." },

  // ---------------- Malaysia ----------------
  { country: "MY", tier: 1, name: "Universiti Malaya", abbr: "UM", city: "Kuala Lumpur",
    qsWorld: 60, strengths: ["Computer Science", "Engineering", "Business", "Medicine"],
    intake: "Oct", langs: ["EN", "MS"], site: "um.edu.my", notes: "Flagship national university; strongest KL-based technical pipeline." },
  { country: "MY", tier: 1, name: "Universiti Putra Malaysia", abbr: "UPM", city: "Serdang",
    qsWorld: 148, strengths: ["Engineering", "Computer Science", "Agri-Tech", "Business"],
    intake: "Oct", langs: ["EN", "MS"], site: "upm.edu.my", notes: "Large engineering cohort; active industrial-training placement office." },
  { country: "MY", tier: 2, name: "Universiti Kebangsaan Malaysia", abbr: "UKM", city: "Bangi",
    qsWorld: 138, strengths: ["Engineering", "Information Systems", "Economics"],
    intake: "Oct", langs: ["EN", "MS"], site: "ukm.my", notes: "Reliable volume for QA / support / analyst roles." },
  { country: "MY", tier: 2, name: "Universiti Sains Malaysia", abbr: "USM", city: "Penang",
    qsWorld: 146, strengths: ["Electrical Engineering", "Computer Science", "Materials"],
    intake: "Oct", langs: ["EN", "MS"], site: "usm.my", notes: "Penang semiconductor corridor — best hardware/EE talent in Malaysia." },
  { country: "MY", tier: 2, name: "Universiti Teknologi Malaysia", abbr: "UTM", city: "Johor Bahru",
    qsWorld: 181, strengths: ["Engineering", "Computer Science", "Built Environment"],
    intake: "Oct", langs: ["EN", "MS"], site: "utm.my", notes: "Johor proximity to Singapore — strong cross-border mobility." },
  { country: "MY", tier: 2, name: "Universiti Teknologi PETRONAS", abbr: "UTP", city: "Seri Iskandar",
    qsWorld: 307, strengths: ["Electrical Engineering", "Computer Science", "Energy Engineering"],
    intake: "Sep", langs: ["EN"], site: "utp.edu.my", notes: "Industry-funded campus with a compulsory 8-month structured internship — strongest energy and facilities pipeline." },
  { country: "MY", tier: 3, name: "Monash University Malaysia", abbr: "Monash MY", city: "Subang Jaya",
    qsWorld: null, strengths: ["Computer Science", "Business", "Engineering"],
    intake: "Feb / Jul", langs: ["EN"], site: "monash.edu.my", notes: "Australian calendar (Feb & Jul intakes) — useful off-cycle internship source." },

  // ---------------- Indonesia ----------------
  { country: "ID", tier: 1, name: "Universitas Indonesia", abbr: "UI", city: "Depok / Jakarta",
    qsWorld: 206, strengths: ["Computer Science", "Business", "Economics", "Law"],
    intake: "Aug", langs: ["ID", "EN"], site: "ui.ac.id", notes: "Jakarta-adjacent; best blend of technical and commercial talent." },
  { country: "ID", tier: 1, name: "Institut Teknologi Bandung", abbr: "ITB", city: "Bandung",
    qsWorld: 256,     strengths: ["Computer Science", "Electrical Engineering", "Industrial Engineering"],
    intake: "Aug", langs: ["ID", "EN"], site: "itb.ac.id", notes: "Strongest engineering brand in Indonesia; unicorn founder pipeline." },
  { country: "ID", tier: 1, name: "Universitas Gadjah Mada", abbr: "UGM", city: "Yogyakarta",
    qsWorld: 234, strengths: ["Computer Science", "Engineering", "Business"],
    intake: "Aug", langs: ["ID", "EN"], site: "ugm.ac.id", notes: "Largest quality cohort; high relocation willingness to Jakarta." },
  { country: "ID", tier: 2, name: "Institut Teknologi Sepuluh Nopember", abbr: "ITS", city: "Surabaya",
    qsWorld: 369,     strengths: ["Computer Science", "Mechanical Engineering", "Marine Engineering"],
    intake: "Aug", langs: ["ID"], site: "its.ac.id", notes: "East Java hub; strong competitive-programming culture." },
  { country: "ID", tier: 2, name: "Bina Nusantara University", abbr: "BINUS", city: "Jakarta",
    qsWorld: null, strengths: ["Computer Science", "Information Systems", "Design / HCI"],
    intake: "Sep", langs: ["ID", "EN"], site: "binus.ac.id", notes: "Mandatory 1-year 'Enrichment' track — easiest Indonesian internship partner." },
  { country: "ID", tier: 3, name: "Universitas Airlangga", abbr: "UNAIR", city: "Surabaya",
    qsWorld: 308, strengths: ["Business", "Economics", "Health Sciences"],
    intake: "Aug", langs: ["ID"], site: "unair.ac.id", notes: "Good for commercial / operations tracks." },

  // ---------------- Philippines ----------------
  { country: "PH", tier: 1, name: "University of the Philippines Diliman", abbr: "UPD", city: "Quezon City",
    qsWorld: 336, strengths: ["Computer Science", "Engineering", "Economics"],
    intake: "Aug", langs: ["EN", "FIL"], site: "upd.edu.ph", notes: "Top national brand; highest technical ceiling but small CS cohort." },
  { country: "PH", tier: 1, name: "Ateneo de Manila University", abbr: "ADMU", city: "Quezon City",
    qsWorld: 563, strengths: ["Business Administration", "Computer Science", "Communication"],
    intake: "Aug", langs: ["EN"], site: "ateneo.edu", notes: "Strongest English-language commercial talent; excellent client-facing profiles." },
  { country: "PH", tier: 2, name: "De La Salle University", abbr: "DLSU", city: "Manila",
    qsWorld: 681, strengths: ["Engineering", "Computer Science", "Business Administration"],
    intake: "Aug", langs: ["EN"], site: "dlsu.edu.ph", notes: "Trimester system — can supply interns almost year-round." },
  { country: "PH", tier: 2, name: "University of Santo Tomas", abbr: "UST", city: "Manila",
    qsWorld: 801, strengths: ["Engineering", "Information Systems", "Finance / Accountancy"],
    intake: "Aug", langs: ["EN"], site: "ust.edu.ph", notes: "High volume; reliable for shared-services and finance ops." },
  { country: "PH", tier: 3, name: "Mapúa University", abbr: "Mapúa", city: "Manila",
    qsWorld: null, strengths: ["Engineering", "Computer Engineering", "Information Systems"],
    intake: "Aug", langs: ["EN"], site: "mapua.edu.ph", notes: "Quarter-term calendar; deep engineering volume." },

  // ---------------- Thailand ----------------
  { country: "TH", tier: 1, name: "Chulalongkorn University", abbr: "CU", city: "Bangkok",
    qsWorld: 211, strengths: ["Engineering", "Computer Engineering", "Business Administration"],
    intake: "Aug", langs: ["TH", "EN"], site: "chula.ac.th", notes: "Top Thai brand; international programs have strong English proficiency." },
  { country: "TH", tier: 1, name: "Mahidol University", abbr: "MU", city: "Nakhon Pathom / Bangkok",
    qsWorld: 382, strengths: ["Information Systems", "Data Science", "Health Sciences"],
    intake: "Aug", langs: ["TH", "EN"], site: "mahidol.ac.th", notes: "MUICT faculty runs fully English-taught computing degrees." },
  { country: "TH", tier: 2, name: "Chiang Mai University", abbr: "CMU", city: "Chiang Mai",
    qsWorld: 571, strengths: ["Engineering", "Software Engineering", "Science"],
    intake: "Aug", langs: ["TH"], site: "cmu.ac.th", notes: "Lower comp expectations; strong remote-delivery engineering pool." },
  { country: "TH", tier: 2, name: "King Mongkut's University of Technology Thonburi", abbr: "KMUTT", city: "Bangkok",
    qsWorld: 751, strengths: ["Engineering", "Computer Engineering", "Robotics"],
    intake: "Aug", langs: ["TH", "EN"], site: "kmutt.ac.th", notes: "Best hands-on engineering co-op program in Thailand." },
  { country: "TH", tier: 3, name: "Thammasat University", abbr: "TU", city: "Bangkok",
    qsWorld: 601, strengths: ["Business Administration", "Economics", "Engineering"],
    intake: "Aug", langs: ["TH", "EN"], site: "tu.ac.th", notes: "SIIT campus is English-medium engineering." },

  // ---------------- Vietnam ----------------
  { country: "VN", tier: 1, name: "Hanoi University of Science and Technology", abbr: "HUST", city: "Hanoi",
    qsWorld: null, strengths: ["Computer Science", "Electrical Engineering", "Automation"],
    intake: "Sep", langs: ["VN", "EN"], site: "hust.edu.vn", notes: "Vietnam's #1 engineering pipeline; olympiad-grade algorithmic talent." },
  { country: "VN", tier: 1, name: "VNU University of Engineering & Technology", abbr: "VNU-UET", city: "Hanoi",
    qsWorld: null, strengths: ["Computer Science", "Artificial Intelligence", "Electrical Engineering"],
    intake: "Sep", langs: ["VN", "EN"], site: "uet.vnu.edu.vn", notes: "Strong AI/ML research track; growing English capability." },
  { country: "VN", tier: 1, name: "Ho Chi Minh City University of Technology", abbr: "HCMUT", city: "Ho Chi Minh City",
    qsWorld: null, strengths: ["Computer Science", "Engineering", "Industrial Engineering"],
    intake: "Sep", langs: ["VN", "EN"], site: "hcmut.edu.vn", notes: "Southern anchor school; feeds the HCMC tech cluster." },
  { country: "VN", tier: 2, name: "University of Science, VNU-HCM", abbr: "HCMUS", city: "Ho Chi Minh City",
    qsWorld: null, strengths: ["Information Systems", "Mathematics / Statistics", "Data Science"],
    intake: "Sep", langs: ["VN"], site: "hcmus.edu.vn", notes: "Deep math/algorithms bench — good for quant and ML roles." },
  { country: "VN", tier: 2, name: "FPT University", abbr: "FPT", city: "Hanoi / HCMC / Da Nang",
    qsWorld: null, strengths: ["Software Engineering", "Information Systems", "Business Administration"],
    intake: "Jan / May / Sep", langs: ["VN", "EN"], site: "fpt.edu.vn", notes: "Mandatory 4-month On-the-Job Training; 3 intakes/year = year-round interns." },
  { country: "VN", tier: 3, name: "RMIT University Vietnam", abbr: "RMIT VN", city: "Ho Chi Minh City",
    qsWorld: null, strengths: ["Information Systems", "Business Administration", "Design / HCI"],
    intake: "Feb / Jun / Oct", langs: ["EN"], site: "rmit.edu.vn", notes: "Fully English-medium; premium comp expectations, lowest ramp friction." }
];

/* ------------------------------------------------------------------ *
 * A2. Salary benchmarks
 * intern = MONTHLY stipend; grad/mid/senior = ANNUAL base, local currency.
 * ------------------------------------------------------------------ */
const SALARY = {
  SG: {
    costIndex: 100, employerBurden: "CPF up to 17% of ordinary wage",
    roles: [
      { role: "Software Engineer",       intern: [1200, 2000], grad: [66000, 90000],  mid: [96000, 140000],  senior: [140000, 200000] },
      { role: "Data / ML Engineer",      intern: [1200, 2200], grad: [70000, 95000],  mid: [102000, 150000], senior: [150000, 215000] },
      { role: "Product Manager",         intern: [1100, 1800], grad: [66000, 88000],  mid: [100000, 145000], senior: [150000, 210000] },
      { role: "Business / Data Analyst", intern: [1000, 1600], grad: [54000, 72000],  mid: [78000, 105000],  senior: [105000, 145000] },
      { role: "Sales / GTM",             intern: [900, 1500],  grad: [48000, 70000],  mid: [80000, 120000],  senior: [120000, 180000] },
      { role: "Customer Support / Ops",  intern: [800, 1300],  grad: [40000, 54000],  mid: [55000, 75000],   senior: [75000, 100000] }
    ]
  },
  MY: {
    costIndex: 38, employerBurden: "EPF 12-13% + SOCSO/EIS ~2%",
    roles: [
      { role: "Software Engineer",       intern: [1000, 2000], grad: [42000, 66000], mid: [72000, 120000],  senior: [120000, 180000] },
      { role: "Data / ML Engineer",      intern: [1200, 2200], grad: [48000, 72000], mid: [78000, 132000],  senior: [132000, 192000] },
      { role: "Product Manager",         intern: [1000, 1800], grad: [45000, 66000], mid: [78000, 126000],  senior: [126000, 186000] },
      { role: "Business / Data Analyst", intern: [900, 1500],  grad: [36000, 54000], mid: [58000, 90000],   senior: [90000, 132000] },
      { role: "Sales / GTM",             intern: [800, 1400],  grad: [33000, 54000], mid: [60000, 96000],   senior: [96000, 150000] },
      { role: "Customer Support / Ops",  intern: [700, 1200],  grad: [28000, 42000], mid: [44000, 66000],   senior: [66000, 96000] }
    ]
  },
  ID: {
    costIndex: 33, employerBurden: "BPJS health + employment ~10-11%; THR = 1 extra month",
    roles: [
      { role: "Software Engineer",       intern: [3000000, 6000000],  grad: [96000000, 168000000],  mid: [180000000, 360000000], senior: [360000000, 660000000] },
      { role: "Data / ML Engineer",      intern: [3500000, 7000000],  grad: [108000000, 192000000], mid: [204000000, 396000000], senior: [396000000, 720000000] },
      { role: "Product Manager",         intern: [3000000, 6000000],  grad: [102000000, 180000000], mid: [198000000, 384000000], senior: [384000000, 700000000] },
      { role: "Business / Data Analyst", intern: [2500000, 5000000],  grad: [84000000, 144000000],  mid: [150000000, 276000000], senior: [276000000, 480000000] },
      { role: "Sales / GTM",             intern: [2500000, 4500000],  grad: [78000000, 144000000],  mid: [144000000, 288000000], senior: [288000000, 540000000] },
      { role: "Customer Support / Ops",  intern: [2000000, 4000000],  grad: [60000000, 102000000],  mid: [102000000, 180000000], senior: [180000000, 300000000] }
    ]
  },
  PH: {
    costIndex: 35, employerBurden: "SSS / PhilHealth / Pag-IBIG ~10%; 13th month mandatory",
    roles: [
      { role: "Software Engineer",       intern: [8000, 18000], grad: [390000, 650000], mid: [700000, 1300000], senior: [1300000, 2300000] },
      { role: "Data / ML Engineer",      intern: [9000, 20000], grad: [430000, 720000], mid: [780000, 1450000], senior: [1450000, 2500000] },
      { role: "Product Manager",         intern: [8000, 18000], grad: [420000, 700000], mid: [780000, 1400000], senior: [1400000, 2400000] },
      { role: "Business / Data Analyst", intern: [7000, 15000], grad: [330000, 540000], mid: [580000, 980000],  senior: [980000, 1700000] },
      { role: "Sales / GTM",             intern: [6500, 14000], grad: [300000, 540000], mid: [560000, 1000000], senior: [1000000, 1900000] },
      { role: "Customer Support / Ops",  intern: [6000, 12000], grad: [240000, 390000], mid: [400000, 660000],  senior: [660000, 1100000] }
    ]
  },
  TH: {
    costIndex: 42, employerBurden: "Social Security 5% (capped ~THB 750/mo)",
    roles: [
      { role: "Software Engineer",       intern: [9000, 18000],  grad: [360000, 600000], mid: [660000, 1200000], senior: [1200000, 2100000] },
      { role: "Data / ML Engineer",      intern: [10000, 20000], grad: [400000, 660000], mid: [720000, 1320000], senior: [1320000, 2280000] },
      { role: "Product Manager",         intern: [9000, 18000],  grad: [390000, 640000], mid: [720000, 1260000], senior: [1260000, 2160000] },
      { role: "Business / Data Analyst", intern: [8000, 15000],  grad: [312000, 480000], mid: [540000, 900000],  senior: [900000, 1500000] },
      { role: "Sales / GTM",             intern: [8000, 14000],  grad: [288000, 480000], mid: [540000, 960000],  senior: [960000, 1680000] },
      { role: "Customer Support / Ops",  intern: [7000, 12000],  grad: [216000, 330000], mid: [360000, 600000],  senior: [600000, 960000] }
    ]
  },
  VN: {
    costIndex: 30, employerBurden: "Social / health / unemployment insurance ~21.5%; 13th month customary",
    roles: [
      { role: "Software Engineer",       intern: [4000000, 9000000],  grad: [156000000, 288000000], mid: [300000000, 600000000], senior: [600000000, 1080000000] },
      { role: "Data / ML Engineer",      intern: [5000000, 10000000], grad: [180000000, 324000000], mid: [336000000, 660000000], senior: [660000000, 1200000000] },
      { role: "Product Manager",         intern: [4500000, 9000000],  grad: [168000000, 312000000], mid: [324000000, 624000000], senior: [624000000, 1140000000] },
      { role: "Business / Data Analyst", intern: [4000000, 8000000],  grad: [132000000, 240000000], mid: [252000000, 456000000], senior: [456000000, 780000000] },
      { role: "Sales / GTM",             intern: [3500000, 7000000],  grad: [120000000, 240000000], mid: [240000000, 480000000], senior: [480000000, 900000000] },
      { role: "Customer Support / Ops",  intern: [3000000, 6000000],  grad: [96000000, 168000000],  mid: [168000000, 288000000], senior: [288000000, 480000000] }
    ]
  }
};

const LEVELS = [
  { key: "intern", label: "Intern (monthly stipend)", monthly: true },
  { key: "grad",   label: "Fresh Grad (0-1 yr)",      monthly: false },
  { key: "mid",    label: "Mid (3-5 yr)",             monthly: false },
  { key: "senior", label: "Senior (6-9 yr)",          monthly: false }
];

/* ------------------------------------------------------------------ *
 * A3. Academic calendar — ISO week based (week 1 = first week of Jan).
 * A band that wraps the year end (start > end) is drawn in two pieces.
 * ------------------------------------------------------------------ */
const CALENDAR = {
  SG: {
    system: "Two 13-week semesters (Aug→Dec, Jan→May) plus a long May–Jul vacation.",
    internWindow: "Mid-May → early Aug (12-14 wks). NTU / SUTD / SIT also support 20-24 week attachments in Jan–Jun.",
    gradMonth: "July ceremonies — students are work-ready from late May.",
    bands: [
      { label: "Semester 1",  type: "term",   start: 33, end: 46 },
      { label: "Recess week", type: "break",  start: 40, end: 40 },
      { label: "Exams S1",    type: "exam",   start: 47, end: 49 },
      { label: "Winter break",type: "break",  start: 50, end: 2 },
      { label: "Semester 2",  type: "term",   start: 3,  end: 16 },
      { label: "Recess week", type: "break",  start: 9,  end: 9 },
      { label: "Exams S2",    type: "exam",   start: 17, end: 19 },
      { label: "Summer internship window", type: "intern", start: 20, end: 32 },
      { label: "Graduation",  type: "grad",   start: 28, end: 29 }
    ]
  },
  MY: {
    system: "Public universities run Oct→Feb and Mar→Jul semesters; private / AU-linked campuses run Feb & Jul intakes.",
    internWindow: "Jul → Sep (12-16 wks industrial training), plus a shorter Mar → Apr window.",
    gradMonth: "Convocation Sep–Nov; coursework completes by July.",
    bands: [
      { label: "Semester 1",        type: "term",   start: 41, end: 52 },
      { label: "Semester 1 cont.",  type: "term",   start: 3,  end: 7 },
      { label: "Mid-sem break",     type: "break",  start: 1,  end: 2 },
      { label: "Exams S1",          type: "exam",   start: 8,  end: 10 },
      { label: "Short internship window", type: "intern", start: 11, end: 16 },
      { label: "Semester 2",        type: "term",   start: 12, end: 24 },
      { label: "Exams S2",          type: "exam",   start: 25, end: 27 },
      { label: "Industrial training (long)", type: "intern", start: 28, end: 40 },
      { label: "Convocation",       type: "grad",   start: 43, end: 45 }
    ]
  },
  ID: {
    system: "Odd semester Aug→Jan, even semester Feb→Jul. The Eid al-Fitr break shifts about 11 days earlier each year.",
    internWindow: "Jun → Aug (12 wks). The national credited-internship policy allows a fully credited 16-20 week placement inside either semester.",
    gradMonth: "Graduation ceremonies in Feb/Mar and Aug/Sep — two graduating cohorts per year.",
    bands: [
      { label: "Odd semester",    type: "term",  start: 33, end: 50 },
      { label: "Final exams",     type: "exam",  start: 51, end: 52 },
      { label: "Semester break",  type: "break", start: 1,  end: 5 },
      { label: "Even semester",   type: "term",  start: 6,  end: 23 },
      { label: "Graduation (February)", type: "grad", start: 8, end: 9 },
      { label: "Eid al-Fitr break", type: "break", start: 13, end: 15 },
      { label: "Final exams",     type: "exam",  start: 24, end: 25 },
      { label: "Credited / summer internship", type: "intern", start: 24, end: 34 },
      { label: "Graduation (August)", type: "grad", start: 34, end: 35 }
    ]
  },
  PH: {
    system: "Top schools use a shifted Aug→May calendar. DLSU runs trimesters and Mapúa runs quarters.",
    internWindow: "Jun → Aug (12 wks), plus the government-mandated in-semester On-the-Job Training block from Feb → May.",
    gradMonth: "June/July commencement; On-the-Job Training completes Apr–May.",
    bands: [
      { label: "First semester",  type: "term",  start: 32, end: 49 },
      { label: "Finals",          type: "exam",  start: 50, end: 51 },
      { label: "Christmas break", type: "break", start: 52, end: 2 },
      { label: "Second semester", type: "term",  start: 3,  end: 20 },
      { label: "Credited On-the-Job Training", type: "intern", start: 7, end: 20 },
      { label: "Finals",          type: "exam",  start: 21, end: 22 },
      { label: "Summer internship window", type: "intern", start: 23, end: 31 },
      { label: "Commencement",    type: "grad",  start: 24, end: 26 }
    ]
  },
  TH: {
    system: "Most universities have returned to the Aug→Dec / Jan→May calendar. The Thai New Year holiday freezes mid-April.",
    internWindow: "Jun → Aug (12 wks). KMUTT and engineering faculties run a 16-week co-op block inside semester 2.",
    gradMonth: "Coursework ends May; official ceremonies Oct–Dec.",
    bands: [
      { label: "Semester 1",  type: "term",  start: 32, end: 48 },
      { label: "Final exams", type: "exam",  start: 49, end: 51 },
      { label: "New Year break", type: "break", start: 52, end: 1 },
      { label: "Semester 2",  type: "term",  start: 2,  end: 18 },
      { label: "Co-op block (engineering)", type: "intern", start: 2, end: 17 },
      { label: "Thai New Year holiday", type: "break", start: 15, end: 16 },
      { label: "Final exams", type: "exam",  start: 19, end: 21 },
      { label: "Summer internship window", type: "intern", start: 22, end: 31 },
      { label: "Graduation ceremony", type: "grad", start: 42, end: 44 }
    ]
  },
  VN: {
    system: "Semester 1 Sep→Jan, Semester 2 Feb→Jun. The Lunar New Year holiday (late Jan / Feb) freezes roughly three weeks of activity.",
    internWindow: "Jun → Aug (12 wks). The final-year graduation internship runs 8-16 wks Feb→Jun; FPT's On-the-Job Training is 16 wks in any term.",
    gradMonth: "Jun–Jul, with a second cohort in Oct–Nov.",
    bands: [
      { label: "Semester 1",  type: "term",  start: 36, end: 52 },
      { label: "Exams S1",    type: "exam",  start: 1,  end: 3 },
      { label: "Lunar New Year holiday", type: "break", start: 4, end: 6 },
      { label: "Semester 2",  type: "term",  start: 7,  end: 22 },
      { label: "Graduation internship", type: "intern", start: 7, end: 20 },
      { label: "Exams S2",    type: "exam",  start: 23, end: 24 },
      { label: "Summer internship window", type: "intern", start: 24, end: 34 },
      { label: "Graduation",  type: "grad",  start: 26, end: 28 }
    ]
  }
};

const BAND_STYLE = {
  term:   { color: "#3b82f6", label: "Teaching term" },
  exam:   { color: "#ef4444", label: "Exams" },
  break:  { color: "#94a3b8", label: "Break / holiday" },
  intern: { color: "#10b981", label: "Internship window" },
  grad:   { color: "#f59e0b", label: "Graduation" }
};

/* ------------------------------------------------------------------ *
 * B. Lead generator reference data
 * ------------------------------------------------------------------ */
const MAJORS = [
  "Computer Science", "Software Engineering", "Information Systems", "Data Science",
  "Artificial Intelligence", "Electrical Engineering", "Computer Engineering",
  "Industrial Engineering", "Mathematics / Statistics", "Business Administration",
  "Economics", "Finance / Accountancy", "Marketing", "Design / HCI"
];

/* English degree-name variants used to widen people-search recall. */
const MAJOR_SYNONYMS = {
  "Computer Science": ["Computer Science", "Computing", "Computer Studies", "Informatics", "Computing Science"],
  "Software Engineering": ["Software Engineering", "Software Development", "Software Systems", "Applied Computing"],
  "Information Systems": ["Information Systems", "Information Technology", "Management Information Systems", "Business Information Systems"],
  "Data Science": ["Data Science", "Data Analytics", "Business Analytics", "Applied Data Science"],
  "Artificial Intelligence": ["Artificial Intelligence", "Machine Learning", "Intelligent Systems", "Applied AI"],
  "Electrical Engineering": ["Electrical Engineering", "Electronics Engineering", "Electrical and Electronic Engineering", "Electrical Power Engineering"],
  "Computer Engineering": ["Computer Engineering", "Computer Systems Engineering", "Embedded Systems Engineering"],
  "Industrial Engineering": ["Industrial Engineering", "Industrial and Systems Engineering", "Manufacturing Engineering", "Operations Engineering"],
  "Mathematics / Statistics": ["Mathematics", "Statistics", "Applied Mathematics", "Mathematical Sciences"],
  "Business Administration": ["Business Administration", "Management", "Business Management", "Business Studies"],
  "Economics": ["Economics", "Applied Economics", "Economics and Finance"],
  "Finance / Accountancy": ["Finance", "Accountancy", "Accounting", "Banking and Finance"],
  "Marketing": ["Marketing", "Marketing Communications", "Marketing Management", "Digital Marketing"],
  "Design / HCI": ["Product Design", "Human-Computer Interaction", "UX Design", "Interaction Design"]
};

/* Name pools used to present full candidate names.
 * Each market holds one or more groups, and a group keeps given and family names
 * from the same naming tradition so the two halves pair plausibly.
 * "order" is "family-first" where that market writes the family name first. */
const NAME_POOLS = {
  SG: [
    { given: ["Jia Hui", "Wei Ming", "Xin Yi", "Cheryl", "Marcus", "Rachel", "Daniel", "Shaun", "Jing Wen", "Yong Sheng"],
      family: ["Tan", "Lim", "Lee", "Ng", "Wong", "Chua", "Goh", "Koh", "Teo", "Sim"] },
    { given: ["Nurul", "Amirah", "Faizal", "Syafiq", "Hidayah"],
      family: ["Rahman", "Ismail", "Hassan", "Yusof", "Osman"] },
    { given: ["Aravind", "Priya", "Kavitha", "Dinesh", "Shalini"],
      family: ["Pillai", "Subramaniam", "Nair", "Menon", "Raj"] }
  ],
  MY: [
    { given: ["Aisyah", "Siti", "Hafiz", "Nadia", "Amirul", "Farah", "Zulkifli"],
      family: ["Abdullah", "Ibrahim", "Yusof", "Hassan", "Zainal", "Othman", "Mansor"] },
    { given: ["Wei Jian", "Mei Ling", "Kah Wai", "Darren", "Shu Ting", "Jun Kit"],
      family: ["Chong", "Lau", "Teoh", "Yeoh", "Khoo", "Tan"] },
    { given: ["Pravin", "Deepa", "Ramesh", "Anitha"],
      family: ["Subramaniam", "Raj", "Muniandy", "Krishnan"] }
  ],
  ID: [
    { given: ["Dewi", "Rizky", "Putri", "Bagus", "Andi", "Sari", "Fajar", "Intan", "Yoga", "Naufal"],
      family: ["Wijaya", "Santoso", "Pratama", "Nugroho", "Halim", "Setiawan", "Kusuma",
               "Hartono", "Siregar", "Permana", "Anggraini", "Wibowo"] }
  ],
  PH: [
    { given: ["Maria Clara", "Angelo", "Joshua", "Patricia", "Miguel", "Kristine", "Paolo",
              "Bea", "Rafael", "Camille"],
      family: ["Santos", "Reyes", "Cruz", "Bautista", "Garcia", "Mendoza", "Dela Cruz",
               "Villanueva", "Aquino", "Ramos"] }
  ],
  TH: [
    { given: ["Pimchanok", "Chayanin", "Supaporn", "Nattapong", "Kanya", "Thanakorn",
              "Siriporn", "Ekkarat", "Waraporn", "Puripat"],
      family: ["Srisuk", "Chaiyaphum", "Wongsawat", "Thongchai", "Rattanakosin", "Boonmee",
               "Sirikul", "Phongpaichit", "Kittikhun", "Amornrat"] }
  ],
  /* Vietnamese names are written family name first. */
  VN: [
    { order: "family-first",
      given: ["Minh Anh", "Quang Huy", "Thu Ha", "Duc Anh", "Ngoc Mai", "Tuan Kiet",
              "Phuong Linh", "Gia Bao", "Khanh Vy", "Hoang Nam"],
      family: ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Vu", "Bui", "Dang", "Do", "Ngo"] }
  ]
};

