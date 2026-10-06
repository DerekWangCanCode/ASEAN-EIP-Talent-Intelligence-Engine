/* ==================================================================
 * TALENT DISCOVERY ENGINE — reference data
 * ------------------------------------------------------------------
 * Section B runs on ONE candidate model: TALENT_POOL_CANDIDATES from
 * data/talentpool.js (992 people across 9 managed pools). This file
 * adds only the layer the engine needs on top of that roster:
 *
 *   ENGINE_PROFESSIONS  the six professions shown on the dashboard,
 *                       each bound to its home talent pool
 *   ENGINE_DEMAND       mock hiring demand (headcount) per market per
 *                       profession, used to score pipeline vs target
 *   ENGINE_COVERAGE     what "a covered target school" means
 *   ENGINE_TITLES       searchable job titles -> profession profile
 *   ENGINE_PROMPTS      the Copilot tab's suggested prompts
 *
 * Everything else the UI shows is derived at runtime so the numbers on
 * the dashboard, in search results and in the Copilot answers can never
 * disagree with each other.
 *
 * All figures are invented for the prototype. Nothing here is a live
 * ATS record or a real compensation or demand plan.
 * ================================================================== */

/* The six professions on the Talent Pool Snapshot. `pool` is a real
 * foreign key into TALENT_POOLS.id, and `fn` into DISCOVERY_FUNCTIONS.id
 * (which carries the titles, majors and skills that define the profile). */
const ENGINE_PROFESSIONS = [
  { id: "swe",         label: "Software Engineering",       short: "SWE",
    pool: "ENG-SWE",   fn: "swe",         accent: "#4c7ef3", icon: "⌨" },
  { id: "datacenter",  label: "Data Center Engineering",    short: "Data Center",
    pool: "ENG-DC",    fn: "datacenter",  accent: "#12a594", icon: "▤" },
  { id: "cloudarch",   label: "Cloud Solution Architecture", short: "Cloud Arch",
    pool: "COM-TSELL", fn: "techsell",    accent: "#8b5cf6", icon: "☁" },
  { id: "custsuccess", label: "Customer Success",           short: "Cust. Success",
    pool: "COM-CS",    fn: "custsuccess", accent: "#e0a33c", icon: "◎" },
  { id: "techsupport", label: "Technical Support",          short: "Tech Support",
    pool: "COM-TSUP",  fn: "techsupport", accent: "#31b57a", icon: "🛟" },
  { id: "sales",       label: "Sales",                      short: "Sales",
    pool: "COM-SALES", fn: "sales",       accent: "#f06f5e", icon: "↗" }
];

/* Mock hiring demand for the coming graduate intake, in headcount.
 * The engine targets ENGINE_PIPELINE_RATIO qualified people in pool per
 * planned hire — the usual campus rule of thumb. */
const ENGINE_PIPELINE_RATIO = 4;

const ENGINE_DEMAND = {
  SG: { swe: 10, datacenter: 6, cloudarch: 5, custsuccess: 4, techsupport: 4, sales: 7 },
  MY: { swe:  9, datacenter: 8, cloudarch: 5, custsuccess: 4, techsupport: 5, sales: 5 },
  PH: { swe:  7, datacenter: 4, cloudarch: 3, custsuccess: 6, techsupport: 10, sales: 5 },
  TH: { swe:  8, datacenter: 5, cloudarch: 3, custsuccess: 3, techsupport: 4, sales: 4 },
  VN: { swe: 14, datacenter: 4, cloudarch: 4, custsuccess: 3, techsupport: 4, sales: 4 },
  ID: { swe: 11, datacenter: 6, cloudarch: 4, custsuccess: 5, techsupport: 6, sales: 5 }
};

/* A target school only counts as covered once there is a real pipeline
 * sitting in it — enough people, and enough of them actually warm.
 * "Warm" is Engaged or later on the talent-pool lifecycle. */
const ENGINE_COVERAGE = { minCandidates: 25, minWarm: 12, warmFromStage: 2 };

/* A candidate is High Potential at or above this relevance score. */
const ENGINE_HIGH_POTENTIAL = 85;

/* Match-score bands used across the search tab. */
const ENGINE_MATCH = { floor: 55, strong: 80, good: 68 };

/* ------------------------------------------------------------------
 * Skill adjacency
 * ------------------------------------------------------------------
 * Talent pools list their own vocabulary, so a literal string match
 * between two pools badly understates how transferable somebody is —
 * "Solution Architecture" and "Distributed Systems" are the same muscle.
 * Two skills are adjacent when they share a group below. Adjacency earns
 * partial credit in the match score and is what makes genuinely hidden
 * talent surface instead of only exact-vocabulary duplicates.
 * ------------------------------------------------------------------ */
const ENGINE_SKILL_GROUPS = {
  cloud:      ["AWS", "Azure", "Cloud Migration", "Terraform", "Kubernetes", "Capacity Planning"],
  backend:    ["Java", "Python", "Go", "C++", ".NET", "Node.js", "Embedded C", "Scripting", "Firmware"],
  web:        ["TypeScript", "React", "GraphQL", "API Design", "Node.js", "Demo Delivery"],
  data:       ["SQL", "Data Platforms", "Power BI", "Analytics", "Churn Analysis",
               "Customer Health Scoring", "PyTorch", "Computer Vision", "Forecasting"],
  systems:    ["Distributed Systems", "Microservices", "Solution Architecture", "Linux Kernel",
               "Linux", "Networking", "Network Protocols", "Windows Server", "SRE Practices",
               "Signal Processing"],
  delivery:   ["CI/CD", "Agile / Scrum", "Jira", "Programme Management", "Incident Management",
               "Change Management", "Project Scheduling", "Delivery Management"],
  security:   ["Cryptography", "Penetration Testing", "Security Architecture", "Root Cause Analysis"],
  customer:   ["Customer Communication", "Stakeholder Management", "Escalation Management",
               "Presentation", "Demo Delivery", "QBR Facilitation", "Onboarding Design",
               "Requirements Workshops"],
  commercial: ["Pipeline Management", "Salesforce", "Negotiation", "Prospecting", "Account Planning",
               "Forecasting", "Value Selling", "CRM Hygiene", "Territory Planning", "Renewals",
               "Adoption Planning", "Pre-sales Scoping", "Proof of Concept"],
  facilities: ["Power Distribution", "HVAC & Cooling", "Critical Facilities", "Electrical Design",
               "Commissioning", "BMS / SCADA", "Energy Efficiency", "Site Safety", "AutoCAD",
               "Revit", "Capacity Planning"],
  process:    ["Process Improvement", "Six Sigma", "Process Mapping", "Vendor Management",
               "Risk Management", "Business Case Modelling", "Solution Design", "Data Migration",
               "Troubleshooting", "SLA Management", "ServiceNow", "Zendesk"],
  hardware:   ["FPGA / RTL", "Verilog", "CUDA", "Signal Processing", "Computer Vision", "Firmware"]
};

/* Degree families, used the same way: a Computer Engineering graduate is
 * not an exact match for a Computer Science profile, but is far from a
 * stranger to it. */
const ENGINE_MAJOR_FAMILIES = {
  software:   ["Computer Science", "Software Engineering", "Information Systems", "Data Science",
               "Artificial Intelligence", "Computer Engineering", "Information Technology",
               "Applied Computing", "Cybersecurity", "Mathematics / Statistics"],
  hardware:   ["Electrical Engineering", "Mechanical Engineering", "Computer Engineering",
               "Energy Engineering", "Facilities & Building Services Engineering",
               "Materials Science", "Systems Engineering"],
  operations: ["Industrial Engineering", "Systems Engineering", "Operations Management",
               "Business Administration", "Economics"],
  commercial: ["Business Administration", "Marketing", "Economics", "Finance / Accountancy",
               "Communications", "Information Systems"]
};

/* Match-score weights. They sum to 1 before the requested-skill
 * adjustment, so the headline number really is "percent of the profile
 * this person meets". */
const ENGINE_WEIGHTS = {
  skills: 0.45, major: 0.30, tier: 0.15, standing: 0.10,
  skillBonus: 8,   /* every requested skill present */
  skillPenalty: 10 /* none of the requested skills present */
};

/* ------------------------------------------------------------------
 * SECTION C — RECOMMENDED RECRUITING ACTIONS
 * ------------------------------------------------------------------
 * The opportunity map. `label` is the headline signal the recruiter is
 * meant to read off the map; `x` / `y` are percentages inside the
 * stylised ASEAN silhouette drawn by assets/engine.js, derived from the
 * real capital-city coordinates so the pins land where they should.
 * ------------------------------------------------------------------ */
const ENGINE_OPPORTUNITY = {
  VN: { label: "High opportunity",       tone: "hot",     x: 41.4, y: 18.2, side: "right" },
  TH: { label: "Coverage gap",           tone: "gap",     x: 24.3, y: 21.2, side: "left"  },
  PH: { label: "Growing pipeline",       tone: "grow",    x: 82.9, y: 22.5, side: "left"  },
  MY: { label: "Strong graduate timing", tone: "time",    x: 27.7, y: 57.2, side: "left"  },
  SG: { label: "Premium, speed-driven",  tone: "premium", x: 33.7, y: 62.8, side: "right" },
  ID: { label: "Large talent pool",      tone: "volume",  x: 42.3, y: 85.4, side: "right" }
};

/* Simplified ASEAN landmasses, drawn in a 0 0 100 76 viewBox. The
 * coordinates come from a plain linear projection of real lon/lat
 * (x = (lon - 92) × 2.857, y = (22 - lat) × 2.303), so the silhouette is
 * geographically honest even though the outlines are coarse. */
const ENGINE_MAP_SHAPES = [
  /* mainland Indochina */
  "5.7,2.3 14.3,0 25.7,0 32.9,0 40,0 45.7,1.2 50,9.2 48.6,16.1 41.4,26.5 38.6,30.9 " +
  "34.3,28.8 31.4,25.3 30,23 24.3,19.6 23.7,32.2 20,28.8 18.6,23 17.1,13.8 14.3,10.4 7.1,4.6",
  /* peninsular Malaysia */
  "23.1,35.7 25.7,35.7 30,37.3 32.9,39.6 34.9,44.2 33.1,47.7 31.4,47 28.6,44.9 25.7,42.6 23.7,39.2",
  /* Sumatra */
  "9.4,38 17.1,42.6 25.7,48.4 34.3,55.3 39.4,64 34.3,64.2 28.6,59.9 22.9,54.1 15.7,47.2 9.1,38.7",
  /* Java */
  "37.7,66.2 51.4,65.3 64.3,69.5 64,70.9 51.4,69.5 38.6,67.8",
  /* Borneo */
  "48.6,46.1 57.1,43.3 65.7,38.9 71.9,41 77.1,38.2 76.6,43.8 71.4,48.4 70,55.3 62.9,58.7 " +
  "54.3,57.6 50,53 48.3,48.8",
  /* Sulawesi */
  "78.6,48.4 82.9,49.5 88.6,48.8 94.3,47.2 92.9,50.7 85.7,51.8 84.3,57.6 82.3,63.3 79.4,62.8 80.9,57.6 78.6,53",
  /* Luzon */
  "80.9,8.1 84.3,8.5 86.6,10.8 85.1,15.4 87.1,18.4 84.3,18.9 81.7,17.3 80,14.3 79.4,10.4",
  /* Visayas */
  "85.7,24.2 92.9,23.5 95.7,26.5 90,28.8 85.7,27.6",
  /* Mindanao */
  "85.4,32.2 91.4,30.9 97.7,31.8 97.1,35.7 91.4,37.1 86.3,34.8"
];

/* Suggested prompts for the Talent Intelligence Copilot. The Copilot is
 * a secondary "explain & explore" layer under the recommendations, so
 * every prompt interrogates or extends a recommendation rather than
 * opening a blank conversation. `intent` binds the prompt to an answer
 * generator in assets/engine.js. */
const ENGINE_PROMPTS = [
  { intent: "why",      icon: "❓", text: "Why is Vietnam recommended?" },
  { intent: "similar",  icon: "🎓", text: "Which schools similar to HCMUT should I prioritize?" },
  { intent: "strategy", icon: "🗺", text: "Create a campus engagement strategy." },
  { intent: "compare",  icon: "⚖",  text: "Compare Vietnam and Indonesia." },
  { intent: "plan",     icon: "🗓", text: "Generate a FY28 internship hiring plan." }
];

/* Keyword routing for anything typed free-hand into the Copilot. Checked
 * in order; first rule that matches all of its `all` terms wins. The
 * recommendation-explaining intents are checked first, because a question
 * like "why is Vietnam recommended?" also names a market and would
 * otherwise fall through to the generic market answer. */
const ENGINE_INTENT_RULES = [
  { intent: "why",        any: ["why is", "why are", "why do you", "why vietnam", "why recommend",
                                "why recommended", "explain this", "explain the recommend",
                                "justify", "what is the evidence"] },
  { intent: "similar",    any: ["similar to", "schools like", "universities like", "comparable school",
                                "schools similar", "same profile as"] },
  { intent: "strategy",   any: ["engagement strategy", "campus strategy", "campus engagement",
                                "create a strategy", "build a strategy", "recruiting strategy",
                                "go-to-market"] },
  { intent: "plan",       any: ["hiring plan", "internship plan", "intern hiring", "recruiting plan",
                                "fy28", "fy27", "fy 28", "generate a plan", "intake plan"] },
  { intent: "compare",    any: ["compare", " vs ", " versus ", "difference between", "or indonesia"] },
  { intent: "hidden",     any: ["hidden", "overlooked", "other pool", "cross-pool", "untapped"] },
  { intent: "coverage",   any: ["underrepresented school", "schools are underrepresented",
                                "coverage", "target school", "campus coverage", "university coverage"] },
  { intent: "market",     any: ["can support", "hiring in", "pools can support"] },
  { intent: "priorities", any: ["prioriti", "this month", "action plan", "next best action",
                                "what should i do", "where do i start", "focus on this"] },
  { intent: "attention",  any: ["attention", "cold", "gone quiet", "at risk", "stale", "engagement"] },
  { intent: "cohorts",    any: ["cohort", "graduation year", "grad year", "class of"] },
  { intent: "engage",     any: ["next best", "engage", "outreach", "shortlist", "contact", "who should i"] },
  { intent: "datacenter", any: ["data center", "data centre", "datacenter", "critical facilities", "dc pipeline"] },
  { intent: "market",     any: ["singapore", "malaysia", "philippines", "thailand", "vietnam", "indonesia", "market", "country"] }
];

/* ------------------------------------------------------------------
 * NATURAL-LANGUAGE RECRUITING INTELLIGENCE SCENARIOS
 * ------------------------------------------------------------------
 * The three questions the free-text box can answer end to end. Each
 * scenario carries the suggested question shown under the input and a
 * set of weighted keyword groups used for intent detection.
 *
 * Detection is keyword scoring, not exact-text matching: a group scores
 * its weight once if ANY of its terms appear (matched on word
 * boundaries, so "mai" never fires inside "email" or "domain"). The
 * highest-scoring scenario wins, provided it clears COPILOT_MIN_SCORE
 * and matched at least one strong (weight >= 2) group.
 *
 * Everything the answers quote is derived from the mock data already in
 * this prototype — COUNTRIES, SCHOOLS, SALARY, MARKET_*, TALENT_POOLS
 * and TALENT_POOL_CANDIDATES. No external API, no model call.
 * ------------------------------------------------------------------ */
const COPILOT_MIN_SCORE = 3;

const COPILOT_SCENARIOS = [
  {
    id: "market-pick",
    icon: "🌏",
    kicker: "Where should we hire",
    question: "I want to hire 5 Applied Scientists in ASEAN. Which country should I target and why?",
    groups: [
      { w: 3, any: ["applied scientist", "applied scientists", "research scientist", "data scientist",
                    "machine learning engineer", "ml engineer", "ai engineer", "ai researcher",
                    "ai talent", "research engineer"] },
      { w: 2, any: ["which country", "what country", "which market", "what market", "where should i hire",
                    "where to hire", "where do i hire", "country should i target", "country to target",
                    "target country", "best country"] },
      { w: 2, any: ["asean", "south east asia", "southeast asia", "region", "regional"] },
      { w: 1, any: ["hire", "hiring", "recruit", "headcount", "why", "scientist", "scientists"] }
    ]
  },
  {
    id: "candidate-shortlist",
    icon: "🎯",
    kicker: "Who should we shortlist",
    question: "I need to hire a Customer Success Account Manager in Malaysia. Give me the top 3 candidates in Talent Pool. " +
      "Criteria: 0-2 year experience, top school, prior client-facing experience.",
    groups: [
      { w: 3, any: ["csam", "customer success", "account manager", "client-facing", "client facing",
                    "customer facing", "customer-facing", "renewals", "adoption"] },
      { w: 2, any: ["talent pool", "candidates", "candidate", "shortlist", "top 3", "top three",
                    "best people", "who should i interview", "profiles"] },
      { w: 2, any: ["malaysia", "malaysian", "kuala lumpur", "klang valley", "penang"] },
      { w: 1, any: ["0-2", "0 - 2", "two years", "experience", "top school", "fresh grad", "graduate",
                    "criteria", "rank", "ranking"] }
    ]
  },
  {
    id: "expansion",
    icon: "🧭",
    kicker: "Where do we expand next",
    question: "MAI plans to expand outside Vietnam. Which country should be the next target? " +
      "Analyze from talent supply and budget perspectives.",
    groups: [
      { w: 3, any: ["outside vietnam", "beyond vietnam", "expand outside", "expand beyond",
                    "next country", "next target", "next market", "second market", "diversify"] },
      { w: 2, any: ["mai", "expand", "expansion", "expanding", "scale out", "footprint", "open a new"] },
      { w: 2, any: ["talent supply", "budget", "cost", "salary", "spend", "supply and budget"] },
      { w: 1, any: ["country", "market", "analyze", "analyse", "vietnam", "perspective", "perspectives"] }
    ]
  }
];

/* Shown when a typed question matches none of the scenarios above. */
const COPILOT_UNSUPPORTED =
  "This prototype currently supports 3 recruiting intelligence scenarios. " +
  "Please select one of the suggested questions.";
