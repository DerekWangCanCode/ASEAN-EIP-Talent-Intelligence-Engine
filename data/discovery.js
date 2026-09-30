/* ==================================================================
 * TALENT DISCOVERY ASSISTANT — reference data
 * ------------------------------------------------------------------
 * Everything the assistant needs to turn a five-field brief into a
 * sourcing plan: job functions, market intelligence notes and
 * outreach message templates.
 *
 * All of it is mock reference data for a hackathon prototype. No
 * external API is called; the assistant reasons entirely over this
 * file plus SCHOOLS (data/data.js) and TALENT_POOLS /
 * TALENT_POOL_CANDIDATES (data/talentpool.js).
 *
 * Shipped as JavaScript rather than .json on purpose: browsers block
 * fetch() of a local .json under file://, which would break the
 * no-server promise.
 * ================================================================== */

/* ------------------------------------------------------------------
 * Job functions
 * Each one maps to exactly one managed talent pool, so a discovery
 * run can hand candidates straight over to Talent Pool Management.
 * ------------------------------------------------------------------ */
const DISCOVERY_FUNCTIONS = [
  { id: "swe", label: "Software Engineering", pool: "ENG-SWE", family: "Engineering",
    titles: ["Software Engineer", "Backend Engineer", "Full Stack Engineer",
             "Platform Engineer", "Software Engineer Intern", "Graduate Software Engineer"],
    majors: ["Computer Science", "Software Engineering", "Information Systems",
             "Data Science", "Artificial Intelligence", "Computer Engineering"],
    skills: ["Java", "Python", "Go", "TypeScript", "React", "Kubernetes", "AWS", "Azure",
             "Microservices", "SQL", "CI/CD", "Terraform", "C++", ".NET", "Node.js",
             "Distributed Systems", "GraphQL", "PyTorch"],
    signals: ["GitHub portfolio", "Hackathon placement", "Open-source contributions",
              "Competitive programming", "Internship at a product company"],
    note: "The most contested function in ASEAN. Engage at least 9 months before graduation — "
        + "by final semester the strong profiles already hold offers." },

  { id: "specialized", label: "Specialized Engineering", pool: "ENG-SPEC", family: "Engineering",
    titles: ["Firmware Engineer", "Security Engineer", "Silicon Design Engineer",
             "Network Engineer", "Systems Engineer", "Research Engineer"],
    majors: ["Computer Engineering", "Electrical Engineering", "Artificial Intelligence",
             "Cybersecurity", "Mathematics / Statistics", "Materials Science"],
    skills: ["FPGA / RTL", "Verilog", "Embedded C", "Cryptography", "Network Protocols",
             "Linux Kernel", "CUDA", "Signal Processing", "Penetration Testing",
             "Firmware", "Computer Vision", "Distributed Systems"],
    signals: ["Capture-the-flag ranking", "Published paper", "Lab / research assistantship",
              "Vendor certification", "Final-year project with industry sponsor"],
    note: "Small talent bodies. Depth beats volume — a single well-run lab partnership "
        + "usually outperforms a general campus fair." },

  { id: "datacenter", label: "Data Center Engineering", pool: "ENG-DC", family: "Engineering",
    titles: ["Data Center Engineer", "Critical Facilities Engineer", "Electrical Engineer",
             "Mechanical Engineer", "Commissioning Engineer"],
    majors: ["Electrical Engineering", "Mechanical Engineering", "Computer Engineering",
             "Energy Engineering", "Facilities & Building Services Engineering"],
    skills: ["Power Distribution", "HVAC & Cooling", "Critical Facilities", "AutoCAD", "Revit",
             "BMS / SCADA", "Electrical Design", "Commissioning", "Capacity Planning",
             "Energy Efficiency", "Project Scheduling", "Site Safety"],
    signals: ["Industrial attachment", "Professional engineer track", "Site-safety certification",
              "Utilities or construction internship"],
    note: "Graduates rarely self-identify as data centre talent. Recruit from power, building "
        + "services and facilities programmes and teach the domain." },

  { id: "engops", label: "Engineering Ops / Programme Management", pool: "ENG-OPS", family: "Engineering",
    titles: ["Technical Program Manager", "Engineering Operations Analyst",
             "Reliability Engineer", "Service Operations Engineer", "Release Manager"],
    majors: ["Industrial Engineering", "Systems Engineering", "Operations Management",
             "Computer Engineering", "Business Administration"],
    skills: ["Programme Management", "SRE Practices", "Incident Management", "Agile / Scrum",
             "Jira", "Change Management", "Process Improvement", "Capacity Planning",
             "Vendor Management", "Six Sigma", "Risk Management", "SQL"],
    signals: ["Student org leadership", "Process improvement project", "Scrum certification",
              "Cross-functional capstone"],
    note: "Hybrid profile. Look for engineering degrees with evidence of coordination work — "
        + "society president, capstone lead, competition team manager." },

  { id: "sales", label: "Sales", pool: "COM-SALES", family: "Commercial",
    titles: ["Business Development Representative", "Account Executive",
             "Inside Sales Representative", "Sales Development Representative"],
    majors: ["Business Administration", "Marketing", "Economics",
             "Finance / Accountancy", "Communications"],
    skills: ["Pipeline Management", "Salesforce", "Negotiation", "Prospecting",
             "Account Planning", "Forecasting", "Value Selling", "CRM Hygiene",
             "Territory Planning", "Presentation", "Analytics"],
    signals: ["Case-competition placement", "Sales internship", "Student enterprise",
              "Debate or pitch competition"],
    note: "Degree matters least of any function here. Case competitions and pitch events "
        + "are a far better filter than transcript or school tier." },

  { id: "techsell", label: "Technical Selling / Pre-Sales", pool: "COM-TSELL", family: "Commercial",
    titles: ["Solution Engineer", "Pre-Sales Consultant", "Solution Architect",
             "Technical Account Manager", "Cloud Solution Specialist"],
    majors: ["Computer Science", "Information Systems", "Computer Engineering",
             "Data Science", "Electrical Engineering"],
    skills: ["Solution Architecture", "Cloud Migration", "Azure", "AWS", "Demo Delivery",
             "Proof of Concept", "Kubernetes", "Data Platforms", "Security Architecture",
             "API Design", "Pre-sales Scoping", "SQL"],
    signals: ["Cloud certification", "Technical presentation experience", "Hackathon pitch",
              "Teaching or tutoring assistant"],
    note: "You need engineers who enjoy an audience. Screen for demo and presentation "
        + "evidence, not just the technical stack." },

  { id: "techsupport", label: "Technical Support", pool: "COM-TSUP", family: "Commercial",
    titles: ["Technical Support Engineer", "Support Escalation Engineer",
             "Customer Support Engineer", "Service Desk Analyst"],
    majors: ["Information Systems", "Computer Science", "Information Technology",
             "Computer Engineering", "Applied Computing"],
    skills: ["Troubleshooting", "Zendesk", "ServiceNow", "Networking", "Windows Server",
             "Linux", "SQL", "SLA Management", "Root Cause Analysis", "Scripting",
             "Customer Communication", "Escalation Management"],
    signals: ["Helpdesk or lab assistant role", "Vendor certification",
              "Customer-facing part-time work", "Strong written English"],
    note: "Highest-volume graduate function. The Philippines and Malaysia carry it on "
        + "English fluency and shift tolerance." },

  { id: "custsuccess", label: "Customer Success", pool: "COM-CS", family: "Commercial",
    titles: ["Customer Success Associate", "Customer Success Manager",
             "Renewals Specialist", "Adoption Consultant"],
    majors: ["Business Administration", "Information Systems", "Marketing",
             "Economics", "Communications"],
    skills: ["Adoption Planning", "Renewals", "Customer Health Scoring", "Gainsight",
             "Stakeholder Management", "Onboarding Design", "Power BI", "SQL",
             "Churn Analysis", "QBR Facilitation", "Analytics"],
    signals: ["Client-facing internship", "Community or society leadership",
              "Analytics coursework", "Multilingual"],
    note: "Under-marketed to students because the job title means nothing on campus. "
        + "Lead with the day-in-the-life content, not the title." },

  { id: "consulting", label: "Consulting Services", pool: "COM-CONS", family: "Commercial",
    titles: ["Associate Consultant", "Delivery Consultant", "Engagement Manager",
             "Business Analyst", "Implementation Consultant"],
    majors: ["Business Administration", "Information Systems", "Computer Science",
             "Economics", "Industrial Engineering"],
    skills: ["Delivery Management", "Requirements Workshops", "Solution Design",
             "Change Management", "Data Migration", "Power BI", "Stakeholder Management",
             "Agile / Scrum", "Business Case Modelling", "SQL", "Process Mapping"],
    signals: ["Case-competition placement", "Consulting club", "Analytics capstone",
              "Client project experience"],
    note: "Competes directly with the strategy firms, which run a much earlier calendar. "
        + "Start the nurture cycle a full year ahead." }
];

/* Degree-name variants for majors that Section B's MAJOR_SYNONYMS does
 * not already cover. Merged at runtime, never overriding the original. */
const DISCOVERY_MAJOR_SYNONYMS = {
  "Mechanical Engineering": ["Mechanical Engineering", "Mechanical and Manufacturing Engineering",
                             "Mechatronics Engineering"],
  "Energy Engineering": ["Energy Engineering", "Power Engineering", "Renewable Energy Engineering",
                         "Electrical Power Engineering"],
  "Facilities & Building Services Engineering": ["Building Services Engineering",
                                                 "Facilities Management", "Building Engineering",
                                                 "Civil and Environmental Engineering"],
  "Cybersecurity": ["Cybersecurity", "Information Security", "Computer Security",
                    "Network Security"],
  "Systems Engineering": ["Systems Engineering", "Engineering Systems",
                          "Industrial and Systems Engineering"],
  "Operations Management": ["Operations Management", "Supply Chain Management",
                            "Logistics Management", "Operations and Supply Chain"],
  "Information Technology": ["Information Technology", "Information Systems",
                             "Computing and Information Technology"],
  "Applied Computing": ["Applied Computing", "Computing Science", "Software Systems"],
  "Materials Science": ["Materials Science", "Materials Engineering",
                        "Materials Science and Engineering"],
  "Communications": ["Communications", "Mass Communication", "Corporate Communication",
                     "Communication Studies"]
};

/* ------------------------------------------------------------------
 * Market intelligence — what changes per country
 * gradMonths drives the engagement timeline; the notes are the things
 * a recruiter new to the market keeps getting wrong.
 * ------------------------------------------------------------------ */
const MARKET_INTEL = {
  SG: { gradMonths: [4, 5, 6], langs: "English",
        note: "Everything is in English and the calendar is tight. You are competing with every global "
            + "bank and big-tech office in the region, so move first, not loudest.",
        channel: "Faculty tech talks and internship conversion outperform fairs." },
  MY: { gradMonths: [5, 8, 9], langs: "English / Malay",
        note: "Largest single talent body per dollar in the region. Klang Valley is software-first, "
            + "Penang is hardware and facilities — pitch them differently.",
        channel: "Campus fairs still work here, and hackathons convert unusually well." },
  ID: { gradMonths: [6, 7, 8], langs: "Bahasa Indonesia / English",
        note: "Biggest reach, weakest Know-to-Like step. Volume is never the problem — follow-up is. "
            + "Bilingual content materially lifts response.",
        channel: "Community-led: online communities and monthly AMAs beat formal events." },
  PH: { gradMonths: [4, 5], langs: "English",
        note: "English fluency and a clean May-June graduation make this the easiest intake to plan "
            + "around. Government-mandated OJT gives you a natural internship hook.",
        channel: "Internship programmes and shared-services open days." },
  TH: { gradMonths: [2, 3, 4], langs: "Thai / English",
        note: "March graduation means the entire nurture cycle must run a quarter earlier than the rest "
            + "of ASEAN. English-only material stalls at Know.",
        channel: "Bilingual tech talks; the Eastern Seaboard is a separate hardware market." },
  VN: { gradMonths: [5, 7, 8], langs: "Vietnamese / English",
        note: "Best volume-to-Trust ratio outside Singapore. The student ambassador network is the "
            + "difference — it carries reach at a fraction of event cost.",
        channel: "Ambassador network plus hackathons; certification-led content for infrastructure." }
};

/* ------------------------------------------------------------------
 * Outreach message templates
 * Tokens are filled at render time: {name} {school} {major} {function}
 * {country} {gradYear} {pool} {recruiter} {activity} {skill} {title}
 * ------------------------------------------------------------------ */
const OUTREACH_TEMPLATES = [
  { id: "inmail", label: "LinkedIn InMail — first touch", channel: "LinkedIn InMail",
    when: "Cold. No prior contact — this is the Don't Know to Know step.",
    subject: "{title} openings for {school} {gradYear} graduates",
    body:
"Hi {name},\n\n" +
"I'm {recruiter}, and I look after early-career {function} hiring across {country}. I came across your " +
"profile while we were mapping {major} students graduating in {gradYear}, and your {skill} work stood out.\n\n" +
"We're opening {title} roles for the {gradYear} intake. Before any of that turns into a formal process, " +
"we're running {activity} — it's the easiest way to see what the work actually looks like and to ask our " +
"engineers the questions that don't get answered on a careers page.\n\n" +
"Would you like me to send the details? No application required, and it won't cost you more than an hour.\n\n" +
"Best,\n{recruiter}\nEarly Careers — {function}, {country}" },

  { id: "followup", label: "Event follow-up — Know to Like", channel: "Email",
    when: "Send within 48 hours of an event. This is where most pipelines leak.",
    subject: "Good to meet you at {activity}",
    body:
"Hi {name},\n\n" +
"Thanks for coming to {activity} — I enjoyed the conversation, and I've added you to our {pool} " +
"talent community so you'll hear about {function} roles before they're advertised.\n\n" +
"Two things that might be useful given your {major} background:\n" +
"  1. A short walkthrough of what our {title} graduates work on in their first year.\n" +
"  2. An invitation to our next session for {school} students, where you can meet the team directly.\n\n" +
"You're graduating in {gradYear}, so there's no rush — but the earlier we talk, the more we can shape " +
"the role around what you actually want to build.\n\n" +
"Happy to answer anything in the meantime.\n\n" +
"{recruiter}\nEarly Careers — {function}, {country}" },

  { id: "convert", label: "Application nudge — Like to Trust", channel: "Email or WhatsApp",
    when: "Send when the candidate has engaged more than once but has not applied.",
    subject: "{title} applications for {gradYear} — worth a look?",
    body:
"Hi {name},\n\n" +
"We've now opened {title} applications for the {gradYear} intake, and you're one of the {school} " +
"students I had in mind when the role was scoped.\n\n" +
"Why I think it fits: the team works on {skill} day to day, and we hire {major} graduates into it every " +
"year — so you'd be joining a cohort, not arriving alone.\n\n" +
"If it helps, I can set up a 20-minute call with the hiring manager before you decide whether to apply. " +
"Plenty of people find that more useful than the job description.\n\n" +
"Let me know either way — a no is genuinely fine, and I'll keep you in the {pool} community for next year.\n\n" +
"{recruiter}\nEarly Careers — {function}, {country}" },

  { id: "referral", label: "Referral request — Trust", channel: "Email",
    when: "Send to candidates already at Trust. The cheapest source in the plan.",
    subject: "Know anyone else at {school} we should meet?",
    body:
"Hi {name},\n\n" +
"Thanks again for the time you've given us this season — it's been genuinely useful.\n\n" +
"One ask: we're still building the {gradYear} {function} cohort, and the strongest introductions we get " +
"are from students already in the process. If there's anyone at {school} studying {major} — or anyone " +
"strong on {skill} from another faculty — I'd welcome an introduction.\n\n" +
"No obligation at all, and it doesn't affect your own process either way.\n\n" +
"{recruiter}\nEarly Careers — {function}, {country}" }
];

/* Assistant run-log steps, shown while the plan is assembled. */
const DISCOVERY_STEPS = [
  "Parsing the brief",
  "Matching universities against the target market and discipline",
  "Cross-referencing existing talent-pool coverage",
  "Composing the LinkedIn Recruiter boolean string",
  "Extracting search keywords and title variants",
  "Drafting outreach messages"
];
