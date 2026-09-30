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

/* Suggested prompts for the Talent Intelligence Copilot. `intent` binds
 * the prompt to an answer generator in assets/engine.js — this is a
 * talent-intelligence assistant, not an open chatbot. */
const ENGINE_PROMPTS = [
  { intent: "engage",     icon: "✉",  text: "Who should I engage next?" },
  { intent: "coverage",   icon: "🎓", text: "Which ASEAN schools are underrepresented?" },
  { intent: "hidden",     icon: "🔎", text: "Show hidden SWE talent in Malaysia graduating in 2027." },
  { intent: "market",     icon: "🌏", text: "Which talent pools can support Software Engineer hiring in Vietnam?" },
  { intent: "priorities", icon: "🗓", text: "What recruiting actions should I prioritize this month?" },
  { intent: "cohorts",    icon: "📅", text: "Which graduation cohorts are underrepresented?" },
  { intent: "attention",  icon: "⚠",  text: "Which universities have gone quiet?" },
  { intent: "datacenter", icon: "▤",  text: "Where are my strongest data center pipelines?" }
];

/* Keyword routing for anything typed free-hand into the Copilot. Checked
 * in order; first rule that matches all of its `all` terms wins. */
const ENGINE_INTENT_RULES = [
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
