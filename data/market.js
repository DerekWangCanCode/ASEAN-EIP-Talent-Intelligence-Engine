/* ==================================================================
 * SECTION A — MARKET INTELLIGENCE (mock data)
 * ------------------------------------------------------------------
 * Answers the first question in the recruiter journey: "Where should
 * we hire?"  Everything below is invented planning data for a
 * prototype — no live salary feed, no live enrolment statistics.
 *
 * Deliberately qualitative. Recruiters plan with relative signals
 * (cheap vs expensive, contested vs open), not with false-precision
 * currency figures, so the market model is expressed as Low / Medium
 * / High bands instead of numbers.
 *
 * Shipped as JavaScript rather than .json on purpose: browsers block
 * fetch() of a local .json under file://.
 * ================================================================== */

/* Display order used across every Section A surface. */
const MARKET_ORDER = ["SG", "MY", "VN", "PH", "TH", "ID"];

/* The three-band scale. `rank` drives sorting and the AI insights;
 * `good` says whether a high band is a good thing for the recruiter
 * (high supply = good, high cost = bad). */
const MARKET_LEVELS = {
  Low:    { rank: 1, colour: "#31b57a", dim: "rgba(49,181,122,.16)" },
  Medium: { rank: 2, colour: "#e0a33c", dim: "rgba(224,163,60,.16)" },
  High:   { rank: 3, colour: "#f06f5e", dim: "rgba(240,111,94,.16)" }
};

const MARKET_METRICS = [
  { id: "cost",        label: "Talent Cost",        higherIsBetter: false,
    hint: "Relative cost of an early-career hire against the ASEAN median." },
  { id: "supply",      label: "Talent Supply",      higherIsBetter: true,
    hint: "Volume of qualified graduates reachable in a normal hiring year." },
  { id: "competition", label: "Competition",        higherIsBetter: false,
    hint: "How hard other employers are working the same campuses." }
];

/* ------------------------------------------------------------------
 * Qualitative market model
 * ------------------------------------------------------------------ */
const MARKET_SIGNALS = {
  SG: { cost: "High",   supply: "Medium", competition: "High"   },
  MY: { cost: "Medium", supply: "High",   competition: "Medium" },
  VN: { cost: "Low",    supply: "High",   competition: "Medium" },
  PH: { cost: "Low",    supply: "Medium", competition: "Low"    },
  TH: { cost: "Medium", supply: "Medium", competition: "Medium" },
  ID: { cost: "Medium", supply: "High",   competition: "Medium" }
};

/* ------------------------------------------------------------------
 * Academic calendar, simplified to months for cross-country compare.
 * `intern` windows are [startMonth, endMonth] inclusive, 1 = January.
 * `grad` is the month range students actually become work-ready.
 * ------------------------------------------------------------------ */
const MARKET_CALENDAR = {
  SG: { intern: [{ from: 5, to: 8, label: "Summer internship" }],
        grad: { from: 5, to: 7, label: "May – Jul" },
        note: "Two 13-week semesters (Aug→Dec, Jan→May) with a long May–Jul vacation.",
        internText: "Mid-May → early Aug (12–14 weeks). NTU, SUTD and SIT also support 20–24 week attachments from January.",
        gradText: "Coursework ends late May; ceremonies in July. Work-ready from June." },

  MY: { intern: [{ from: 7, to: 9, label: "Industrial training" }],
        grad: { from: 8, to: 10, label: "Aug – Oct" },
        note: "Public universities run Oct→Feb and Mar→Jul; private and AU-linked campuses run Feb and Jul intakes.",
        internText: "Jul → Sep industrial training (12–16 weeks). UTP runs an 8-month structured placement.",
        gradText: "Coursework completes in July; convocation Sep–Nov." },

  VN: { intern: [{ from: 2, to: 5, label: "Graduation internship" },
                 { from: 6, to: 8, label: "Summer internship" }],
        grad: { from: 5, to: 8, label: "May – Aug" },
        note: "Semester 1 Sep→Jan, Semester 2 Feb→Jun. Lunar New Year freezes roughly three weeks.",
        internText: "Jun → Aug summer window (12 weeks); the final-year graduation internship runs 8–16 weeks Feb→Jun.",
        gradText: "Main cohort Jun–Jul, second cohort Oct–Nov." },

  PH: { intern: [{ from: 2, to: 5, label: "Credited OJT" },
                 { from: 6, to: 8, label: "Summer internship" }],
        grad: { from: 4, to: 6, label: "Apr – Jun" },
        note: "Top schools use a shifted Aug→May calendar; DLSU runs trimesters and Mapúa runs quarters.",
        internText: "Government-mandated On-the-Job Training Feb → May inside the semester, plus a Jun → Aug window.",
        gradText: "Commencement June/July; OJT completes Apr–May." },

  TH: { intern: [{ from: 1, to: 4, label: "Co-op block" },
                 { from: 6, to: 8, label: "Summer internship" }],
        grad: { from: 3, to: 5, label: "Mar – May" },
        note: "Aug→Dec / Jan→May calendar. The Thai New Year holiday freezes mid-April.",
        internText: "Jun → Aug (12 weeks); engineering faculties such as KMUTT run a 16-week co-op block inside semester 2.",
        gradText: "Coursework ends March–May; official ceremonies Oct–Dec." },

  ID: { intern: [{ from: 6, to: 8, label: "Summer internship" }],
        grad: { from: 6, to: 8, label: "Jun – Aug" },
        note: "Odd semester Aug→Jan, even semester Feb→Jul. Eid al-Fitr shifts ~11 days earlier each year.",
        internText: "Jun → Aug (12 weeks). The national credited-internship policy allows a fully credited 16–20 week placement inside either semester.",
        gradText: "Two graduating cohorts a year — Feb/Mar and Aug/Sep." }
};

/* ------------------------------------------------------------------
 * Addressable pipeline estimates (mock). `reachable` is the number of
 * relevant final-year students the target-school list puts in range;
 * `growth` is the year-on-year movement in that number.
 * ------------------------------------------------------------------ */
const MARKET_PIPELINE = {
  SG: { reachable: 4200,  growth: 4,  strength: "Deep CS and data-science bench, small absolute volume." },
  MY: { reachable: 11800, growth: 9,  strength: "Broadest target-school footprint in the region." },
  VN: { reachable: 10400, growth: 17, strength: "Fastest-growing technical cohort in ASEAN." },
  PH: { reachable: 7600,  growth: 6,  strength: "Very large English-fluent service and support cohort." },
  TH: { reachable: 6100,  growth: 3,  strength: "Strong hardware and manufacturing engineering base." },
  ID: { reachable: 13500, growth: 12, strength: "Largest raw volume; conversion is the constraint, not reach." }
};

/* ------------------------------------------------------------------
 * Country research pages
 * ------------------------------------------------------------------ */
const MARKET_PROFILE = {
  SG: {
    headline: "Premium market. Move first, not loudest.",
    summary:
      "Singapore has the deepest computer-science and data-science bench in ASEAN, but the smallest absolute volume " +
      "and the highest cost per hire. Every global bank, consultancy and big-tech office recruits the same five " +
      "campuses on the same calendar, so speed of engagement — not spend — decides who converts.",
    positioning: "Use Singapore for scarce, senior-track and regionally mobile profiles. Do not use it for volume.",
    recommendations: [
      { head: "Engage 9–12 months before graduation",
        body: "By the final semester the strong NUS and NTU profiles already hold offers. Start the nurture cycle in the August semester, not in March." },
      { head: "Convert interns instead of competing at fairs",
        body: "Internship-to-offer conversion is materially cheaper here than open-market competition. Protect May–Aug headcount for conversion-ready interns." },
      { head: "Lead with technical depth, not employer brand",
        body: "Faculty tech talks and engineer-led sessions outperform careers-fair booths, because every competitor has a booth." }
    ]
  },

  MY: {
    headline: "Best coverage-to-cost ratio in ASEAN.",
    summary:
      "Malaysia gives you the largest target-school footprint in the region at mid-band cost and only moderate " +
      "competition. It splits into two distinct markets: the Klang Valley is software-first, while Penang and " +
      "Seri Iskandar carry hardware, semiconductor and facilities engineering.",
    positioning: "The default volume market for software, support and engineering-operations hiring.",
    recommendations: [
      { head: "Pitch Klang Valley and Penang differently",
        body: "A single national software message under-performs in Penang and at UTP, where the strong cohorts are EE, energy and facilities." },
      { head: "Anchor the calendar on Jul–Sep industrial training",
        body: "The long industrial-training block is the highest-yield entry point. Offers should be scoped by May to land placements." },
      { head: "Hackathons convert unusually well here",
        body: "Unlike most ASEAN markets, campus fairs still work — but hackathons and build-days outperform them on quality per dollar." }
    ]
  },

  VN: {
    headline: "Strongest technical talent per dollar.",
    summary:
      "Vietnam combines low cost with high and fast-growing supply of genuinely strong technical graduates. " +
      "HUST, VNU-UET and HCMUT produce competitive-programming-grade engineers, and the student ambassador " +
      "network carries reach at a fraction of event cost.",
    positioning: "The first market to scale software-engineering volume into. Second-best trust ratio after Singapore.",
    recommendations: [
      { head: "Run the ambassador network, not an event calendar",
        body: "Peer referral is the difference in Vietnam. A funded ambassador programme outperforms the equivalent spend on fairs." },
      { head: "Work the Feb–May graduation internship",
        body: "The final-year graduation internship is a 4-month evaluated trial that most competitors ignore. It is the cheapest conversion path in ASEAN." },
      { head: "Provide bilingual material for infrastructure roles",
        body: "Software cohorts are comfortable in English; infrastructure and facilities cohorts are not. Certification-led Vietnamese content lifts response." }
    ]
  },

  PH: {
    headline: "Lowest competition, highest English fluency.",
    summary:
      "The Philippines is the least contested market in the region, with a clean Apr–Jun graduation and " +
      "government-mandated On-the-Job Training that gives you a built-in internship hook. English fluency and " +
      "shift tolerance make it the natural home for support, customer success and service operations.",
    positioning: "Volume market for technical support, customer success and service operations.",
    recommendations: [
      { head: "Own the credited OJT block",
        body: "Registering as an OJT host site places you inside the curriculum from February to May. Almost nothing else in ASEAN gives that access." },
      { head: "Plan around a single Apr–Jun graduation",
        body: "One clean cohort makes forecasting easy. Lock the intake plan by November for the following April." },
      { head: "Widen beyond Metro Manila",
        body: "Mapúa and regional campuses are under-recruited and carry noticeably lower offer-decline rates." }
    ]
  },

  TH: {
    headline: "A quarter ahead of the rest of ASEAN.",
    summary:
      "Thailand graduates in March, so the entire nurture cycle has to run one quarter earlier than every other " +
      "market. The Eastern Seaboard is effectively a separate hardware and manufacturing market, and English-only " +
      "material reliably stalls at the awareness step.",
    positioning: "Hardware, manufacturing engineering and bilingual commercial roles.",
    recommendations: [
      { head: "Start the cycle in Q3, not Q4",
        body: "March graduation means offers must be out by January. Teams that run the standard ASEAN calendar arrive after the cohort has committed." },
      { head: "Localise the material",
        body: "Bilingual tech talks convert; English-only decks do not. This is the single biggest lever in the market." },
      { head: "Treat the Eastern Seaboard separately",
        body: "KMUTT and the eastern corridor supply the hardware pipeline and need a different message from Bangkok software hiring." }
    ]
  },

  ID: {
    headline: "Biggest reach, weakest follow-up.",
    summary:
      "Indonesia gives you the largest raw student population in ASEAN, with two graduating cohorts a year and a " +
      "national credited-internship policy that allows fully credited 16–20 week placements. Volume is never the " +
      "problem here — the leak is between first contact and second conversation.",
    positioning: "Scale market. Invest in follow-up capacity before investing in more reach.",
    recommendations: [
      { head: "Fix follow-up before buying more reach",
        body: "Response rates are healthy and second-touch rates are not. Adding events without adding recruiter capacity makes the gap worse." },
      { head: "Use the credited-internship policy",
        body: "A fully credited 16–20 week placement inside the semester is a longer evaluation window than any other ASEAN market offers." },
      { head: "Go community-led",
        body: "Online communities and monthly AMAs outperform formal campus events. Bilingual content materially lifts engagement." }
    ]
  }
};

/* ------------------------------------------------------------------
 * AI market insights shown on the ASEAN Overview.
 * `kind` drives the accent colour; `metric` is the supporting number
 * the renderer computes live so the copy can never drift from data.
 * ------------------------------------------------------------------ */
const MARKET_INSIGHTS = [
  { kind: "coverage",    icon: "🏫",
    head: "Malaysia has the largest target-school coverage",
    body: "It carries more target schools than any other ASEAN market, at medium cost and only medium competition — the best coverage-to-cost ratio in the region.",
    action: "Make Malaysia the default volume market", go: { country: "MY" } },

  { kind: "calendar",    icon: "📅",
    head: "Singapore graduates earlier than most ASEAN markets",
    body: "Singapore students are work-ready from late May, ahead of Malaysia, Vietnam and Indonesia. Offers scoped on a regional August timeline arrive after the Singapore cohort has committed.",
    action: "Pull the Singapore cycle forward", go: { country: "SG" } },

  { kind: "supply",      icon: "⚡",
    head: "Vietnam provides the strongest technical talent availability",
    body: "High supply at low cost, growing faster than any other market in the region. The gap between what Vietnam can supply and what most teams recruit there is the largest single opportunity in ASEAN.",
    action: "Scale software volume into Vietnam", go: { country: "VN" } },

  { kind: "cost",        icon: "💡",
    head: "The Philippines offers the most attractive talent economics",
    body: "The only market in the region with low cost and low competition at the same time. Combined with English fluency, it is the cheapest qualified hire available.",
    action: "Open the Philippines for support hiring", go: { country: "PH" } },

  { kind: "overlap",     icon: "🔁",
    head: "Thailand and Singapore have overlapping internship seasons",
    body: "Both markets run a Jun–Aug window, so a single regional internship programme can serve them together — but Thailand's March graduation still needs its own offer timeline.",
    action: "Combine the Jun–Aug intern programme", go: { country: "TH" } }
];
