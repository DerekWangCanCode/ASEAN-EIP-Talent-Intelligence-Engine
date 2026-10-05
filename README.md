# ASEAN EIP Talent Intelligence Engine

**Know the Market → Discover Talent → Take Action**

An ASEAN recruiting decision intelligence platform that turns talent signals into recruiting actions. A zero-dependency static web app for early-career recruiting across **Singapore, Malaysia, Vietnam, the Philippines, Thailand and Indonesia**.

It is not a dashboard, not a search engine and not a chatbot — the recommendations are generated before anyone asks a question, and the assistant sits underneath them as an explain-and-explore layer.

Open `index.html` in any browser — no build step, no server, no CDN, no package manager.

## The recruiter journey

The whole application is organised around three steps, surfaced as a persistent journey ribbon under the header. Clicking a step navigates to it.

| Step | Question | Where |
|---|---|---|
| **1 · Know the Market** | *Where should we hire?* | Section A — ASEAN Overview, Country Profiles |
| **2 · Discover Talent** | *Who should we hire?* | Section B — Talent Discovery Dashboard, Hidden Talent Search |
| **3 · Take Action** | *What do I do next?* | Section C — Recommended Recruiting Actions |

## Section A — Know the Market

### ASEAN Overview

An executive cross-country dashboard. Four KPI tiles head the page (markets covered, target schools, reachable pipeline, peak internship month), followed by:

1. **Academic Calendar Comparison** — a shared 12-month timeline with one row per market, showing internship windows and graduation bands side by side, with a "today" marker. Underneath, a month-coverage strip counts how many of the six markets have students free in each month.
2. **Talent Market Insights** — a qualitative comparison table using **Low / Medium / High** bands rather than salary figures, across *Talent Cost*, *Talent Supply* and *Competition Intensity*. Tone is flipped per metric, so High supply reads green while High cost and High competition read red.
3. **Target School Coverage** — target schools and estimated talent pipeline per market, with a relative coverage bar. Rows are clickable and open that country's profile.
4. **AI Market Insights** — generated insight cards (largest school coverage, earliest graduations, strongest technical availability, most attractive cost, overlapping internship seasons), each with a suggested action that deep-links into the relevant country profile.

Exports the whole comparison to CSV.

### Country Profiles

A country picker (Singapore, Malaysia, Vietnam, Philippines, Thailand, Indonesia) that is also mirrored as nested items under **Country Profiles** in the sidebar. Selecting a market renders a recruiter research page:

1. **Country Summary** — headline, positioning and pipeline size.
2. **Target Schools** — tiered school cards with QS band, degree strengths, intake month and teaching language.
3. **Academic Calendar** — that market's internship windows and graduation timing on the same 12-month axis, plus prose notes.
4. **Talent Market Insights** — the three Low/Medium/High bands with a short interpretation of each.
5. **Recruiting Recommendations** — three AI-generated actions, plus a hand-off button that jumps to Hidden Talent Search pre-filtered to that country.

Exports the active profile to CSV.

## Section B — Discover Talent

### Talent Discovery Dashboard

Operational, action-oriented. Talent pool coverage by country, target school coverage, hidden talent opportunities and talent pool growth trends — with AI recommendations calling out schools requiring engagement, countries with talent gaps and talent pools needing attention. Every recommendation is a button that runs the underlying search.

### Hidden Talent Search

Search across **all** talent pools at once, not just the one you own — the point is to surface qualified people already in the system but parked in the wrong profession's pool. Filters: **School, Graduation Year, Degree, Major, Skills, Country, Talent Pool** (plus a free-text role). Results are split into *direct* matches and *hidden* matches (right skills, wrong pool), rendered as candidate cards with school, degree, graduation, country, skills, current pool and stage.

## Section C — Take Action

### Recommended Recruiting Actions ⭐

The flagship surface, and the reason this is a decision intelligence platform rather than a dashboard with a chatbot bolted on. The page generates its recommendations **before** the recruiter asks anything, and answers four questions on sight: *where should we hire, which schools should we engage, where are our talent gaps, what should we do next.*

**1 · Prioritised actions.** Four ranked recommendation cards, each one a claim plus the evidence for it — rationale, four supporting metrics, a mini chart and action tags that deep-link into search, a country profile, or a Copilot explanation.

| # | Recommendation | Backed by |
|---|---|---|
| 1 | Prioritize Vietnam for FY28 intern hiring | Addressable pipeline, fastest ASEAN growth, Low cost × High supply bands |
| 2 | Expand coverage to HCMUT and ITB | Tier-1 concentration of high potentials sitting below the coverage threshold |
| 3 | Thailand coverage is below the ASEAN average | School coverage % against the regional benchmark |
| 4 | Malaysia's graduate pipeline peaks in Q4 | Real quarterly cohort distribution against the Aug–Oct graduation window |

**2 · ASEAN talent opportunity map.** A stylised regional map — the silhouette is a plain lon/lat projection, so the pins land where the markets actually are. Each market carries its headline signal (high opportunity, coverage gap, graduate timing, large talent pool, growing pipeline, premium market) and is clickable, driving a side panel with bands, pipeline, coverage, graduation window and the channel that works there.

**3 · Key insights.** Total ASEAN talent pool, target schools tracked, average school coverage, and markets with growing pipelines.

**4 · Ask Talent Intelligence Copilot.** Deliberately demoted to the bottom of the page as a secondary *explain and explore* layer. It interrogates the recommendations rather than replacing them:

- Why is Vietnam recommended?
- Which schools similar to HCMUT should I prioritize?
- Create a campus engagement strategy.
- Compare Vietnam and Indonesia.
- Generate a FY28 internship hiring plan.

Questions are routed by keyword to a set of answer builders that compute over the live mock datasets. `why` scores every signal it weighs and reports the ones that *count against* the recommendation too; `compare` scores two markets head to head; `plan` sequences markets by when their internship window opens. Answers parse a country, school or fiscal year out of free text where relevant, cite the Low/Medium/High market bands from Section A, and end with suggested next actions rendered as clickable chips that drive the rest of the app.

The Export button on this tab writes the four recommendations plus the per-market opportunity signals to CSV.

## Data & wiring notes

- **Everything is mock data.** Schools, QS bands, calendars, market bands, pipeline sizes, talent pools, recruiters and candidates are invented reference data for demo purposes. Validate against live sources before any contractual use.
- **Market bands are deliberately qualitative.** Section A reports Low / Medium / High for cost, supply and competition instead of salary numbers, so the page stays defensible without a compensation data licence.
- **Calendars shift year to year.** The Ramadan / Eid al-Fitr break in Indonesia and Malaysia and the Lunar New Year break in Vietnam move by several weeks annually.
- **Deterministic demo.** Candidate rosters are generated at load by a seeded PRNG keyed off the pool id, so the data is identical on every reload without being hand-written (~1,000 candidates).
- **Never stale.** Dates are stored as day offsets from today, so a demo run in six months still reads "added 3 days ago".
- **No external calls.** Nothing is fetched, nothing is persisted, no `localStorage`. The only externally actionable artefacts are LinkedIn boolean / X-ray / Recruiter search strings, intended for manual paste into a licensed seat. Never scrape LinkedIn.
- Mock data ships as JavaScript `const`s rather than `.json` files on purpose: browsers block `fetch()` of local JSON under `file://`, which would break the no-server promise. The shape is plain JSON and lifts straight into an API response.

## Files

```
index.html             page shell, sidebar IA, journey ribbon, all three views
assets/styles.css      dark theme, Fluent tokens, Section A + journey styles
assets/app.js          shared helpers, delegated router, journey ribbon, window.UI bridge
assets/market.js       Section A — overview, country profiles, CSV exporters
assets/engine.js       Section B — dashboard, hidden talent search; Section C — recommendations, map, Copilot
data/data.js           countries, tiers, target schools, calendars, majors
data/market.js         market bands, calendars, pipeline, country prose, AI insights
data/talentpool.js     nine talent pools, stage definitions, candidate generator
data/discovery.js      job functions, market intel notes, outreach templates
data/engine.js         professions, demand, skill adjacency, opportunity map, Copilot prompts + intent rules
```

Scripts are classic (non-module) and **load order matters** — `data/*` before `assets/*`, and `assets/app.js` before the two section modules, which consume its `window.UI` bridge (helpers, `go()`, `syncJourney()` and a pluggable `UI.exporters` map).

Because `assets/market.js` injects the country sub-nav *after* `assets/app.js` has run, the sidebar router is implemented as event delegation on `#nav` rather than per-element listeners.
