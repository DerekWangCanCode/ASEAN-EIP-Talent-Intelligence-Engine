/* ==================================================================
 * TALENT POOL MANAGEMENT — mock data
 * ------------------------------------------------------------------
 * Hackathon prototype data, modelled on a TA Hub talent-pool workspace.
 * Nine global pools, each holding an auto-generated candidate roster.
 * Nothing here comes from a live ATS — every candidate, recruiter,
 * diversity tag and date below is invented.
 *
 * Shipped as JavaScript rather than .json on purpose: browsers block
 * fetch() of a local .json under file://, which would break the
 * no-server promise. The shape is plain JSON and lifts straight into
 * an API response.
 *
 * Candidates are generated deterministically from a seeded generator,
 * so the same pool always produces the same roster between reloads
 * while nothing has to be hand-written.
 *
 * Dates are stored as day offsets from today, so the demo never goes
 * stale; the UI turns them into real dates on render.
 * ================================================================== */

/* The talent-pool lifecycle. A candidate sits in exactly one stage. */
const POOL_STAGES = [
  { id: "sourced", label: "Sourced",
    desc: "Identified and added to the pool. No two-way contact yet.",
    action: "Run the first outreach sequence — intro mail, campus event invite.",
    colour: "#3b4a63" },
  { id: "connection", label: "Talent Connection",
    desc: "Responded to outreach or met a recruiter at an event.",
    action: "Book a talent-connection call and capture interests and timing.",
    colour: "#5b6bb5" },
  { id: "engaged", label: "Engaged",
    desc: "In an active conversation — attends sessions, opens and replies.",
    action: "Keep warm with role-specific content and invite to apply.",
    colour: "#4c7ef3" },
  { id: "screen", label: "Screen",
    desc: "In recruiter screen or assessment.",
    action: "Clear the screen backlog and release assessment results.",
    colour: "#12a594" },
  { id: "interview", label: "Interview",
    desc: "In the hiring-manager or panel loop.",
    action: "Protect interview slots and close feedback within 48 hours.",
    colour: "#31b57a" },
  { id: "offer", label: "Offer",
    desc: "Offer extended, decision pending.",
    action: "Run the offer-close plan — team intro, buddy call, start-date flex.",
    colour: "#e0a33c" },
  { id: "hired", label: "Hired",
    desc: "Offer accepted. Moves to onboarding.",
    action: "Hand over to onboarding and log the source for attribution.",
    colour: "#7fd6a0" }
];

/* Mock diversity programme tags. Self-declared in the real system. */
const DIVERSITY_TAGS = [
  "Women in Tech", "First-generation graduate", "Scholarship recipient",
  "Regional campus", "Returning caregiver", "Disability confident",
  "Veteran", "LGBTQ+ network", "Career switcher"
];

/* The nine managed talent pools.
 * stageMix is the relative weight of each stage, in POOL_STAGES order.
 * countryMix weights where the candidates come from.                */
const TALENT_POOLS = [

  /* ---------------- Engineering ---------------- */
  { id: "ENG-DC", name: "Engineering - Data Centers - Global", family: "Engineering",
    focus: "Data centre build, power, cooling and critical facilities engineering.",
    owner: "Daniel Lim", size: 128,
    recruiters: ["Daniel Lim", "Aisyah Rahman", "Nattapong Sirikul", "Marcus Tan"],
    stageMix: [42, 18, 14, 9, 8, 5, 4],
    countryMix: { SG: 18, MY: 26, ID: 18, PH: 12, TH: 14, VN: 12 },
    degrees: ["Electrical Engineering", "Mechanical Engineering", "Computer Engineering",
              "Energy Engineering", "Facilities & Building Services Engineering"],
    skills: ["Power Distribution", "HVAC & Cooling", "Critical Facilities", "AutoCAD", "Revit",
             "BMS / SCADA", "Electrical Design", "Commissioning", "Capacity Planning",
             "Energy Efficiency", "Project Scheduling", "Site Safety"] },

  { id: "ENG-OPS", name: "Engineering - Ops/PM - Global", family: "Engineering",
    focus: "Engineering programme management, reliability and service operations.",
    owner: "Marcus Tan", size: 104,
    recruiters: ["Marcus Tan", "Camille Reyes", "Sari Wijaya", "Tuan Pham"],
    stageMix: [36, 20, 16, 11, 8, 5, 4],
    countryMix: { SG: 20, MY: 18, ID: 20, PH: 18, TH: 12, VN: 12 },
    degrees: ["Industrial Engineering", "Systems Engineering", "Operations Management",
              "Computer Engineering", "Business Administration"],
    skills: ["Programme Management", "SRE Practices", "Incident Management", "Agile / Scrum",
             "Jira", "Change Management", "Process Improvement", "Capacity Planning",
             "Vendor Management", "Six Sigma", "Risk Management", "SQL"] },

  { id: "ENG-SPEC", name: "Engineering - Specialized - Global", family: "Engineering",
    focus: "Silicon, security, networking and other deep specialist engineering tracks.",
    owner: "Tuan Pham", size: 96,
    recruiters: ["Tuan Pham", "Linh Nguyen", "Priya Raman", "Praew Chaiyaporn"],
    stageMix: [34, 18, 16, 12, 10, 6, 4],
    countryMix: { SG: 24, MY: 18, ID: 14, PH: 10, TH: 12, VN: 22 },
    degrees: ["Computer Engineering", "Electrical Engineering", "Artificial Intelligence",
              "Cybersecurity", "Mathematics / Statistics", "Materials Science"],
    skills: ["FPGA / RTL", "Verilog", "Embedded C", "Cryptography", "Network Protocols",
             "Linux Kernel", "CUDA", "Signal Processing", "Penetration Testing",
             "Firmware", "Computer Vision", "Distributed Systems"] },

  { id: "ENG-SWE", name: "Engineering - SWE - Global", family: "Engineering",
    focus: "Software engineering across cloud, platform, data and product teams.",
    owner: "Linh Nguyen", size: 168,
    recruiters: ["Linh Nguyen", "Priya Raman", "Rizky Pratama", "Aisyah Rahman", "Jomar Salcedo"],
    stageMix: [38, 19, 17, 10, 8, 5, 3],
    countryMix: { SG: 18, MY: 18, ID: 20, PH: 14, TH: 10, VN: 20 },
    degrees: ["Computer Science", "Software Engineering", "Information Systems",
              "Data Science", "Artificial Intelligence", "Computer Engineering"],
    skills: ["Java", "Python", "Go", "TypeScript", "React", "Kubernetes", "AWS", "Azure",
             "Microservices", "SQL", "CI/CD", "Terraform", "C++", ".NET", "Node.js",
             "Distributed Systems", "GraphQL", "PyTorch"] },

  /* ---------------- Commercial ---------------- */
  { id: "COM-SALES", name: "Commercial - Sales - Global", family: "Commercial",
    focus: "Core quota-carrying sales, inside sales and business development.",
    owner: "Elaine Koh", size: 112,
    recruiters: ["Elaine Koh", "Camille Reyes", "Sari Wijaya", "Nattapong Sirikul"],
    stageMix: [40, 21, 15, 9, 7, 5, 3],
    countryMix: { SG: 20, MY: 16, ID: 20, PH: 20, TH: 12, VN: 12 },
    degrees: ["Business Administration", "Marketing", "Economics",
              "Finance / Accountancy", "Communications"],
    skills: ["Pipeline Management", "Salesforce", "Negotiation", "Prospecting",
             "Account Planning", "Forecasting", "Value Selling", "CRM Hygiene",
             "Territory Planning", "Presentation", "Analytics"] },

  { id: "COM-TSELL", name: "Commercial - Technical Selling - Global", family: "Commercial",
    focus: "Solution architects, pre-sales engineers and technical specialists.",
    owner: "Priya Raman", size: 88,
    recruiters: ["Priya Raman", "Marcus Tan", "Rizky Pratama", "Linh Nguyen"],
    stageMix: [33, 19, 17, 12, 9, 6, 4],
    countryMix: { SG: 24, MY: 18, ID: 16, PH: 14, TH: 12, VN: 16 },
    degrees: ["Computer Science", "Information Systems", "Computer Engineering",
              "Data Science", "Electrical Engineering"],
    skills: ["Solution Architecture", "Cloud Migration", "Azure", "AWS", "Demo Delivery",
             "Proof of Concept", "Kubernetes", "Data Platforms", "Security Architecture",
             "API Design", "Pre-sales Scoping", "SQL"] },

  { id: "COM-TSUP", name: "Commercial - Tech Support - Global", family: "Commercial",
    focus: "Technical support engineering and escalation management.",
    owner: "Jomar Salcedo", size: 120,
    recruiters: ["Jomar Salcedo", "Camille Reyes", "Aisyah Rahman", "Praew Chaiyaporn"],
    stageMix: [37, 20, 16, 11, 8, 5, 3],
    countryMix: { SG: 10, MY: 18, ID: 18, PH: 30, TH: 12, VN: 12 },
    degrees: ["Information Systems", "Computer Science", "Information Technology",
              "Computer Engineering", "Applied Computing"],
    skills: ["Troubleshooting", "Zendesk", "ServiceNow", "Networking", "Windows Server",
             "Linux", "SQL", "SLA Management", "Root Cause Analysis", "Scripting",
             "Customer Communication", "Escalation Management"] },

  { id: "COM-CS", name: "Commercial - Customer Success - Global", family: "Commercial",
    focus: "Adoption, renewal and customer-success management.",
    owner: "Camille Reyes", size: 92,
    recruiters: ["Camille Reyes", "Elaine Koh", "Sari Wijaya", "Nattapong Sirikul"],
    stageMix: [36, 22, 16, 10, 7, 5, 4],
    countryMix: { SG: 18, MY: 16, ID: 18, PH: 22, TH: 14, VN: 12 },
    degrees: ["Business Administration", "Information Systems", "Marketing",
              "Economics", "Communications"],
    skills: ["Adoption Planning", "Renewals", "Customer Health Scoring", "Gainsight",
             "Stakeholder Management", "Onboarding Design", "Power BI", "SQL",
             "Churn Analysis", "QBR Facilitation", "Analytics"] },

  { id: "COM-CONS", name: "Commercial - Consulting Services - Global", family: "Commercial",
    focus: "Delivery consulting, engagement management and professional services.",
    owner: "Sari Wijaya", size: 84,
    recruiters: ["Sari Wijaya", "Elaine Koh", "Rizky Pratama", "Priya Raman"],
    stageMix: [34, 20, 17, 11, 8, 6, 4],
    countryMix: { SG: 22, MY: 16, ID: 22, PH: 14, TH: 12, VN: 14 },
    degrees: ["Business Administration", "Information Systems", "Computer Science",
              "Economics", "Industrial Engineering"],
    skills: ["Delivery Management", "Requirements Workshops", "Solution Design",
             "Change Management", "Data Migration", "Power BI", "Stakeholder Management",
             "Agile / Scrum", "Business Case Modelling", "SQL", "Process Mapping"] }
];

/* ==================================================================
 * Candidate generation
 * ------------------------------------------------------------------
 * Deterministic: a seeded linear congruential generator keyed off the
 * pool id, so the roster is identical on every reload without any of
 * it being written by hand.
 * ================================================================== */
const TALENT_POOL_CANDIDATES = (function () {

  function hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length) % arr.length];
  const int = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

  function pickSome(rnd, arr, lo, hi) {
    const want = Math.min(int(rnd, lo, hi), arr.length);
    const copy = arr.slice(), out = [];
    while (out.length < want && copy.length) {
      out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
    }
    return out;
  }

  /* Weighted pick over an { key: weight } map. */
  function weighted(rnd, map) {
    const keys = Object.keys(map);
    let total = 0;
    keys.forEach(k => { total += map[k]; });
    let r = rnd() * total;
    for (let i = 0; i < keys.length; i++) {
      r -= map[keys[i]];
      if (r <= 0) return keys[i];
    }
    return keys[keys.length - 1];
  }
  function weightedIndex(rnd, weights) {
    let total = 0;
    weights.forEach(w => { total += w; });
    let r = rnd() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  }

  /* Given and family names are drawn from the same naming tradition so
   * the two halves pair plausibly; some markets write family name first. */
  function buildName(cc, rnd) {
    const groups = NAME_POOLS[cc] || NAME_POOLS.SG;
    const g = pick(rnd, groups);
    const given = pick(rnd, g.given), family = pick(rnd, g.family);
    return g.order === "family-first" ? family + " " + given : given + " " + family;
  }

  const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* Graduation months follow the market's academic calendar. */
  const GRAD_MONTHS = { SG: [4, 5, 6], MY: [5, 8, 9], ID: [6, 7, 8],
                        PH: [4, 5], TH: [2, 3, 4], VN: [5, 7, 8] };

  const THIS_YEAR = new Date().getFullYear();
  const GRAD_YEARS = [THIS_YEAR, THIS_YEAR + 1, THIS_YEAR + 2];
  const GRAD_YEAR_WEIGHT = [28, 46, 26];

  const DEGREE_LEVELS = ["Bachelor", "Bachelor", "Bachelor", "Bachelor", "Master", "PhD"];

  const out = [];

  TALENT_POOLS.forEach(pool => {
    const rnd = rng(hash(pool.id));

    for (let i = 0; i < pool.size; i++) {
      const cc = weighted(rnd, pool.countryMix);
      const schools = SCHOOLS.filter(s => s.country === cc);
      const school = schools.length ? pick(rnd, schools) : pick(rnd, SCHOOLS);

      const level = pick(rnd, DEGREE_LEVELS);
      const field = pick(rnd, pool.degrees);
      const gradYear = GRAD_YEARS[weightedIndex(rnd, GRAD_YEAR_WEIGHT)];
      const gradMonth = pick(rnd, GRAD_MONTHS[cc] || GRAD_MONTHS.SG);

      const stageIdx = weightedIndex(rnd, pool.stageMix);
      const stage = POOL_STAGES[stageIdx].id;

      /* Later-stage candidates have normally been in the pool longer. */
      const added = -int(rnd, 1 + stageIdx * 14, 30 + stageIdx * 40);
      const updated = Math.min(-0, added + int(rnd, 0, Math.min(-added, 45)));

      const skills = pickSome(rnd, pool.skills, 3, 6);
      const diversity = rnd() < 0.52 ? pickSome(rnd, DIVERSITY_TAGS, 1, 2) : [];

      /* Relevance blends school tier, skill depth, funnel progress and
       * how recently the record was touched — the same signals a
       * recruiter eyeballs when ranking a pool. */
      const tierPts = school.tier === 1 ? 26 : school.tier === 2 ? 18 : 11;
      const skillPts = skills.length * 4;
      const stagePts = stageIdx * 5;
      const freshPts = updated >= -14 ? 14 : updated >= -45 ? 8 : updated >= -90 ? 3 : 0;
      const levelPts = level === "PhD" ? 8 : level === "Master" ? 5 : 2;
      const jitter = int(rnd, -6, 8);
      const relevance = Math.max(31, Math.min(99,
        22 + tierPts + skillPts + stagePts + freshPts + levelPts + jitter));

      out.push({
        id: pool.id + "-" + String(i + 1).padStart(4, "0"),
        pool: pool.id,
        name: buildName(cc, rnd),
        country: cc,
        school: school.name,
        schoolAbbr: school.abbr,
        tier: school.tier,
        degree: level + " of " + field,
        degreeLevel: level,
        degreeField: field,
        gradYear: gradYear,
        gradMonth: gradMonth,
        gradLabel: MONTH_ABBR[gradMonth] + " " + gradYear,
        skills: skills,
        diversity: diversity,
        recruiter: pick(rnd, pool.recruiters),
        stage: stage,
        stageIndex: stageIdx,
        added: added,
        updated: updated,
        relevance: relevance,
        source: pick(rnd, ["Campus fair", "Tech talk", "Hackathon", "Internship programme",
                           "Referral", "Ambassador network", "Online community",
                           "Silver medalist", "Inbound application"])
      });
    }
  });

  return out;
})();
