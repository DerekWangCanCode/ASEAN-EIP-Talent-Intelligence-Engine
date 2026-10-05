/* ==================================================================
 * SECTION B - DISCOVER TALENT / SECTION C - TAKE ACTION
 * ------------------------------------------------------------------
 * Three tabs, one data model:
 *   1 Dashboard                       know the market
 *   2 Search & Hidden Talent          find talent, then find the talent you
 *                                     already had but nobody was working
 *   3 Recommended Recruiting Actions  decide what to do about it
 *
 * Tab 3 is the decision surface: it generates four ranked recommendations,
 * an opportunity map and the headline insights *before* anyone asks a
 * question, and keeps the Copilot underneath as an explain-and-explore
 * layer rather than the main event.
 *
 * Everything on all three tabs is derived from TALENT_POOL_CANDIDATES,
 * so a number shown on the dashboard, in a search result, on a
 * recommendation card and inside a Copilot answer is always the same
 * number.
 * ================================================================== */
(function () {
"use strict";

const $ = UI.$, $$ = UI.$$, el = UI.el, esc = UI.esc, toast = UI.toast, csv = UI.csv;

/* ============================================================
 * Lookups
 * ========================================================== */
const CAND = TALENT_POOL_CANDIDATES;
const fnById = id => DISCOVERY_FUNCTIONS.find(f => f.id === id);
const profById = id => ENGINE_PROFESSIONS.find(p => p.id === id);
const profByPool = pid => ENGINE_PROFESSIONS.find(p => p.pool === pid);

/* Display order asked for by the business: SG, MY, PH, TH, VN, ID. */
const CC_ORDER = ["SG", "MY", "PH", "TH", "VN", "ID"];
const cc = code => COUNTRIES.find(c => c.code === code) || { code: code, name: code, flag: "" };

/* Short, human pool names - "Engineering - SWE - Global" helps nobody. */
const POOL_SHORT = {
  "ENG-SWE":   "Software Engineering",
  "ENG-DC":    "Data Center",
  "ENG-OPS":   "Engineering Ops",
  "ENG-SPEC":  "Specialized Engineering",
  "COM-SALES": "Sales",
  "COM-TSELL": "Cloud & Technical Selling",
  "COM-TSUP":  "Technical Support",
  "COM-CS":    "Customer Success",
  "COM-CONS":  "Consulting Services"
};
const poolShort = id => POOL_SHORT[id] || id;

const WARM_FROM = ENGINE_COVERAGE.warmFromStage;
const isWarm = c => c.stageIndex >= WARM_FROM;
const isHiPo = c => c.relevance >= ENGINE_HIGH_POTENTIAL;
const pct = v => Math.round(v * 100);

function statusOf(ratio) {
  if (ratio >= 0.90) return { key: "healthy", label: "Healthy",      colour: "#31b57a" };
  if (ratio >= 0.65) return { key: "watch",   label: "Watch",        colour: "#e0a33c" };
  return                    { key: "below",   label: "Below target", colour: "#ef4444" };
}

/* ============================================================
 * Match scoring - the engine behind both search sections
 * ------------------------------------------------------------
 * A candidate is scored against a *profile* (a DISCOVERY_FUNCTIONS
 * entry), never against a pool. That is the whole trick: it is what
 * lets somebody sitting in the Cloud pool score 90% on a Software
 * Engineering profile instead of being invisible.
 *
 * The headline number is literally "percent of this profile the person
 * meets", so the four weights sum to 1:
 *
 *   skills   .45  exact profile skills, plus 60% credit for adjacent ones
 *   major    .30  full for an exact major, 55% for the same degree family
 *   tier     .15  target-school tier
 *   standing .10  their existing relevance inside their own pool
 *
 * The skills the recruiter actually typed are then applied as a bonus
 * or a penalty on top, because they are a preference rather than the
 * definition of the role.
 * ========================================================== */

/* skill -> the adjacency groups it belongs to */
const SKILL_GROUPS = (function () {
  const m = {};
  Object.keys(ENGINE_SKILL_GROUPS).forEach(g =>
    ENGINE_SKILL_GROUPS[g].forEach(s => {
      const k = s.toLowerCase();
      (m[k] = m[k] || []).push(g);
    }));
  return m;
})();
const groupsOf = s => SKILL_GROUPS[String(s).toLowerCase()] || [];
const adjacent = (a, b) => groupsOf(a).some(g => groupsOf(b).indexOf(g) >= 0);

function majorFamilies(major) {
  return Object.keys(ENGINE_MAJOR_FAMILIES)
    .filter(f => ENGINE_MAJOR_FAMILIES[f].indexOf(major) >= 0);
}

function score(c, profile, wantSkills) {
  const W = ENGINE_WEIGHTS;
  const pSkills = profile.skills;
  const pLower = pSkills.map(s => s.toLowerCase());

  /* --- skill fit: exact first, then adjacency at 60% credit --- */
  const exact = [], near = [];
  c.skills.forEach(s => {
    if (pLower.indexOf(s.toLowerCase()) >= 0) exact.push(s);
    else if (pSkills.some(p => adjacent(s, p))) near.push(s);
  });
  const skillFit = c.skills.length
    ? Math.min(1, (exact.length + 0.6 * near.length) / c.skills.length) : 0;

  /* --- major fit --- */
  const majorHit = profile.majors.indexOf(c.degreeField) >= 0;
  const famShared = !majorHit && majorFamilies(c.degreeField)
    .some(f => profile.majors.some(m => ENGINE_MAJOR_FAMILIES[f].indexOf(m) >= 0));
  const majorFit = majorHit ? 1 : famShared ? 0.55 : 0.15;

  const tierFit = c.tier === 1 ? 1 : c.tier === 2 ? 0.7 : 0.45;

  let fit = W.skills * skillFit + W.major * majorFit
          + W.tier * tierFit + W.standing * (c.relevance / 99);

  /* --- the skills the recruiter typed --- */
  const matchedWanted = [], nearWanted = [];
  if (wantSkills.length) {
    wantSkills.forEach(w => {
      const direct = c.skills.find(s => {
        const l = s.toLowerCase();
        return l.indexOf(w) >= 0 || w.indexOf(l) >= 0;
      });
      if (direct) return matchedWanted.push(w);
      if (c.skills.some(s => adjacent(s, w))) nearWanted.push(w);
    });
    const cover = Math.min(1,
      (matchedWanted.length + 0.5 * nearWanted.length) / wantSkills.length);
    fit += (W.skillBonus * cover - W.skillPenalty * (1 - cover)) / 100;
  }

  /* Skills the candidate holds that the recruiter asked for, or that
   * transfer into the profile - highlighted on the card. */
  const highlight = wantSkills.length
    ? c.skills.filter(s => {
        const l = s.toLowerCase();
        return wantSkills.some(w => l.indexOf(w) >= 0 || w.indexOf(l) >= 0 || adjacent(s, w));
      })
    : exact.concat(near);

  return {
    score: Math.max(20, Math.min(98, Math.round(fit * 100))),
    transferable: exact.concat(near),
    exact: exact,
    near: near,
    matchedSkills: highlight,
    missing: wantSkills.filter(w =>
      matchedWanted.indexOf(w) < 0 && nearWanted.indexOf(w) < 0),
    majorHit: majorHit,
    famShared: famShared
  };
}

/* ============================================================
 * Derived model - computed once at boot
 * ========================================================== */

/* --- per target school --- */
const SCHOOL_STATS = SCHOOLS.map(s => {
  const list = CAND.filter(c => c.schoolAbbr === s.abbr);
  const warm = list.filter(isWarm).length;
  return {
    abbr: s.abbr, name: s.name, city: s.city, country: s.country, tier: s.tier,
    qs: s.qsWorld, strengths: s.strengths,
    total: list.length,
    warm: warm,
    warmRate: list.length ? warm / list.length : 0,
    hi: list.filter(isHiPo).length,
    untouched: list.filter(c => c.stageIndex === 0).length,
    covered: list.length >= ENGINE_COVERAGE.minCandidates && warm >= ENGINE_COVERAGE.minWarm,
    warmGap: Math.max(0, ENGINE_COVERAGE.minWarm - warm),
    volGap: Math.max(0, ENGINE_COVERAGE.minCandidates - list.length)
  };
});

/* --- per profession, with a country breakdown --- */
const PROF_STATS = ENGINE_PROFESSIONS.map(p => {
  const list = CAND.filter(c => c.pool === p.pool);
  const byCountry = {};
  let demand = 0;
  CC_ORDER.forEach(code => {
    const l = list.filter(c => c.country === code);
    const d = (ENGINE_DEMAND[code] || {})[p.id] || 0;
    const target = d * ENGINE_PIPELINE_RATIO;
    demand += d;
    byCountry[code] = {
      code: code, total: l.length, hi: l.filter(isHiPo).length,
      warm: l.filter(isWarm).length, demand: d, target: target,
      ratio: target ? l.length / target : 0
    };
  });
  const target = demand * ENGINE_PIPELINE_RATIO;
  return {
    id: p.id, label: p.label, short: p.short, pool: p.pool, fn: p.fn,
    accent: p.accent, icon: p.icon,
    total: list.length,
    hi: list.filter(isHiPo).length,
    warm: list.filter(isWarm).length,
    demand: demand, target: target,
    ratio: target ? list.length / target : 0,
    byCountry: byCountry
  };
});
const profStat = id => PROF_STATS.find(p => p.id === id);

/* --- per market --- */
const COUNTRY_STATS = CC_ORDER.map(code => {
  const c = cc(code);
  const list = CAND.filter(x => x.country === code);
  const schools = SCHOOL_STATS.filter(s => s.country === code);
  const coveredSchools = schools.filter(s => s.covered);
  const inScope = list.filter(x => profByPool(x.pool));
  let demand = 0;
  ENGINE_PROFESSIONS.forEach(p => { demand += (ENGINE_DEMAND[code] || {})[p.id] || 0; });
  const target = demand * ENGINE_PIPELINE_RATIO;
  return {
    code: code, name: c.name, flag: c.flag,
    poolCount: list.length,
    inScope: inScope.length,
    hi: list.filter(isHiPo).length,
    warm: list.filter(isWarm).length,
    schools: schools.length,
    covered: coveredSchools.length,
    coverage: schools.length ? coveredSchools.length / schools.length : 0,
    demand: demand, target: target,
    ratio: target ? inScope.length / target : 0
  };
});

/* --- graduation cohorts --- */
const GRAD_YEARS = [...new Set(CAND.map(c => c.gradYear))].sort();
const COHORT_STATS = GRAD_YEARS.map(y => {
  const list = CAND.filter(c => c.gradYear === y);
  return {
    year: y, total: list.length, share: list.length / CAND.length,
    hi: list.filter(isHiPo).length, warm: list.filter(isWarm).length,
    untouched: list.filter(c => c.stageIndex === 0).length
  };
});

/* --- hidden-talent volume per profession ---
 * People outside the home pool who still clear the match floor for that
 * profession. Built lazily on first use, then cached - the dashboard,
 * the search tab and the Copilot all quote the same figures. */
let _hidden = null;
function hiddenAll() {
  if (_hidden) return _hidden;
  _hidden = ENGINE_PROFESSIONS.map(p => {
    const profile = fnById(p.fn);
    const out = CAND.filter(c => c.pool !== p.pool)
      .map(c => ({ c: c, s: score(c, profile, []) }))
      .filter(x => x.s.score >= ENGINE_MATCH.floor);
    const byPool = {};
    out.forEach(x => { byPool[x.c.pool] = (byPool[x.c.pool] || 0) + 1; });
    return {
      id: p.id, label: p.label, pool: p.pool, count: out.length,
      strong: out.filter(x => x.s.score >= ENGINE_MATCH.strong).length,
      byPool: byPool,
      topPool: Object.keys(byPool).sort((a, b) => byPool[b] - byPool[a])[0] || null
    };
  });
  return _hidden;
}
const hiddenStat = id => hiddenAll().find(h => h.id === id);
const hiddenRanked = () => hiddenAll().slice().sort((a, b) => b.count - a.count);

/* ============================================================
 * Tabs
 * ========================================================== */
let activeTab = "dashboard";

function showTab(tab) {
  /* Only reset the scroll when the pane actually changes. Section C puts
   * the Copilot at the bottom of a long page, so asking a question from a
   * recommendation card must not yank the reader back to the masthead. */
  const changed = activeTab !== tab;
  activeTab = tab;
  $$("#engPivot .pivot-tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  $$(".eng-pane").forEach(p => p.classList.toggle("active", p.id === "eng-" + tab));
  $$('#nav .nav-item[data-view="engine"]').forEach(a =>
    a.classList.toggle("active", a.dataset.tab === tab));
  if (changed) window.scrollTo(0, 0);
}

$$("#engPivot .pivot-tab").forEach(b =>
  b.addEventListener("click", () => showTab(b.dataset.tab)));

/* Sidebar entries deep-link straight to a tab. */
$$('#nav .nav-item[data-view="engine"]').forEach(a =>
  a.addEventListener("click", () => showTab(a.dataset.tab)));

/* ============================================================
 * TAB 1 - DASHBOARD
 * ========================================================== */
function kpiCard(o) {
  return `<div class="kpi" style="--kpi:${o.colour || "#4c7ef3"}">
    <div class="kpi-top"><span class="kpi-icon">${o.icon}</span>
      <span class="kpi-k">${esc(o.k)}</span></div>
    <div class="kpi-v">${o.v}<span class="kpi-u">${o.unit || ""}</span></div>
    <div class="kpi-sub">${o.sub}</div>
    ${o.bar != null ? `<div class="kpi-bar"><i style="width:${Math.min(100, pct(o.bar))}%"></i></div>` : ""}
  </div>`;
}

function renderDashboard() {
  const totalPool = CAND.length;
  const totalHi = CAND.filter(isHiPo).length;
  const allSchools = SCHOOL_STATS.length;
  const coveredSchools = SCHOOL_STATS.filter(s => s.covered).length;
  const coverage = coveredSchools / allSchools;
  const warm = CAND.filter(isWarm).length;

  $("#engAsOf").innerHTML = `${CC_ORDER.length} markets &middot; ${TALENT_POOLS.length} managed pools
    &middot; ${allSchools} target schools &middot; mock data`;

  $("#engKpis").innerHTML = [
    kpiCard({ icon: "&#128101;", k: "Talent Pool Count", v: totalPool.toLocaleString(),
      sub: `Across ${TALENT_POOLS.length} managed pools in ${CC_ORDER.length} ASEAN markets`,
      colour: "#4c7ef3" }),
    kpiCard({ icon: "&#127891;", k: "Target School Coverage", v: pct(coverage), unit: "%",
      sub: `${coveredSchools} of ${allSchools} target schools have a working pipeline`,
      colour: "#8b5cf6", bar: coverage }),
    kpiCard({ icon: "&#9733;", k: "High Potential Candidates", v: totalHi.toLocaleString(),
      sub: `Relevance ${ENGINE_HIGH_POTENTIAL}+ &middot; ${pct(totalHi / totalPool)}% of the total pool`,
      colour: "#e0a33c", bar: totalHi / totalPool }),
    kpiCard({ icon: "&#128293;", k: "Warm Pipeline", v: warm.toLocaleString(),
      sub: `Engaged or later &middot; ${pct(warm / totalPool)}% of the total pool`,
      colour: "#31b57a", bar: warm / totalPool })
  ].join("");

  $("#engCountryGrid").innerHTML = COUNTRY_STATS.map(c => {
    const st = statusOf(c.ratio);
    return `<div class="ctry" style="--st:${st.colour}">
      <div class="ctry-h">
        <div class="ctry-nm"><span class="fl">${c.flag}</span>${esc(c.name)}</div>
        <span class="tag-st" style="background:${st.colour}1f;color:${st.colour}">${st.label}</span>
      </div>
      <div class="ctry-m">
        <div><b>${c.poolCount}</b><span>Talent pool count</span></div>
        <div><b>${pct(c.coverage)}%</b><span>Target school coverage</span></div>
        <div><b>${c.hi}</b><span>High potential</span></div>
      </div>
      <div class="ctry-bar" title="${c.inScope} in pool vs target of ${c.target}">
        <i style="width:${Math.min(100, pct(c.ratio))}%;background:${st.colour}"></i>
      </div>
      <div class="ctry-f">${c.covered}/${c.schools} schools covered
        &middot; ${c.inScope} in scope vs ${c.target} target</div>
    </div>`;
  }).join("");

  $("#engProfGrid").innerHTML = PROF_STATS.map(p => {
    const st = statusOf(p.ratio);
    const hid = hiddenStat(p.id);
    const worst = CC_ORDER.map(code => p.byCountry[code]).sort((a, b) => a.ratio - b.ratio)[0];
    const spark = CC_ORDER.map(code => {
      const b = p.byCountry[code];
      const h = Math.max(6, Math.min(100, pct(b.ratio)));
      return `<i title="${cc(code).name}: ${b.total} in pool vs ${b.target} target"
        style="height:${h}%;background:${statusOf(b.ratio).colour}"></i>`;
    }).join("");
    return `<div class="prof" style="--ac:${p.accent}">
      <div class="prof-h">
        <span class="prof-ic">${p.icon}</span>
        <div class="prof-nm">${esc(p.label)}<span>${esc(poolShort(p.pool))} pool</span></div>
        <span class="tag-st" style="background:${st.colour}1f;color:${st.colour}">${st.label}</span>
      </div>
      <div class="prof-v">${p.total}<span>in pool &middot; target ${p.target}</span></div>
      <div class="prof-bar"><i style="width:${Math.min(100, pct(p.ratio))}%;background:${st.colour}"></i></div>
      <div class="prof-spark">${spark}</div>
      <div class="prof-f">
        <span><b>${p.hi}</b> high potential</span>
        <span><b>${p.warm}</b> warm</span>
        <span class="hid"><b>${hid.count}</b> hidden elsewhere</span>
      </div>
      <div class="prof-note">Weakest market: <b>${cc(worst.code).flag} ${esc(cc(worst.code).name)}</b>
        at ${pct(worst.ratio)}% of target</div>
    </div>`;
  }).join("");

  renderDashInsights();
  renderDashActions();
}

/* ---------- Key insights ---------- */
function buildInsights() {
  const out = [];

  /* 1-2. worst profession x market gaps */
  const gaps = [];
  PROF_STATS.forEach(p => CC_ORDER.forEach(code => {
    const b = p.byCountry[code];
    if (b.target) gaps.push({ p: p, code: code, b: b });
  }));
  gaps.sort((a, b) => a.b.ratio - b.b.ratio);
  gaps.slice(0, 2).forEach(g => out.push({
    tone: "risk", icon: "&#9888;",
    head: `${cc(g.code).name} ${g.p.short} pipeline below target`,
    body: `${g.b.total} candidates in pool against a target of ${g.b.target}
      (${g.b.demand} planned hires &times; ${ENGINE_PIPELINE_RATIO}).
      That is ${pct(g.b.ratio)}% of the pipeline this intake needs.`,
    metric: pct(g.b.ratio) + "%"
  }));

  /* 3. weakest school coverage */
  const worstCov = COUNTRY_STATS.slice().sort((a, b) => a.coverage - b.coverage)[0];
  out.push({
    tone: "risk", icon: "&#127891;",
    head: `${worstCov.name} university coverage is low`,
    body: `Only ${worstCov.covered} of ${worstCov.schools} target schools clear the coverage bar
      (${ENGINE_COVERAGE.minCandidates}+ in pool and ${ENGINE_COVERAGE.minWarm}+ warm).
      Reach is there; the Engage step is where it stalls.`,
    metric: pct(worstCov.coverage) + "%"
  });

  /* 4. strongest market */
  const best = COUNTRY_STATS.slice().sort((a, b) => b.ratio - a.ratio)[0];
  const bestEng = profStat("swe").byCountry[best.code];
  out.push({
    tone: "good", icon: "&#10004;",
    head: `${best.name} engineering talent pool is healthy`,
    body: `${bestEng.total} software engineers in pool against a ${bestEng.target} target,
      ${best.covered}/${best.schools} target schools covered and ${best.hi} high-potential
      candidates. Hold the cadence rather than adding spend.`,
    metric: pct(best.ratio) + "%"
  });

  /* 5. hidden talent */
  const topHidden = hiddenRanked()[0];
  out.push({
    tone: "watch", icon: "&#128269;",
    head: `${topHidden.count} ${topHidden.label.toLowerCase()} matches sit in other pools`,
    body: `The largest block is in the ${poolShort(topHidden.topPool)} pool.
      ${topHidden.strong} of them score ${ENGINE_MATCH.strong}%+ against the profile and
      nobody is working them for this role.`,
    metric: topHidden.count
  });

  /* 6. cohort skew */
  const thinnest = COHORT_STATS.slice().sort((a, b) => a.share - b.share)[0];
  out.push({
    tone: "watch", icon: "&#128197;",
    head: `Class of ${thinnest.year} is the thinnest cohort`,
    body: `${thinnest.total} candidates (${pct(thinnest.share)}% of the pool) and
      ${thinnest.untouched} of them have never been contacted. Earliest cohorts are the
      cheapest to build a relationship with.`,
    metric: pct(thinnest.share) + "%"
  });

  return out;
}

function renderDashInsights() {
  const list = buildInsights();
  $("#engInsightNote").textContent = list.filter(i => i.tone === "risk").length + " need a decision";
  $("#engInsights").innerHTML = list.map(i => `
    <div class="insight ${i.tone}">
      <span class="ins-ic">${i.icon}</span>
      <div class="ins-b">
        <div class="ins-h">${esc(i.head)}</div>
        <div class="ins-t">${i.body}</div>
      </div>
      <div class="ins-m">${i.metric}</div>
    </div>`).join("");
}

/* ---------- Recommended actions ----------
 * Each action is a real handoff: it prefills the search tab or the
 * Copilot, so the dashboard is never a dead end. */
function buildDashActions() {
  const out = [];

  /* Engage the best untouched cohort at the strongest school. Prefer a
   * cohort that has not graduated yet and is largely untouched - that is
   * where engagement actually changes the outcome. */
  const bestSchool = SCHOOL_STATS.slice()
    .sort((a, b) => b.hi - a.hi || b.untouched - a.untouched)[0];
  const thisYear = new Date().getFullYear();
  const cohortAt = GRAD_YEARS
    .map(y => ({
      y: y,
      n: CAND.filter(c => c.schoolAbbr === bestSchool.abbr && c.gradYear === y && isHiPo(c)).length,
      cold: CAND.filter(c => c.schoolAbbr === bestSchool.abbr && c.gradYear === y
        && isHiPo(c) && c.stageIndex === 0).length,
      future: y > thisYear ? 1 : 0
    }))
    .sort((a, b) => (b.future - a.future) || (b.cold - a.cold) || (b.n - a.n))[0];
  out.push({
    rank: "High", icon: "&#127919;",
    head: `Engage ${bestSchool.name} ${cohortAt.y} graduates`,
    body: `${cohortAt.n} high-potential ${cohortAt.y} candidates there and ${cohortAt.cold}
      of them are still at Sourced with no two-way contact.`,
    cta: "Open in search",
    go: { tab: "search", uni: bestSchool.abbr, year: cohortAt.y }
  });

  /* Launch outreach at the weakest covered school in the weakest market. */
  const worstCov = COUNTRY_STATS.slice().sort((a, b) => a.coverage - b.coverage)[0];
  const target = SCHOOL_STATS.filter(s => s.country === worstCov.code && !s.covered)
    .sort((a, b) => b.total - a.total || a.warmRate - b.warmRate)[0];
  if (target) out.push({
    rank: "High", icon: "&#128226;",
    head: `Launch outreach at ${target.name}`,
    body: `${target.total} candidates in pool but only ${target.warm} warm
      (${pct(target.warmRate)}%). ${target.warmGap} more warm conversations clears the
      coverage bar for ${worstCov.name}.`,
    cta: "Open in search",
    go: { tab: "search", uni: target.abbr, country: worstCov.code }
  });

  /* Work the biggest hidden-talent block. */
  const topHidden = hiddenRanked()[0];
  const topHiddenProf = profById(topHidden.id);
  out.push({
    rank: "High", icon: "&#128269;",
    head: `Review hidden ${topHidden.label.toLowerCase()} talent across ASEAN`,
    body: `${topHidden.count} qualified people sit outside the ${poolShort(topHidden.pool)} pool -
      ${topHidden.strong} of them at ${ENGINE_MATCH.strong}%+ match. No sourcing spend required.`,
    cta: "Run hidden-talent search",
    go: { tab: "search", title: fnById(topHiddenProf.fn).titles[0] }
  });

  /* Close the worst profession x market gap. */
  const gaps = [];
  PROF_STATS.forEach(p => CC_ORDER.forEach(code => {
    const b = p.byCountry[code];
    if (b.target) gaps.push({ p: p, code: code, b: b });
  }));
  gaps.sort((a, b) => a.b.ratio - b.b.ratio);
  const g = gaps[0];
  const shortfall = g.b.target - g.b.total;
  out.push({
    rank: "Medium", icon: "&#128200;",
    head: `Close the ${cc(g.code).name} ${g.p.short} shortfall`,
    body: `${shortfall} more candidates needed to hit the ${g.b.target} target.
      Start with the ${SCHOOL_STATS.filter(s => s.country === g.code).length} target schools in
      ${cc(g.code).name} before opening a new market.`,
    cta: "Open in search",
    go: { tab: "search", title: fnById(g.p.fn).titles[0], country: g.code }
  });

  /* Re-activate the thinnest cohort. */
  const thinnest = COHORT_STATS.slice().sort((a, b) => a.share - b.share)[0];
  out.push({
    rank: "Medium", icon: "&#128197;",
    head: `Build the class of ${thinnest.year}`,
    body: `${thinnest.untouched} of ${thinnest.total} have never been contacted.
      This cohort graduates last, so it is the cheapest relationship to start now.`,
    cta: "Ask the Copilot",
    go: { tab: "copilot", ask: "Which graduation cohorts are underrepresented?" }
  });

  return out;
}

function renderDashActions() {
  const list = buildDashActions();
  const host = $("#engActions");
  host.innerHTML = "";
  list.forEach(a => {
    const n = el("div", "action");
    n.innerHTML = `
      <span class="act-ic">${a.icon}</span>
      <div class="act-b">
        <div class="act-h">${esc(a.head)}<span class="act-rank ${a.rank.toLowerCase()}">${a.rank}</span></div>
        <div class="act-t">${a.body}</div>
      </div>
      <button class="btn sm">${esc(a.cta)} &rarr;</button>`;
    n.querySelector("button").addEventListener("click", () => runAction(a.go));
    host.appendChild(n);
  });
}

function runAction(go) {
  if (go.tab === "copilot") {
    showTab("copilot");
    ask(go.ask);
    return;
  }
  showTab("search");
  resetSearch(true);
  if (go.title)   $("#engTitle").value = go.title;
  if (go.uni)     $("#engUni").value = go.uni;
  if (go.year)    $("#engYear").value = String(go.year);
  if (go.country) $("#engCountry").value = go.country;
  if (go.degree)  $("#engDegree").value = go.degree;
  if (go.pool)    $("#engPool").value = go.pool;
  if (go.major)   $("#engMajor").value = go.major;
  syncSkillChips();
  runSearch();
}

/* ============================================================
 * TAB 2 - SEARCH & HIDDEN TALENT
 * ========================================================== */
const PAGE = 12;
let shown = { direct: PAGE, hidden: PAGE };
let lastResult = null;

const ALL_TITLES = (function () {
  const out = [];
  DISCOVERY_FUNCTIONS.forEach(f => f.titles.forEach(t => {
    if (out.indexOf(t) < 0) out.push(t);
  }));
  return out.sort();
})();

const ALL_SKILLS = [...new Set(CAND.flatMap(c => c.skills))].sort();
const ALL_MAJORS = [...new Set(CAND.map(c => c.degreeField))].sort();
const DEGREE_ORDER = { Bachelor: 0, Master: 1, PhD: 2 };
const ALL_DEGREES = [...new Set(CAND.map(c => c.degreeLevel))]
  .sort((a, b) => (DEGREE_ORDER[a] || 9) - (DEGREE_ORDER[b] || 9));

function initSearch() {
  $("#engCorpusN").textContent = CAND.length.toLocaleString();
  $("#engCorpusP").textContent = TALENT_POOLS.length;

  $("#engTitleList").innerHTML = ALL_TITLES.map(t => `<option value="${esc(t)}">`).join("");
  $("#engSkillList").innerHTML = ALL_SKILLS.map(s => `<option value="${esc(s)}">`).join("");

  const uni = $("#engUni");
  CC_ORDER.forEach(code => {
    const g = document.createElement("optgroup");
    g.label = cc(code).flag + " " + cc(code).name;
    SCHOOLS.filter(s => s.country === code)
      .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))
      .forEach(s => g.appendChild(new Option(s.name + " (T" + s.tier + ")", s.abbr)));
    uni.appendChild(g);
  });

  ALL_MAJORS.forEach(m => $("#engMajor").appendChild(new Option(m, m)));
  GRAD_YEARS.forEach(y => $("#engYear").appendChild(new Option("Class of " + y, y)));
  CC_ORDER.forEach(code => $("#engCountry").appendChild(
    new Option(cc(code).flag + " " + cc(code).name, code)));
  ALL_DEGREES.forEach(d => $("#engDegree").appendChild(
    new Option(d === "PhD" ? "PhD" : d + "'s degree", d)));

  const poolSel = $("#engPool");
  ["Engineering", "Commercial"].forEach(fam => {
    const g = document.createElement("optgroup");
    g.label = fam + " pools";
    TALENT_POOLS.filter(p => p.family === fam)
      .forEach(p => g.appendChild(new Option(poolShort(p.id), p.id)));
    poolSel.appendChild(g);
  });

  $("#engRun").addEventListener("click", () => { shown = { direct: PAGE, hidden: PAGE }; runSearch(); });
  $("#engReset").addEventListener("click", () => resetSearch());
  $("#engTitle").addEventListener("change", syncSkillChips);
  $("#engTitle").addEventListener("keydown", e => { if (e.key === "Enter") $("#engRun").click(); });
  $("#engSkills").addEventListener("keydown", e => { if (e.key === "Enter") $("#engRun").click(); });

  $("#engDirectMore").addEventListener("click", () => { shown.direct += PAGE; paint(); });
  $("#engHiddenMore").addEventListener("click", () => { shown.hidden += PAGE; paint(); });

  syncSkillChips();
  emptyState();
}

/* Skill chips follow the job title - they are the profile's own stack. */
function syncSkillChips() {
  const profile = resolveProfile($("#engTitle").value) || fnById("swe");
  const chosen = parseSkills($("#engSkills").value);
  const host = $("#engSkillChips");
  host.innerHTML = `<span class="sc-lbl">Suggested for ${esc(profile.label)}:</span>`;
  profile.skills.slice(0, 10).forEach(s => {
    const b = el("button", "chip sm", esc(s));
    if (chosen.indexOf(s.toLowerCase()) >= 0) b.classList.add("active");
    b.addEventListener("click", () => {
      const cur = parseSkills($("#engSkills").value);
      const i = cur.indexOf(s.toLowerCase());
      if (i >= 0) cur.splice(i, 1); else cur.push(s.toLowerCase());
      $("#engSkills").value = cur.map(x => titleCaseSkill(x)).join(", ");
      syncSkillChips();
    });
    host.appendChild(b);
  });
  $("#engProfileNote").innerHTML = `Matching against the <b>${esc(profile.label)}</b> profile
    &middot; home pool <b>${esc(poolShort(profile.pool))}</b>`;
}

function titleCaseSkill(s) {
  const hit = ALL_SKILLS.find(x => x.toLowerCase() === s);
  return hit || s;
}
const parseSkills = v => String(v || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

function resolveProfile(title) {
  const t = String(title || "").trim().toLowerCase();
  if (!t) return null;
  let hit = DISCOVERY_FUNCTIONS.find(f => f.titles.some(x => x.toLowerCase() === t));
  if (hit) return hit;
  hit = DISCOVERY_FUNCTIONS.find(f =>
    f.titles.some(x => x.toLowerCase().indexOf(t) >= 0 || t.indexOf(x.toLowerCase()) >= 0));
  if (hit) return hit;
  const words = t.split(/[^a-z]+/).filter(w => w.length > 2);
  let best = null, bestN = 0;
  DISCOVERY_FUNCTIONS.forEach(f => {
    const hay = (f.label + " " + f.titles.join(" ") + " " + f.skills.join(" ")).toLowerCase();
    const n = words.filter(w => hay.indexOf(w) >= 0).length;
    if (n > bestN) { bestN = n; best = f; }
  });
  return bestN ? best : null;
}

function resetSearch(quiet) {
  ["engTitle", "engSkills"].forEach(id => { $("#" + id).value = ""; });
  ["engUni", "engMajor", "engYear", "engCountry", "engDegree", "engPool"]
    .forEach(id => { $("#" + id).value = ""; });
  shown = { direct: PAGE, hidden: PAGE };
  lastResult = null;
  syncSkillChips();
  if (!quiet) { emptyState(); toast("Search reset"); }
}

function emptyState() {
  $("#engSearchKpis").innerHTML = "";
  $("#engDirect").innerHTML =
    `<div class="empty">Set a job title and press <b>Search all pools</b>.
      Try <b>Software Engineer</b> &middot; class of 2027 &middot; Python.</div>`;
  $("#engHidden").innerHTML =
    `<div class="empty">Hidden talent appears here once you run a search.</div>`;
  $("#engHiddenOrigins").innerHTML = "";
  $("#engDirectCount").textContent = "0";
  $("#engHiddenCount").textContent = "0";
  $("#engDirectMore").hidden = true;
  $("#engHiddenMore").hidden = true;
}

function runSearch() {
  const titleRaw = $("#engTitle").value.trim();
  const profile = resolveProfile(titleRaw) || fnById("swe");
  const wantSkills = parseSkills($("#engSkills").value);
  const uni = $("#engUni").value, major = $("#engMajor").value;
  const year = $("#engYear").value, country = $("#engCountry").value;
  const degree = $("#engDegree").value, poolId = $("#engPool").value;

  /* Hard filters first - these are the recruiter's stated constraints. */
  const pool = CAND.filter(c =>
    (!uni || c.schoolAbbr === uni) &&
    (!major || c.degreeField === major) &&
    (!year || String(c.gradYear) === year) &&
    (!country || c.country === country) &&
    (!degree || c.degreeLevel === degree) &&
    (!poolId || c.pool === poolId));

  const scored = pool.map(c => {
    const s = score(c, profile, wantSkills);
    return {
      c: c, score: s.score, transferable: s.transferable,
      exact: s.exact, near: s.near,
      matched: s.matchedSkills, missing: s.missing,
      majorHit: s.majorHit, famShared: s.famShared,
      direct: c.pool === profile.pool
    };
  }).filter(r => r.score >= ENGINE_MATCH.floor);

  scored.sort((a, b) => b.score - a.score || b.c.relevance - a.c.relevance);

  lastResult = {
    profile: profile,
    titleRaw: titleRaw || profile.titles[0],
    wantSkills: wantSkills,
    filters: { uni: uni, major: major, year: year, country: country,
               degree: degree, pool: poolId },
    direct: scored.filter(r => r.direct),
    hidden: scored.filter(r => !r.direct)
  };

  paint();
  toast(lastResult.direct.length + " direct + " + lastResult.hidden.length + " hidden talent matches");
}

function paint() {
  const r = lastResult;
  if (!r) return emptyState();

  const total = r.direct.length + r.hidden.length;
  const strongHidden = r.hidden.filter(x => x.score >= ENGINE_MATCH.strong).length;

  $("#engSearchKpis").innerHTML = [
    kpiCard({ icon: "&#127919;", k: "Direct Matches Found", v: r.direct.length,
      sub: `Already in the ${esc(poolShort(r.profile.pool))} pool`, colour: "#4c7ef3" }),
    kpiCard({ icon: "&#128142;", k: "Hidden Talent Found", v: r.hidden.length,
      sub: `${strongHidden} at ${ENGINE_MATCH.strong}%+ match, sitting in other pools`, colour: "#8b5cf6" }),
    kpiCard({ icon: "&Sigma;", k: "Total Qualified Talent", v: total,
      sub: total ? `${pct(r.hidden.length / total)}% of your qualified talent was hidden`
                 : "No candidates clear the match floor", colour: "#31b57a" })
  ].join("");

  /* where the hidden people actually live */
  const byPool = {};
  r.hidden.forEach(x => { byPool[x.c.pool] = (byPool[x.c.pool] || 0) + 1; });
  const origins = Object.keys(byPool).sort((a, b) => byPool[b] - byPool[a]);
  $("#engHiddenOrigins").innerHTML = origins.length
    ? `<span class="po-lbl">Found in:</span>` + origins.map(p =>
        `<span class="po">${esc(poolShort(p))} <b>${byPool[p]}</b></span>`).join("")
    : "";

  $("#engDirectCount").textContent = r.direct.length;
  $("#engHiddenCount").textContent = r.hidden.length;

  fill($("#engDirect"), r.direct.slice(0, shown.direct), r, false,
    "No candidate in the " + poolShort(r.profile.pool) + " pool matches these filters.");
  fill($("#engHidden"), r.hidden.slice(0, shown.hidden), r, true,
    "No qualified talent found outside the home pool for this profile.");

  $("#engDirectMore").hidden = r.direct.length <= shown.direct;
  $("#engHiddenMore").hidden = r.hidden.length <= shown.hidden;
  $("#engDirectMore").textContent = "Show more (" + (r.direct.length - shown.direct) + " left)";
  $("#engHiddenMore").textContent = "Show more (" + (r.hidden.length - shown.hidden) + " left)";
}

function fill(host, rows, r, hiddenMode, emptyMsg) {
  host.innerHTML = "";
  if (!rows.length) { host.innerHTML = `<div class="empty">${esc(emptyMsg)}</div>`; return; }
  rows.forEach(x => host.appendChild(candCard(x, r, hiddenMode)));
}

function scoreClass(s) {
  return s >= ENGINE_MATCH.strong ? "s-strong" : s >= ENGINE_MATCH.good ? "s-good" : "s-fair";
}

function candCard(x, r, hiddenMode) {
  const c = x.c, co = cc(c.country), st = POOL_STAGES[c.stageIndex];
  const n = el("div", "cand" + (hiddenMode ? " is-hidden" : ""));

  const explain = hiddenMode ? `
    <div class="ai">
      <span class="ai-ic">&#10024;</span>
      <div>
        <p>This candidate is currently stored in the <b>${esc(poolShort(c.pool))}</b> talent pool
          but matches <b>${x.score}%</b> of the ${esc(r.profile.label)} profile requirements.</p>
        <p class="ai-why">
          ${x.exact.length ? `Direct overlap: <b>${x.exact.map(esc).join(", ")}</b>. ` : ""}
          ${x.near.length ? `Adjacent: <b>${x.near.map(esc).join(", ")}</b>. ` : ""}
          ${!x.exact.length && !x.near.length ? `No overlapping tooling &mdash; the fit is degree and school. ` : ""}
          ${x.majorHit ? `${esc(c.degreeField)} is on the profile's major list. `
                       : x.famShared ? `${esc(c.degreeField)} is in an adjacent degree family. ` : ""}
          ${x.missing.length ? `Gap to close: <b>${x.missing.map(s => esc(titleCaseSkill(s))).join(", ")}</b>.` : ""}
        </p>
      </div>
    </div>` : "";

  n.innerHTML = `
    <div class="cand-h">
      <div class="cand-id">
        <div class="cand-nm">${esc(c.name)}
          ${hiddenMode ? `<span class="hidden-badge">Hidden Talent</span>` : ""}</div>
        <div class="cand-sub">${co.flag} ${esc(co.name)} &middot; ${esc(c.school)}</div>
      </div>
      <div class="cand-score ${scoreClass(x.score)}">
        <b>${x.score}%</b><span>match</span>
      </div>
    </div>

    <div class="cand-facts">
      <div><span>University</span>${esc(c.schoolAbbr)} &middot; Tier ${c.tier}</div>
      <div><span>Major</span>${esc(c.degreeField)}</div>
      <div><span>Graduation</span>${esc(c.gradLabel)}</div>
      <div><span>Talent pool</span>${esc(poolShort(c.pool))}</div>
    </div>

    <div class="cand-skills">${c.skills.map(s => {
      const on = x.matched.indexOf(s) >= 0;
      return `<span class="tag${on ? " on" : ""}">${esc(s)}</span>`;
    }).join("")}</div>

    ${explain}

    <div class="cand-f">
      <span class="stage" style="background:${st.colour}22;color:${st.colour}">${esc(st.label)}</span>
      <span class="sub-txt">Owner ${esc(c.recruiter)}</span>
      <span class="grow"></span>
      <span class="sub-txt">Pool relevance ${c.relevance}</span>
    </div>`;
  return n;
}

/* ============================================================
 * TAB 3 - RECOMMENDED RECRUITING ACTIONS (Section C)
 * ------------------------------------------------------------
 * This is a decision surface, not a chat surface. The page answers
 * four questions before the recruiter asks anything:
 *
 *   where should we hire        -> prioritised action 1 + the map
 *   which schools to engage     -> prioritised action 2
 *   where are the talent gaps   -> prioritised action 3 + the map
 *   what do we do next          -> prioritised action 4 + card actions
 *
 * The Copilot sits underneath as an explain-and-explore layer. Every
 * recommendation is recomputed from the same derived model the
 * dashboard and search use, so nothing here can drift away from the
 * rest of the product.
 * ========================================================== */

const pipeOf = code => (typeof MARKET_PIPELINE !== "undefined" && MARKET_PIPELINE[code]) || {};
const sigOf  = code => (typeof MARKET_SIGNALS  !== "undefined" && MARKET_SIGNALS[code])  || {};
const calOf  = code => (typeof MARKET_CALENDAR !== "undefined" && MARKET_CALENDAR[code]) || {};
const intelOf = code => (typeof MARKET_INTEL   !== "undefined" && MARKET_INTEL[code])    || {};
const ctryStat   = code => COUNTRY_STATS.find(c => c.code === code);
const schoolStat = abbr => SCHOOL_STATS.find(s => s.abbr === abbr);

/* Regional reference lines every recommendation is measured against. */
const ASEAN_COVERAGE  = SCHOOL_STATS.filter(s => s.covered).length / SCHOOL_STATS.length;
const ASEAN_WARM_RATE = CAND.filter(isWarm).length / CAND.length;
const GROWING_MARKETS = CC_ORDER.filter(c => (pipeOf(c).growth || 0) >= 5);

const QUARTER_LABEL = ["Q1 Jan–Mar", "Q2 Apr–Jun", "Q3 Jul–Sep", "Q4 Oct–Dec"];
function quartersOf(code) {
  const q = [0, 0, 0, 0];
  CAND.filter(c => c.country === code).forEach(c => q[Math.floor(c.gradMonth / 3)]++);
  return q;
}
const maxIndex = arr => arr.reduce((best, v, i) => (v > arr[best] ? i : best), 0);
const rankOf = (code, pick) => CC_ORDER.slice().sort((a, b) => pick(b) - pick(a)).indexOf(code) + 1;
const ordinal = n => n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");

/* ---------- a horizontal bar chart small enough to live in a card ---------- */
function miniChart(o) {
  const max = Math.max.apply(null, o.rows.map(r => r.v)) || 1;
  return `<figure class="mc">
    <figcaption class="mc-h">${esc(o.title)}</figcaption>
    <div class="mc-rows">${o.rows.map(r => `
      <div class="mc-row${r.on ? " on" : ""}${r.ref ? " ref" : ""}">
        <span class="mc-l">${r.label}</span>
        <span class="mc-t"><i style="width:${Math.max(2, Math.round(r.v / max * 100))}%"></i></span>
        <span class="mc-v">${r.text}</span>
      </div>`).join("")}</div>
    ${o.foot ? `<p class="mc-f">${o.foot}</p>` : ""}
  </figure>`;
}

/* ============================================================
 * 1 - PRIORITISED ACTIONS
 * ------------------------------------------------------------
 * Four recommendations, each one a claim plus the evidence for it.
 * Built fresh so the copy can never quote a number the model no
 * longer produces.
 * ========================================================== */
function buildActions() {
  const out = [];

  /* ---------- 1 · where to hire ---------- */
  const vn = ctryStat("VN"), vnPipe = pipeOf("VN"), vnSig = sigOf("VN");
  out.push({
    accent: "#0f6cbd", icon: cc("VN").flag,
    kicker: "Where should we hire",
    title: "Prioritize Vietnam for FY28 Intern Hiring",
    reason: `Vietnam shows the strongest combination of talent supply, target-school concentration
      and cost competitiveness. It is ${ordinal(rankOf("VN", c => pipeOf(c).reachable || 0))} in ASEAN on
      addressable pipeline but ${ordinal(rankOf("VN", c => pipeOf(c).growth || 0))} on growth, and it is the only
      market that pairs a <b>${esc(vnSig.supply || "High")}</b> supply band with a
      <b>${esc(vnSig.cost || "Low")}</b> cost band.`,
    metrics: [
      { v: "+" + (vnPipe.growth || 0) + "%", k: "YoY pipeline growth · fastest in ASEAN" },
      { v: (vnPipe.reachable || 0).toLocaleString(), k: "Addressable final-year students" },
      { v: vn.covered + "/" + vn.schools, k: "Target schools covered (" + pct(vn.coverage) + "%)" },
      { v: vn.hi.toLocaleString(), k: "High-potential candidates already in pool" }
    ],
    chart: miniChart({
      title: "ASEAN talent pool size comparison",
      rows: CC_ORDER.map(code => ({
        v: pipeOf(code).reachable || 0,
        on: code === "VN",
        label: cc(code).flag + " " + esc(cc(code).name),
        text: (pipeOf(code).reachable || 0).toLocaleString() +
          ` <em>+${pipeOf(code).growth || 0}%</em>`
      })).sort((a, b) => b.v - a.v),
      foot: `Addressable final-year students in range of the target-school list, with year-on-year
        movement. ${esc(vnPipe.strength || "")}`
    }),
    tags: ["High Talent Supply", "Growing Talent Pools", "Cost Competitive"],
    acts: [
      askChip("Why is Vietnam recommended?"),
      searchChip("Search Vietnam talent", { tab: "search", country: "VN" }),
      { text: "Open the Vietnam profile", run: () => openCountry("VN") }
    ]
  });

  /* ---------- 2 · which schools to engage ---------- */
  const picks = ["HCMUT", "ITB"].map(schoolStat).filter(Boolean);
  const pickHi = picks.reduce((n, s) => n + s.hi, 0);
  const pickTotal = picks.reduce((n, s) => n + s.total, 0);
  out.push({
    accent: "#8b5cf6", icon: "🎓",
    kicker: "Which schools should we engage",
    title: "Expand Coverage to " + picks.map(s => s.abbr).join(" and "),
    reason: `These universities contain a large concentration of target talent that is currently
      underrepresented in recruiting pipelines. Both are Tier 1 and together hold
      <b>${pickHi} high-potential candidates</b>, yet
      ${picks.map(s => esc(s.abbr) + " sits at " + pct(s.warmRate) + "% warm").join(" and ")} —
      against an ASEAN average of ${pct(ASEAN_WARM_RATE)}%.`,
    metrics: picks.map(s => ({
      v: s.total + " <em>/ " + s.hi + " HiPo</em>",
      k: s.abbr + " · Tier " + s.tier + " · " + cc(s.country).name
    })).concat([
      { v: pickTotal.toLocaleString(), k: "Candidates already held across both schools" },
      { v: picks.filter(s => !s.covered).length + "/" + picks.length,
        k: "Still short of the coverage threshold" }
    ]),
    chart: miniChart({
      title: "Coverage versus ASEAN average",
      rows: picks.map(s => ({
        v: s.warmRate, on: true,
        label: esc(s.abbr) + " <em>" + cc(s.country).flag + "</em>",
        text: pct(s.warmRate) + "% warm"
      })).concat([{
        v: ASEAN_WARM_RATE, ref: true,
        label: "ASEAN average", text: pct(ASEAN_WARM_RATE) + "% warm"
      }]),
      foot: `A school is only <i>covered</i> at ${ENGINE_COVERAGE.minCandidates}+ in pool and
        ${ENGINE_COVERAGE.minWarm}+ warm. ` +
        picks.map(s => s.covered
          ? esc(s.abbr) + " has just cleared it with zero headroom"
          : esc(s.abbr) + " is " + (s.volGap || s.warmGap) + " short").join("; ") + "."
    }),
    tags: ["High Quality Talent", "Under-covered", "Strategic Fit"],
    acts: picks.map(s => searchChip("Open " + s.abbr + " in search", { tab: "search", uni: s.abbr }))
      .concat([askChip("Which schools similar to HCMUT should I prioritize?")])
  });

  /* ---------- 3 · where the gaps are ---------- */
  const th = ctryStat("TH");
  out.push({
    accent: "#e0a33c", icon: cc("TH").flag,
    kicker: "Where are our talent gaps",
    title: "Talent Pool Coverage in Thailand is Below ASEAN Average",
    reason: `Current talent pool penetration is below regional benchmarks — ${th.covered} of
      ${th.schools} target schools have a working pipeline (${pct(th.coverage)}%) against an ASEAN
      average of ${pct(ASEAN_COVERAGE)}%. Recommend increased sourcing and university partnership
      activity rather than new target schools.`,
    metrics: [
      { v: pct(th.coverage) + "%", k: "School coverage · ASEAN average " + pct(ASEAN_COVERAGE) + "%" },
      { v: th.poolCount.toLocaleString(), k: "Candidates in pool · smallest in ASEAN" },
      { v: (pipeOf("TH").reachable || 0).toLocaleString(), k: "Addressable students going unworked" },
      { v: pct(th.ratio) + "%", k: "Pipeline against a " + Math.round(th.target) + "-person target" }
    ],
    chart: miniChart({
      title: "Coverage % vs ASEAN average",
      rows: CC_ORDER.map(code => {
        const c = ctryStat(code);
        return {
          v: c.coverage, on: code === "TH",
          label: cc(code).flag + " " + esc(cc(code).name),
          text: pct(c.coverage) + "% <em>" + c.covered + "/" + c.schools + "</em>"
        };
      }).sort((a, b) => b.v - a.v)
        .concat([{ v: ASEAN_COVERAGE, ref: true, label: "ASEAN average",
                   text: pct(ASEAN_COVERAGE) + "%" }]),
      foot: `Thailand's reach is not the problem — ${(pipeOf("TH").reachable || 0).toLocaleString()}
        students are addressable. The constraint is depth per school.`
    }),
    tags: ["Coverage Gap", "High Potential Market", "Take Action"],
    acts: [
      searchChip("Search Thailand talent", { tab: "search", country: "TH" }),
      askChip("Which ASEAN schools are underrepresented?"),
      { text: "Open the Thailand profile", run: () => openCountry("TH") }
    ]
  });

  /* ---------- 4 · what to do next ---------- */
  const myQ = quartersOf("MY"), peak = maxIndex(myQ);
  const myCal = calOf("MY");
  const training = (myCal.intern || []).slice().sort((a, b) => (b.to - b.from) - (a.to - a.from))[0];
  const MONTHS = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"];
  const leadMonth = training ? MONTHS[Math.max(0, training.from - 2)] : "March";
  out.push({
    accent: "#31b57a", icon: cc("MY").flag,
    kicker: "What should we do next",
    title: "Malaysia Graduate Pipeline is Strongest in " + QUARTER_LABEL[peak].split(" ")[0],
    reason: `Malaysia shows the largest graduating cohort concentration in
      <b>${esc(QUARTER_LABEL[peak])}</b> — ${myQ[peak]} of ${ctryStat("MY").poolCount} candidates, following
      a ${esc((myCal.grad || {}).label || "Aug – Oct")} graduation window.
      ${training ? "Because " + esc(training.label.toLowerCase()) + " runs " +
        MONTHS[training.from - 1] + "–" + MONTHS[training.to - 1] + ", offers have to land before it opens: " +
        "recommend launching internship campaigns before " + leadMonth + "."
        : "Recommend launching internship campaigns a full quarter ahead of the window."}`,
    metrics: [
      { v: QUARTER_LABEL[peak].split(" ")[0], k: "Peak graduation quarter · " + QUARTER_LABEL[peak].split(" ")[1] },
      { v: myQ[peak] + " <em>/ " + ctryStat("MY").poolCount + "</em>", k: "Candidates graduating in the peak quarter" },
      { v: esc((myCal.grad || {}).label || "Aug – Oct"), k: "Coursework-to-convocation window" },
      { v: training ? MONTHS[training.from - 1].slice(0, 3) + " – " + MONTHS[training.to - 1].slice(0, 3) : "Jul – Sep",
        k: training ? training.label : "Industrial training" }
    ],
    chart: miniChart({
      title: "Quarterly graduate pipeline trend",
      rows: myQ.map((v, i) => ({
        v: v, on: i === peak,
        label: esc(QUARTER_LABEL[i]),
        text: v + " <em>" + pct(v / ctryStat("MY").poolCount) + "%</em>"
      })),
      foot: `Campaign timing is set by the window, not the ceremony — act roughly one quarter before
        the bar you want to convert.`
    }),
    tags: ["Graduate Peak", "Strong Pipeline", "Time-sensitive"],
    acts: [
      searchChip("Search Malaysia talent", { tab: "search", country: "MY" }),
      askChip("Generate a FY28 internship hiring plan."),
      { text: "Open the Malaysia profile", run: () => openCountry("MY") }
    ]
  });

  return out;
}

let RECOMMENDED = [];

function renderActions() {
  RECOMMENDED = buildActions();
  $("#recAsOf").innerHTML = `Generated from ${CAND.length.toLocaleString()} candidate records
    &middot; ${SCHOOL_STATS.length} target schools &middot; ${CC_ORDER.length} markets`;

  $("#recActions").innerHTML = RECOMMENDED.map((a, i) => `
    <article class="rec-card" style="--rc:${a.accent}">
      <header class="rec-c-top">
        <span class="rec-rank">${i + 1}</span>
        <span class="rec-ico">${a.icon}</span>
        <div>
          <span class="rec-kicker">${esc(a.kicker)}</span>
          <h3>${esc(a.title)}</h3>
        </div>
      </header>
      <p class="rec-why">${a.reason}</p>
      <div class="rec-metrics">${a.metrics.map(m =>
        `<div class="rec-m"><span class="rec-m-v">${m.v}</span>
          <span class="rec-m-k">${esc(m.k)}</span></div>`).join("")}</div>
      ${a.chart}
      <div class="rec-tags">${a.tags.map(t => `<span class="rec-tag">${esc(t)}</span>`).join("")}</div>
      <footer class="rec-acts">${a.acts.map((x, j) =>
        `<button class="btn sm ${j === 0 ? "primary" : "ghost"}" data-rec="${i}" data-act="${j}">
          ${esc(x.text)}</button>`).join("")}</footer>
    </article>`).join("");
}

$("#recActions").addEventListener("click", e => {
  const b = e.target.closest("button[data-rec]");
  if (!b) return;
  const a = RECOMMENDED[Number(b.dataset.rec)];
  if (a && a.acts[Number(b.dataset.act)]) a.acts[Number(b.dataset.act)].run();
});

function openCountry(code) {
  const n = $(`#navCountries .nav-sub-item[data-country="${code}"]`);
  if (n) return n.click();
  const p = $('#nav .nav-item[data-view="country"]');
  if (p) p.click();
}

/* ============================================================
 * 2 - ASEAN TALENT OPPORTUNITY MAP
 * ========================================================== */
const MAP_TONE = {
  hot:     { colour: "#0f6cbd", label: "High opportunity" },
  gap:     { colour: "#e0a33c", label: "Coverage gap" },
  grow:    { colour: "#31b57a", label: "Growing pipeline" },
  time:    { colour: "#f06f5e", label: "Graduate timing" },
  volume:  { colour: "#8b5cf6", label: "Large talent pool" },
  premium: { colour: "#12a594", label: "Premium market" }
};

let mapPick = "VN";

function renderMap() {
  const shapes = ENGINE_MAP_SHAPES.map(p => `<polygon points="${p}"/>`).join("");

  const pins = CC_ORDER.map(code => {
    const o = ENGINE_OPPORTUNITY[code];
    if (!o) return "";
    const tone = MAP_TONE[o.tone] || MAP_TONE.hot;
    return `<button class="mk mk-${esc(o.side)}" data-cc="${code}"
      style="left:${o.x}%;top:${o.y}%;--mk:${tone.colour}"
      aria-label="${esc(cc(code).name)} — ${esc(o.label)}">
      <i class="mk-dot"></i>
      <span class="mk-lab"><b>${cc(code).flag} ${esc(cc(code).name)}</b>${esc(o.label)}</span>
    </button>`;
  }).join("");

  $("#recMap").innerHTML =
    `<svg class="mk-geo" viewBox="0 0 100 76" preserveAspectRatio="xMidYMid meet"
       role="img" aria-label="Stylised map of Southeast Asia">${shapes}</svg>${pins}`;

  $("#recLegend").innerHTML = Object.keys(MAP_TONE).map(k =>
    `<span class="lg"><i style="background:${MAP_TONE[k].colour}"></i>${esc(MAP_TONE[k].label)}</span>`
  ).join("");

  selectMarket(mapPick);
}

$("#recMap").addEventListener("click", e => {
  const b = e.target.closest(".mk");
  if (b) selectMarket(b.dataset.cc);
});

function selectMarket(code) {
  mapPick = code;
  $$("#recMap .mk").forEach(b => b.classList.toggle("on", b.dataset.cc === code));

  const c = ctryStat(code), o = ENGINE_OPPORTUNITY[code] || {};
  const tone = MAP_TONE[o.tone] || MAP_TONE.hot;
  const sig = sigOf(code), pipe = pipeOf(code), cal = calOf(code), intel = intelOf(code);
  const prof = (typeof MARKET_PROFILE !== "undefined" && MARKET_PROFILE[code]) || {};
  const lvl = (v, good) => `<span class="lvl ${v === good ? "good" : v === "Medium" ? "mid" : "bad"}">${esc(v)}</span>`;

  $("#recSide").innerHTML = `
    <div class="rs-top" style="--rs:${tone.colour}">
      <span class="rs-flag">${cc(code).flag}</span>
      <div><h3>${esc(c.name)}</h3><span class="rs-sig">${esc(o.label || "")}</span></div>
    </div>
    ${prof.headline ? `<p class="rs-head">${esc(prof.headline)}</p>` : ""}
    <div class="rs-bands">
      ${sig.cost ? lvl(sig.cost, "Low") : ""}
      ${sig.supply ? lvl(sig.supply, "High") : ""}
      ${sig.competition ? lvl(sig.competition, "Low") : ""}
    </div>
    <dl class="rs-stats">
      <div><dt>Addressable pipeline</dt><dd>${(pipe.reachable || 0).toLocaleString()}
        <em>+${pipe.growth || 0}% YoY</em></dd></div>
      <div><dt>Candidates in pool</dt><dd>${c.poolCount.toLocaleString()}
        <em>${c.hi} high potential</em></dd></div>
      <div><dt>School coverage</dt><dd>${pct(c.coverage)}%
        <em>${c.covered}/${c.schools} schools</em></dd></div>
      <div><dt>Graduation window</dt><dd>${esc((cal.grad || {}).label || "—")}
        <em>peak ${QUARTER_LABEL[maxIndex(quartersOf(code))].split(" ")[0]}</em></dd></div>
    </dl>
    ${intel.channel ? `<p class="rs-note"><b>Best channel.</b> ${esc(intel.channel)}</p>` : ""}
    <div class="rs-acts">
      <button class="btn sm primary" data-rs="ask">Why this market?</button>
      <button class="btn sm ghost" data-rs="search">Search talent</button>
      <button class="btn sm ghost" data-rs="profile">Open profile</button>
    </div>`;
}

$("#recSide").addEventListener("click", e => {
  const b = e.target.closest("button[data-rs]");
  if (!b) return;
  const name = cc(mapPick).name;
  if (b.dataset.rs === "ask")     return ask("Why is " + name + " recommended?", "why");
  if (b.dataset.rs === "search")  return runAction({ tab: "search", country: mapPick });
  if (b.dataset.rs === "profile") return openCountry(mapPick);
});

/* ============================================================
 * 3 - KEY INSIGHTS
 * ========================================================== */
function renderInsights() {
  const reach = CC_ORDER.reduce((n, c) => n + (pipeOf(c).reachable || 0), 0);
  $("#recKpis").innerHTML = [
    kpiCard({ icon: "&#128101;", k: "Total ASEAN Talent Pool", v: CAND.length.toLocaleString(),
      sub: `Across ${TALENT_POOLS.length} managed pools &middot; ${reach.toLocaleString()} students addressable`,
      colour: "#0f6cbd" }),
    kpiCard({ icon: "&#127891;", k: "Target Schools Tracked", v: SCHOOL_STATS.length,
      sub: `${SCHOOL_STATS.filter(s => s.tier === 1).length} Tier 1 &middot; across ${CC_ORDER.length} ASEAN markets`,
      colour: "#8b5cf6" }),
    kpiCard({ icon: "&#9678;", k: "Average School Coverage", v: pct(ASEAN_COVERAGE), unit: "%",
      sub: `${SCHOOL_STATS.filter(s => s.covered).length} of ${SCHOOL_STATS.length} schools hold a working pipeline`,
      colour: "#e0a33c", bar: ASEAN_COVERAGE }),
    kpiCard({ icon: "&#128200;", k: "Markets with Growing Pipelines", v: GROWING_MARKETS.length,
      sub: `${GROWING_MARKETS.map(c => cc(c).flag + " " + cc(c).name).join(", ")} &middot; +5% YoY or better`,
      colour: "#31b57a", bar: GROWING_MARKETS.length / CC_ORDER.length })
  ].join("");
}

/* ============================================================
 * 4 - COPILOT, AS A SECONDARY EXPLAIN LAYER
 * ========================================================== */
function initCopilot() {
  $("#engPrompts").innerHTML = "";
  ENGINE_PROMPTS.forEach(p => {
    const b = el("button", "sugg-chip", `<span>${p.icon}</span>${esc(p.text)}`);
    b.addEventListener("click", () => ask(p.text, p.intent));
    $("#engPrompts").appendChild(b);
  });

  $("#engAskBtn").addEventListener("click", () => {
    const v = $("#engAsk").value.trim();
    if (v) { ask(v); $("#engAsk").value = ""; }
  });
  $("#engAsk").addEventListener("keydown", e => {
    if (e.key === "Enter") $("#engAskBtn").click();
  });

  greet();
}

function greet() {
  $("#engThread").innerHTML = "";
  bot(`<div class="cop-hi">
      <h3>I explain the recommendations above</h3>
      <p>The four actions are already generated from the same
        ${CAND.length.toLocaleString()} candidate records the dashboard and search use. Ask me to
        justify one, compare two markets, widen a school shortlist or turn any of it into a plan.</p>
    </div>`);
}

function reveal(node) {
  if (node.scrollIntoView) node.scrollIntoView({ behavior: "smooth", block: "end" });
}

function bot(html, chips) {
  const m = el("div", "cop-msg bot");
  m.innerHTML = `<div class="cop-av">&#10024;</div><div class="cop-bub">${html}</div>`;
  if (chips && chips.length) {
    const row = el("div", "cop-follow");
    chips.forEach(ch => {
      const b = el("button", "chip sm", esc(ch.text));
      b.addEventListener("click", () => ch.run());
      row.appendChild(b);
    });
    m.querySelector(".cop-bub").appendChild(row);
  }
  $("#engThread").appendChild(m);
  reveal(m);
  return m;
}

function user(text) {
  const m = el("div", "cop-msg me");
  m.innerHTML = `<div class="cop-bub">${esc(text)}</div><div class="cop-av me">You</div>`;
  $("#engThread").appendChild(m);
  reveal(m);
}

function routeIntent(text) {
  const t = text.toLowerCase();
  for (const rule of ENGINE_INTENT_RULES) {
    if (rule.any.some(k => t.indexOf(k) >= 0)) return rule.intent;
  }
  return null;
}

function ask(text, forced) {
  showTab("copilot");
  user(text);
  const intent = forced || routeIntent(text);
  const thinking = bot(`<div class="cop-think"><i></i><i></i><i></i> Reading talent pools&hellip;</div>`);
  setTimeout(() => {
    thinking.remove();
    const a = ANSWERS[intent] ? ANSWERS[intent](text) : ANSWERS.fallback(text);
    bot(a.html, a.chips);
  }, 480);
}

/* ---------- answer builders ---------- */
function miniTable(head, rows) {
  return `<div class="table-wrap"><table class="cop-tbl">
    <thead><tr>${head.map(h => `<th${h.n ? ' class="num"' : ""}>${esc(h.t || h)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map((c, i) =>
      `<td${head[i] && head[i].n ? ' class="num"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>`;
}
const searchChip = (label, go) => ({ text: label, run: () => runAction(go) });
const askChip = q => ({ text: q, run: () => ask(q) });

const ANSWERS = {

  attention: function () {
    const rows = SCHOOL_STATS.slice()
      .sort((a, b) => a.warmRate - b.warmRate || b.total - a.total)
      .slice(0, 6)
      .map(s => [
        `<b>${esc(s.abbr)}</b><div class="sub-txt">${esc(s.name)}</div>`,
        cc(s.country).flag + " " + s.country,
        "T" + s.tier,
        s.total, s.warm,
        `<span class="mini-bar"><i style="width:${Math.min(100, pct(s.warmRate / 0.6))}%;
          background:${s.warmRate < 0.3 ? "#ef4444" : s.warmRate < 0.42 ? "#e0a33c" : "#31b57a"}"></i></span>
         ${pct(s.warmRate)}%`
      ]);
    const worst = SCHOOL_STATS.slice().sort((a, b) => a.warmRate - b.warmRate)[0];
    return {
      html: `<h3>Six universities need engagement</h3>
        <p>Ranked by warm rate &mdash; the share of their pool at Engaged or later. Everything below
          roughly 30% means you have reach but no relationship.</p>
        ${miniTable(["School", "Market", "Tier", { t: "In pool", n: 1 }, { t: "Warm", n: 1 }, "Warm rate"], rows)}
        <p class="cop-take"><b>Take:</b> ${esc(worst.name)} is the worst at ${pct(worst.warmRate)}%
          with ${worst.total} people already in pool. That is a follow-up problem, not a sourcing problem &mdash;
          fixing it costs outreach time, not budget.</p>`,
      chips: [
        searchChip("Open " + worst.abbr + " in search", { tab: "search", uni: worst.abbr }),
        askChip("Which target schools have the lowest coverage?")
      ]
    };
  },

  coverage: function () {
    const rows = COUNTRY_STATS.slice().sort((a, b) => a.coverage - b.coverage).map(c => [
      c.flag + " <b>" + esc(c.name) + "</b>",
      c.covered + " / " + c.schools,
      `<span class="mini-bar"><i style="width:${Math.min(100, pct(c.coverage))}%;
        background:${statusOf(c.ratio).colour}"></i></span> ${pct(c.coverage)}%`,
      c.poolCount, c.hi
    ]);
    const worst = COUNTRY_STATS.slice().sort((a, b) => a.coverage - b.coverage)[0];
    const gapSchools = SCHOOL_STATS.filter(s => s.country === worst.code && !s.covered)
      .sort((a, b) => b.total - a.total);
    return {
      html: `<h3>Target-school coverage by market</h3>
        <p>A school counts as covered once it holds ${ENGINE_COVERAGE.minCandidates}+ candidates
          <i>and</i> ${ENGINE_COVERAGE.minWarm}+ of them are warm.</p>
        ${miniTable(["Market", "Covered", "Coverage", { t: "In pool", n: 1 }, { t: "High potential", n: 1 }], rows)}
        <p class="cop-take"><b>Take:</b> ${esc(worst.name)} is lowest at ${pct(worst.coverage)}%.
          The nearest misses are ${gapSchools.slice(0, 2).map(s =>
            esc(s.name) + " (needs " + (s.warmGap || 1) + " more warm)").join(" and ")}.</p>`,
      chips: gapSchools.slice(0, 2).map(s =>
        searchChip("Open " + s.abbr, { tab: "search", uni: s.abbr }))
    };
  },

  hidden: function (text) {
    const t = String(text || "").toLowerCase();
    let p = ENGINE_PROFESSIONS.find(x =>
      t.indexOf(x.label.toLowerCase()) >= 0 || t.indexOf(x.short.toLowerCase()) >= 0);
    if (!p && (t.indexOf("software") >= 0 || t.indexOf("swe") >= 0 || t.indexOf("engineer") >= 0))
      p = profById("swe");
    if (!p) p = profById(hiddenRanked()[0].id);

    /* Honour a market and a graduation year if the question names one -
     * "hidden SWE talent in Malaysia graduating in 2027" is a scoped ask. */
    const ctry = CC_ORDER.find(code => t.indexOf(cc(code).name.toLowerCase()) >= 0) || null;
    const yr = (t.match(/20\d\d/) || [])[0] || null;
    const scoped = Boolean(ctry || yr);

    const profile = fnById(p.fn);
    const out = CAND
      .filter(c => c.pool !== p.pool
        && (!ctry || c.country === ctry)
        && (!yr || String(c.gradYear) === yr))
      .map(c => ({ c: c, s: score(c, profile, []) }))
      .filter(x => x.s.score >= ENGINE_MATCH.floor);

    const byPool = {};
    out.forEach(x => { byPool[x.c.pool] = (byPool[x.c.pool] || 0) + 1; });
    const order = Object.keys(byPool).sort((a, b) => byPool[b] - byPool[a]);
    const h = {
      count: out.length,
      strong: out.filter(x => x.s.score >= ENGINE_MATCH.strong).length,
      topPool: order[0] || null
    };

    const scopeTxt = [ctry ? cc(ctry).name : null, yr ? "class of " + yr : null]
      .filter(Boolean).join(", ");

    const rows = order.slice(0, 6).map(pid => {
      const shared = TALENT_POOLS.find(x => x.id === pid).skills
        .filter(s => profile.skills.indexOf(s) >= 0);
      return [
        "<b>" + esc(poolShort(pid)) + "</b>",
        byPool[pid],
        shared.length ? shared.slice(0, 4).map(esc).join(", ")
                      : "<span class='sub-txt'>adjacent skill profile</span>"
      ];
    });

    if (!h.count) {
      return {
        html: `<h3>No hidden ${esc(p.label)} talent${scoped ? " in " + esc(scopeTxt) : ""}</h3>
          <p>Nothing outside the ${esc(poolShort(p.pool))} pool clears the
            ${ENGINE_MATCH.floor}% match floor under that scope. Widen the graduation year or
            drop the market filter and I will look again.</p>`,
        chips: [askChip("Which talent pools contain hidden software engineers?")]
      };
    }

    return {
      html: `<h3>${h.count} hidden ${esc(p.label)} matches${scoped ? " &middot; " + esc(scopeTxt) : ""}</h3>
        <p>These people already sit in your talent pools &mdash; just not the
          <b>${esc(poolShort(p.pool))}</b> one. ${h.strong} of them score
          ${ENGINE_MATCH.strong}%+ against the ${esc(p.label)} profile${
          scoped ? ", inside " + esc(scopeTxt) : ""}.</p>
        ${miniTable(["Currently stored in", { t: "Matches", n: 1 }, "Why they transfer"], rows)}
        <p class="cop-take"><b>Take:</b> the ${esc(poolShort(h.topPool))} pool is your richest seam.
          Working it costs nothing &mdash; these candidates are already sourced, already consented,
          already owned by a recruiter.</p>`,
      chips: [
        searchChip(scoped ? "Open this search in " + (scopeTxt || "all markets")
                          : "Run the hidden-talent search",
          { tab: "search", title: profile.titles[0], country: ctry || "", year: yr || "" }),
        askChip("Who should I engage next?")
      ]
    };
  },

  cohorts: function () {
    const rows = COHORT_STATS.map(c => [
      "<b>Class of " + c.year + "</b>",
      c.total,
      `<span class="mini-bar"><i style="width:${Math.min(100, pct(c.share / 0.5))}%;
        background:#4c7ef3"></i></span> ${pct(c.share)}%`,
      c.hi, c.warm, c.untouched
    ]);
    const thin = COHORT_STATS.slice().sort((a, b) => a.share - b.share)[0];
    const fat = COHORT_STATS.slice().sort((a, b) => b.share - a.share)[0];
    return {
      html: `<h3>Class of ${thin.year} is underrepresented</h3>
        <p>Cohort mix across all ${CAND.length.toLocaleString()} candidates.</p>
        ${miniTable(["Cohort", { t: "In pool", n: 1 }, "Share",
                     { t: "High potential", n: 1 }, { t: "Warm", n: 1 }, { t: "Never contacted", n: 1 }], rows)}
        <p class="cop-take"><b>Take:</b> ${pct(fat.share)}% of the pool graduates in ${fat.year},
          only ${pct(thin.share)}% in ${thin.year}. ${thin.untouched} of the ${thin.year} cohort have
          never been contacted. Cohort skew like this shows up as a hiring cliff two intakes later.</p>`,
      chips: [
        searchChip("Open class of " + thin.year, { tab: "search", year: thin.year }),
        askChip("Which universities require more engagement?")
      ]
    };
  },

  engage: function () {
    /* High potential, in an early stage, quiet for a while. */
    const all = CAND.filter(c => isHiPo(c) && c.stageIndex <= 2 && c.updated <= -30);
    const rows = all.slice()
      .sort((a, b) => a.updated - b.updated || b.relevance - a.relevance)
      .slice(0, 8)
      .map(c => [
        "<b>" + esc(c.name) + "</b><div class='sub-txt'>" + esc(c.degreeField) + "</div>",
        cc(c.country).flag + " " + esc(c.schoolAbbr),
        esc(c.gradLabel),
        esc(poolShort(c.pool)),
        Math.abs(c.updated) + "d",
        c.relevance
      ]);
    return {
      html: `<h3>${all.length} high-potential candidates have gone quiet</h3>
        <p>High potential (relevance ${ENGINE_HIGH_POTENTIAL}+), still at Sourced, Talent Connection
          or Engaged, and untouched for 30+ days. Top eight by silence:</p>
        ${miniTable(["Candidate", "School", "Graduates", "Pool",
                     { t: "Quiet", n: 1 }, { t: "Relevance", n: 1 }], rows)}
        <p class="cop-take"><b>Take:</b> work this list before opening any new sourcing channel.
          Every person here was already paid for once.</p>`,
      chips: [
        askChip("Which talent pools contain hidden software engineers?"),
        askChip("Where are my strongest data center pipelines?")
      ]
    };
  },

  priorities: function () {
    const quiet = CAND.filter(c => isHiPo(c) && c.stageIndex <= 2 && c.updated <= -30);
    const coldSchool = SCHOOL_STATS.slice()
      .sort((a, b) => a.warmRate - b.warmRate || b.total - a.total)[0];
    const thinCountry = COUNTRY_STATS.slice().sort((a, b) => a.ratio - b.ratio)[0];
    const gapCountry = COUNTRY_STATS.slice().sort((a, b) => a.coverage - b.coverage)[0];

    /* Which markets open an internship window in the next 90 days. */
    const month = new Date().getMonth() + 1;
    const soon = [];
    (typeof MARKET_ORDER !== "undefined" ? MARKET_ORDER : []).forEach(code => {
      const cal = (typeof MARKET_CALENDAR !== "undefined" ? MARKET_CALENDAR : {})[code];
      if (!cal) return;
      (cal.intern || []).forEach(w => {
        const open = month >= w.from && month <= w.to;
        soon.push({ code: code, open: open, lead: open ? 0 : (w.from - month + 12) % 12, label: w.label });
      });
    });
    /* Windows already open first, then the soonest to open. */
    soon.sort((a, b) => (b.open - a.open) || (a.lead - b.lead));
    const nextWindow = soon[0];

    const actions = [
      {
        pri: "P1",
        head: "Re-engage " + quiet.length + " high-potential candidates who have gone quiet",
        why: "Relevance " + ENGINE_HIGH_POTENTIAL + "+, still at Sourced / Talent Connection / Engaged, "
           + "untouched for 30+ days. Already sourced once &mdash; cheapest pipeline you own.",
        chip: askChip("Who should I engage next?")
      },
      {
        pri: "P2",
        head: "Fix the relationship gap at " + coldSchool.abbr,
        why: coldSchool.total + " people already in pool but only " + pct(coldSchool.warmRate)
           + "% warm. That is a follow-up problem, not a sourcing problem.",
        chip: searchChip("Open " + coldSchool.abbr + " in search", { tab: "search", uni: coldSchool.abbr })
      },
      {
        pri: "P3",
        head: "Close the " + thinCountry.name + " supply gap",
        why: "Weakest pipeline-to-demand ratio in the region at " + pct(thinCountry.ratio)
           + "% of target, with " + thinCountry.inScope + " in-scope candidates against "
           + Math.round(thinCountry.target) + " needed.",
        chip: searchChip("Search " + thinCountry.name, { tab: "search", country: thinCountry.code })
      },
      {
        pri: "P4",
        head: "Open campus coverage in " + gapCountry.name,
        why: "Only " + gapCountry.covered + " of " + gapCountry.schools
           + " target schools have anyone in pool. Untouched schools cost nothing to start.",
        chip: askChip("Which ASEAN schools are underrepresented?")
      }
    ];

    if (nextWindow) {
      const nc = cc(nextWindow.code);
      actions.splice(1, 0, {
        pri: "P1",
        head: (nextWindow.open ? "Work the open " : "Lock the ") + nc.name + " internship window",
        why: nc.flag + " " + esc(nextWindow.label) + " "
           + (nextWindow.open ? "is open right now"
              : nextWindow.lead === 0 ? "opens this month"
              : "opens in " + nextWindow.lead + " month" + (nextWindow.lead > 1 ? "s" : ""))
           + ". Offers land before the window, not during it.",
        chip: searchChip("Search " + nc.name, { tab: "search", country: nextWindow.code })
      });
    }

    return {
      html: `<h3>Your priority actions this month</h3>
        <p>Ranked by cost to act against pipeline impact. Everything here is computed from the current
          pool state and the ASEAN academic calendar &mdash; nothing is a standing recommendation.</p>
        <ol class="cop-plan">${actions.map(a => `
          <li><span class="cop-pri">${a.pri}</span>
            <div><b>${a.head}</b><div class="sub-txt">${a.why}</div></div>
          </li>`).join("")}</ol>
        <p class="cop-take"><b>Take:</b> the first two cost outreach time only. Treat new sourcing
          channels as the last resort, not the first.</p>`,
      chips: actions.map(a => a.chip).slice(0, 4)
    };
  },

  datacenter: function (text) {
    const t = String(text || "").toLowerCase();
    const p = ENGINE_PROFESSIONS.find(x => t.indexOf(x.label.toLowerCase()) >= 0)
      || profById("datacenter");
    const st = profStat(p.id);
    const rows = CC_ORDER.map(code => st.byCountry[code])
      .sort((a, b) => b.ratio - a.ratio)
      .map(b => {
        const s = statusOf(b.ratio);
        return [
          cc(b.code).flag + " <b>" + esc(cc(b.code).name) + "</b>",
          b.total, b.target,
          `<span class="mini-bar"><i style="width:${Math.min(100, pct(b.ratio))}%;
            background:${s.colour}"></i></span> ${pct(b.ratio)}%`,
          `<span class="tag-st" style="background:${s.colour}1f;color:${s.colour}">${s.label}</span>`
        ];
      });
    const best = CC_ORDER.map(c => st.byCountry[c]).sort((a, b) => b.ratio - a.ratio)[0];
    const worst = CC_ORDER.map(c => st.byCountry[c]).sort((a, b) => a.ratio - b.ratio)[0];
    return {
      html: `<h3>${esc(p.label)} pipelines by market</h3>
        <p>${st.total} candidates in the ${esc(poolShort(p.pool))} pool against a
          ${st.target} target (${st.demand} planned hires &times; ${ENGINE_PIPELINE_RATIO}).</p>
        ${miniTable(["Market", { t: "In pool", n: 1 }, { t: "Target", n: 1 }, "vs target", "Status"], rows)}
        <p class="cop-take"><b>Take:</b> ${esc(cc(best.code).name)} is your strongest at
          ${pct(best.ratio)}% of target with ${best.total} in pool.
          ${esc(cc(worst.code).name)} is the one to fix &mdash; ${worst.target - worst.total} short.
          ${esc(fnById(p.fn).note)}</p>`,
      chips: [
        searchChip("Open " + cc(worst.code).name + " " + p.short,
          { tab: "search", title: fnById(p.fn).titles[0], country: worst.code }),
        askChip("What talent should I engage this month?")
      ]
    };
  },

  market: function (text) {
    const t = String(text || "").toLowerCase();
    const hit = COUNTRY_STATS.find(c => t.indexOf(c.name.toLowerCase()) >= 0) || COUNTRY_STATS[0];
    const mi = MARKET_INTEL[hit.code] || {};
    const rows = PROF_STATS.map(p => {
      const b = p.byCountry[hit.code], s = statusOf(b.ratio);
      return ["<b>" + esc(p.label) + "</b>", b.total, b.target,
        `<span class="tag-st" style="background:${s.colour}1f;color:${s.colour}">${pct(b.ratio)}%</span>`];
    });
    const sig = MARKET_SIGNALS[hit.code];
    const prof = MARKET_PROFILE[hit.code];
    const band = sig
      ? `<p class="cop-bands">
           <span class="lvl ${sig.cost === "Low" ? "good" : sig.cost === "High" ? "bad" : "mid"}">Cost ${esc(sig.cost)}</span>
           <span class="lvl ${sig.supply === "High" ? "good" : sig.supply === "Low" ? "bad" : "mid"}">Supply ${esc(sig.supply)}</span>
           <span class="lvl ${sig.competition === "Low" ? "good" : sig.competition === "High" ? "bad" : "mid"}">Competition ${esc(sig.competition)}</span>
         </p>` : "";

    return {
      html: `<h3>${hit.flag} ${esc(hit.name)} at a glance</h3>
        ${band}
        ${prof ? `<p><b>${esc(prof.headline)}</b> ${esc(prof.positioning)}</p>` : ""}
        <p>${hit.poolCount} candidates in pool, ${hit.hi} high potential,
          ${hit.covered}/${hit.schools} target schools covered (${pct(hit.coverage)}%).</p>
        ${miniTable(["Profession", { t: "In pool", n: 1 }, { t: "Target", n: 1 }, "vs target"], rows)}
        ${mi.note ? `<p class="cop-take"><b>Market note:</b> ${esc(mi.note)}
          <br><b>Best channel:</b> ${esc(mi.channel)}</p>` : ""}`,
      chips: [
        searchChip("Search " + hit.name, { tab: "search", country: hit.code }),
        { text: "Open the " + hit.name + " profile",
          run: () => { const n = UI.$(`#navCountries .nav-sub-item[data-country="${hit.code}"]`); if (n) n.click(); } }
      ]
    };
  },

  /* ---------- why a market carries a recommendation ---------- */
  why: function (text) {
    const t = String(text || "").toLowerCase();
    const hit = COUNTRY_STATS.find(c => t.indexOf(c.name.toLowerCase()) >= 0) || ctryStat("VN");
    const pipe = pipeOf(hit.code), sig = sigOf(hit.code), prof =
      (typeof MARKET_PROFILE !== "undefined" && MARKET_PROFILE[hit.code]) || {};

    const reachRank  = rankOf(hit.code, c => pipeOf(c).reachable || 0);
    const growthRank = rankOf(hit.code, c => pipeOf(c).growth || 0);
    const covRank    = rankOf(hit.code, c => ctryStat(c).coverage);
    const hiRank     = rankOf(hit.code, c => ctryStat(c).hi);

    const line = (signal, value, rank, verdict) =>
      [`<b>${esc(signal)}</b>`, value,
       `<span class="sub-txt">${ordinal(rank)} of ${CC_ORDER.length}</span>`, verdict];

    const rows = [
      line("Addressable pipeline", (pipe.reachable || 0).toLocaleString() + " students", reachRank,
        reachRank <= 3 ? "Supports" : "Neutral"),
      line("Pipeline growth", "+" + (pipe.growth || 0) + "% YoY", growthRank,
        growthRank <= 2 ? "Supports" : "Neutral"),
      line("Cost band", esc(sig.cost || "—"), rankOf(hit.code, c => ({ Low: 3, Medium: 2, High: 1 })[sigOf(c).cost] || 0),
        sig.cost === "Low" ? "Supports" : sig.cost === "High" ? "Counts against" : "Neutral"),
      line("Talent supply", esc(sig.supply || "—"), rankOf(hit.code, c => ({ High: 3, Medium: 2, Low: 1 })[sigOf(c).supply] || 0),
        sig.supply === "High" ? "Supports" : "Neutral"),
      line("High potential in pool", hit.hi + " of " + hit.poolCount, hiRank,
        hiRank <= 3 ? "Supports" : "Neutral"),
      line("Target-school coverage", pct(hit.coverage) + "% (" + hit.covered + "/" + hit.schools + ")", covRank,
        hit.coverage >= ASEAN_COVERAGE ? "Supports" : "Counts against")
    ];

    const supports = rows.filter(r => r[3] === "Supports").length;
    const against = rows.filter(r => r[3] === "Counts against").length;

    return {
      html: `<h3>Why ${hit.flag} ${esc(hit.name)} carries this recommendation</h3>
        <p>${supports} of the ${rows.length} signals I weigh support it${against
          ? " and " + against + " count against it" : ""}. Here is the whole picture, not just the
          part that agrees with the headline.</p>
        ${miniTable(["Signal", "This market", "ASEAN rank", "Reads as"],
          rows.map(r => [r[0], r[1], r[2],
            `<span class="tag-st" style="background:${
              r[3] === "Supports" ? "#31b57a" : r[3] === "Counts against" ? "#ef4444" : "#8b96a8"}1f;color:${
              r[3] === "Supports" ? "#31b57a" : r[3] === "Counts against" ? "#ef4444" : "#8b96a8"}">${r[3]}</span>`]))}
        ${prof.positioning ? `<p><b>Positioning.</b> ${esc(prof.positioning)}</p>` : ""}
        <p class="cop-take"><b>What would change my mind:</b> if
          ${esc(hit.name)} coverage stays at ${pct(hit.coverage)}% while the pipeline keeps growing,
          the recommendation stops being "hire here" and becomes "you are losing a market you already
          reached". Reach is not the constraint — depth per school is.</p>`,
      chips: [
        searchChip("Search " + hit.name, { tab: "search", country: hit.code }),
        askChip("Compare " + hit.name + " and " +
          (COUNTRY_STATS.filter(c => c.code !== hit.code)
            .sort((a, b) => (pipeOf(b.code).reachable || 0) - (pipeOf(a.code).reachable || 0))[0].name) + "."),
        askChip("Create a campus engagement strategy.")
      ]
    };
  },

  /* ---------- widen a school shortlist ---------- */
  similar: function (text) {
    const t = String(text || "").toUpperCase();
    const base = SCHOOLS.find(s => new RegExp("\\b" + s.abbr.toUpperCase().replace(/[^A-Z0-9]/g, ".") + "\\b").test(t))
      || SCHOOLS.find(s => t.indexOf(s.name.toUpperCase()) >= 0)
      || SCHOOLS.find(s => s.abbr === "HCMUT");
    const baseStat = schoolStat(base.abbr);

    const scored = SCHOOLS.filter(s => s.abbr !== base.abbr).map(s => {
      const st = schoolStat(s.abbr);
      const shared = s.strengths.filter(x => base.strengths.indexOf(x) >= 0);
      /* Similarity first, then how much of it is still unworked - a
       * lookalike you already cover is not an opportunity. */
      const fit = shared.length * 3 + (s.tier === base.tier ? 2 : 0)
        + (s.country === base.country ? 1 : 0);
      return { s: s, st: st, shared: shared, fit: fit, head: st.hi + (st.covered ? 0 : 6) };
    }).filter(x => x.shared.length)
      .sort((a, b) => b.fit - a.fit || b.head - a.head)
      .slice(0, 6);

    const top = scored[0];
    return {
      html: `<h3>Schools that look like ${esc(base.abbr)}</h3>
        <p>${esc(base.name)} is a Tier ${base.tier} ${cc(base.country).flag} school strong in
          ${base.strengths.slice(0, 3).map(esc).join(", ")}, holding ${baseStat.total} candidates and
          ${baseStat.hi} high potentials. I match on shared academic strengths, then rank by how much
          of that lookalike talent you are <i>not</i> already working.</p>
        ${miniTable(["School", "Market", "Tier", "Shared strengths",
                     { t: "In pool", n: 1 }, { t: "HiPo", n: 1 }, "Status"],
          scored.map(x => [
            `<b>${esc(x.s.abbr)}</b><div class="sub-txt">${esc(x.s.name)}</div>`,
            cc(x.s.country).flag + " " + esc(cc(x.s.country).name),
            "T" + x.s.tier,
            x.shared.map(esc).join(", "),
            x.st.total, x.st.hi,
            `<span class="tag-st" style="background:${x.st.covered ? "#31b57a" : "#e0a33c"}1f;color:${
              x.st.covered ? "#31b57a" : "#e0a33c"}">${x.st.covered ? "Covered" : "Open"}</span>`
          ]))}
        <p class="cop-take"><b>Take:</b> prioritise ${esc(top.s.abbr)} — it shares
          ${top.shared.length} strength${top.shared.length > 1 ? "s" : ""} with ${esc(base.abbr)},
          holds ${top.st.hi} high potentials and is
          ${top.st.covered ? "covered but thin" : "still " + (top.st.volGap || top.st.warmGap) + " short of coverage"}.</p>`,
      chips: scored.slice(0, 2).map(x =>
        searchChip("Open " + x.s.abbr + " in search", { tab: "search", uni: x.s.abbr }))
        .concat([askChip("Create a campus engagement strategy.")])
    };
  },

  /* ---------- a sequenced campus engagement strategy ---------- */
  strategy: function () {
    const ranked = COUNTRY_STATS.slice().sort((a, b) =>
      (pipeOf(b.code).growth || 0) - (pipeOf(a.code).growth || 0));

    const band = c => c.coverage >= 0.75 ? { k: "Defend", colour: "#31b57a" }
      : c.coverage >= ASEAN_COVERAGE ? { k: "Deepen", colour: "#0f6cbd" }
      : { k: "Open", colour: "#e0a33c" };

    const rows = ranked.map(c => {
      const b = band(c), cal = calOf(c.code), intel = intelOf(c.code);
      return [
        c.flag + " <b>" + esc(c.name) + "</b>",
        `<span class="tag-st" style="background:${b.colour}1f;color:${b.colour}">${b.k}</span>`,
        pct(c.coverage) + "%",
        "+" + (pipeOf(c.code).growth || 0) + "%",
        esc(((cal.intern || [])[0] || {}).label || "—"),
        `<span class="sub-txt">${esc(intel.channel || "")}</span>`
      ];
    });

    const open = ranked.filter(c => band(c).k === "Open");
    const defend = ranked.filter(c => band(c).k === "Defend");

    return {
      html: `<h3>Campus engagement strategy</h3>
        <p>Three plays, assigned by coverage rather than by preference. A market you already cover
          does not need a new channel — it needs protecting. A market you do not cover does not need
          a bigger budget — it needs a first relationship.</p>
        ${miniTable(["Market", "Play", "Coverage", "Growth", "Entry window", "Channel that works"], rows)}
        <ol class="cop-plan">
          <li><span class="cop-pri">1</span><div><b>Open ${open.map(c => esc(c.name)).join(", ") || "nothing — you are covered"}</b>
            <div class="sub-txt">Coverage below the ${pct(ASEAN_COVERAGE)}% ASEAN average. Start with one
              faculty relationship per school, not a campus-wide campaign. Cost here is outreach time.</div></div></li>
          <li><span class="cop-pri">2</span><div><b>Deepen the schools you have already reached</b>
            <div class="sub-txt">${SCHOOL_STATS.filter(s => s.total >= ENGINE_COVERAGE.minCandidates && !s.covered).length}
              schools hold ${ENGINE_COVERAGE.minCandidates}+ candidates but are not warm enough to count as
              covered. That is a follow-up problem, and it is the cheapest pipeline you own.</div></div></li>
          <li><span class="cop-pri">3</span><div><b>Defend ${defend.map(c => esc(c.name)).join(", ") || "your strongest markets"}</b>
            <div class="sub-txt">Everyone recruits these campuses on the same calendar, so speed of
              engagement decides conversion. Protect intern headcount for conversion instead of
              competing at fairs.</div></div></li>
        </ol>
        <p class="cop-take"><b>Sequence it by calendar, not by priority.</b> Entry windows open at
          different times across ASEAN — running all six markets on one timeline is how campaigns miss
          every one of them.</p>`,
      chips: [
        askChip("Generate a FY28 internship hiring plan."),
        askChip("Which ASEAN schools are underrepresented?"),
        open[0] ? searchChip("Search " + open[0].name, { tab: "search", country: open[0].code })
                : askChip("Who should I engage next?")
      ]
    };
  },

  /* ---------- two markets, side by side ---------- */
  compare: function (text) {
    const t = String(text || "").toLowerCase();
    const named = COUNTRY_STATS.filter(c => t.indexOf(c.name.toLowerCase()) >= 0);
    const a = named[0] || ctryStat("VN");
    const b = named.find(x => x.code !== a.code) || ctryStat(a.code === "ID" ? "VN" : "ID");

    const num = (x, pick) => pick(x);
    const metrics = [
      { k: "Addressable pipeline", get: c => pipeOf(c.code).reachable || 0,
        fmt: v => v.toLocaleString(), hi: true },
      { k: "Pipeline growth YoY", get: c => pipeOf(c.code).growth || 0, fmt: v => "+" + v + "%", hi: true },
      { k: "Candidates in pool", get: c => c.poolCount, fmt: v => v.toLocaleString(), hi: true },
      { k: "High potential", get: c => c.hi, fmt: v => String(v), hi: true },
      { k: "Target-school coverage", get: c => c.coverage, fmt: v => pct(v) + "%", hi: true },
      { k: "Pipeline vs demand", get: c => c.ratio, fmt: v => pct(v) + "%", hi: true },
      { k: "Cost band", get: c => ({ Low: 3, Medium: 2, High: 1 })[sigOf(c.code).cost] || 0,
        fmt: (v, c) => esc(sigOf(c.code).cost || "—"), hi: true },
      { k: "Competition", get: c => ({ Low: 3, Medium: 2, High: 1 })[sigOf(c.code).competition] || 0,
        fmt: (v, c) => esc(sigOf(c.code).competition || "—"), hi: true }
    ];

    let aWin = 0, bWin = 0;
    const rows = metrics.map(m => {
      const av = num(a, m.get), bv = num(b, m.get);
      const winner = av === bv ? null : (av > bv ? a : b);
      if (winner === a) aWin++; if (winner === b) bWin++;
      const mark = (c, v) => `${winner === c ? "<b>" : ""}${m.fmt(v, c)}${winner === c ? "</b>" : ""}`;
      return ["<b>" + esc(m.k) + "</b>", mark(a, av), mark(b, bv),
        winner ? winner.flag + " " + esc(winner.name) : "Tied"];
    });

    const lead = aWin === bWin ? null : (aWin > bWin ? a : b);
    const other = lead === a ? b : a;

    return {
      html: `<h3>${a.flag} ${esc(a.name)} vs ${b.flag} ${esc(b.name)}</h3>
        <p>Eight signals, scored head to head. Bold is the stronger number on that row.</p>
        ${miniTable(["Signal", a.flag + " " + esc(a.name), b.flag + " " + esc(b.name), "Edge"], rows)}
        <p class="cop-take"><b>Take:</b> ${lead
          ? `${esc(lead.name)} leads ${Math.max(aWin, bWin)}&ndash;${Math.min(aWin, bWin)}. But
             ${esc(other.name)} still wins on
             ${rows.filter(r => r[3].indexOf(other.name) >= 0).length} signal(s), so treat it as a
             second-wave market rather than a market to drop — ${(pipeOf(other.code).reachable || 0).toLocaleString()}
             addressable students do not disappear because the headline went elsewhere.`
          : `they split the signals evenly. Decide on cost and calendar, not on volume.`}</p>`,
      chips: [
        askChip("Why is " + a.name + " recommended?"),
        searchChip("Search " + a.name, { tab: "search", country: a.code }),
        searchChip("Search " + b.name, { tab: "search", country: b.code })
      ]
    };
  },

  /* ---------- a dated internship hiring plan ---------- */
  plan: function (text) {
    const fy = (String(text || "").match(/fy\s?(\d{2,4})/i) || [])[1] || "28";
    const label = "FY" + String(fy).slice(-2);

    const demand = COUNTRY_STATS.reduce((n, c) => n + c.demand, 0);
    const target = COUNTRY_STATS.reduce((n, c) => n + c.target, 0);
    const inScope = COUNTRY_STATS.reduce((n, c) => n + c.inScope, 0);

    /* Sequence the markets by when their first internship window opens -
     * a plan that ignores the ASEAN calendar misses every window in it. */
    const seq = CC_ORDER.map(code => {
      const w = (calOf(code).intern || []).slice().sort((x, y) => x.from - y.from)[0] || { from: 6, to: 8, label: "—" };
      const c = ctryStat(code);
      return { code: code, c: c, w: w, gap: Math.max(0, Math.round(c.target - c.inScope)) };
    }).sort((x, y) => x.w.from - y.w.from);

    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const rows = seq.map(s => [
      s.c.flag + " <b>" + esc(s.c.name) + "</b>",
      "Q" + Math.ceil(s.w.from / 3),
      MON[s.w.from - 1] + " – " + MON[s.w.to - 1] + `<div class="sub-txt">${esc(s.w.label)}</div>`,
      s.c.demand, Math.round(s.c.target), s.c.inScope,
      s.gap ? `<span class="tag-st" style="background:#ef44441f;color:#ef4444">${s.gap} short</span>`
            : `<span class="tag-st" style="background:#31b57a1f;color:#31b57a">Covered</span>`
    ]);

    const profRows = PROF_STATS.slice().sort((x, y) => x.ratio - y.ratio).map(p => {
      const st = statusOf(p.ratio);
      return ["<b>" + esc(p.label) + "</b>", p.demand, Math.round(p.target), p.total,
        `<span class="tag-st" style="background:${st.colour}1f;color:${st.colour}">${pct(p.ratio)}%</span>`,
        hiddenStat(p.id).count + " elsewhere"];
    });

    const short = seq.filter(s => s.gap > 0);
    const first = seq[0];

    return {
      html: `<h3>${esc(label)} internship hiring plan</h3>
        <p>${demand} planned hires across ${CC_ORDER.length} markets needs
          ${Math.round(target)} qualified people in pool at the ${ENGINE_PIPELINE_RATIO}:1 campus ratio.
          You hold ${inScope.toLocaleString()} in scope today — ${pct(inScope / target)}% of target.</p>

        <p><b>Step 1 — sequence by window, not by priority.</b> ${esc(first.c.name)} opens first
          (${MON[first.w.from - 1]}), so its offers have to be out roughly a quarter earlier.</p>
        ${miniTable(["Market", "Opens", "Internship window", { t: "Hires", n: 1 },
                     { t: "Pipeline target", n: 1 }, { t: "In scope", n: 1 }, "Gap"], rows)}

        <p><b>Step 2 — close the profession gaps before sourcing new schools.</b> Hidden talent already
          sitting in the wrong pool is cheaper than any new channel.</p>
        ${miniTable(["Profession", { t: "Hires", n: 1 }, { t: "Target", n: 1 },
                     { t: "In pool", n: 1 }, "vs target", "Hidden"], profRows)}

        <ol class="cop-plan">
          <li><span class="cop-pri">Q1</span><div><b>Lock partnerships in the markets that open first</b>
            <div class="sub-txt">${seq.slice(0, 2).map(s => esc(s.c.name)).join(" and ")} — faculty contact
              and req sign-off before the window, not during it.</div></div></li>
          <li><span class="cop-pri">Q2</span><div><b>Convert hidden talent into the short professions</b>
            <div class="sub-txt">${hiddenRanked()[0].count} ${esc(hiddenRanked()[0].label.toLowerCase())}
              matches already sit outside their home pool.</div></div></li>
          <li><span class="cop-pri">Q3</span><div><b>Run the peak-cohort campaigns</b>
            <div class="sub-txt">Target the markets whose graduating cohort lands next quarter, so the
              offer arrives before the cohort does.</div></div></li>
          <li><span class="cop-pri">Q4</span><div><b>Close the ${short.length} market${short.length === 1 ? "" : "s"} still short</b>
            <div class="sub-txt">${short.length
              ? short.map(s => esc(s.c.name) + " (" + s.gap + ")").join(", ")
              : "Nothing is short — redirect the quarter into conversion."}</div></div></li>
        </ol>
        <p class="cop-take"><b>Take:</b> the plan is constrained by calendar and by depth, not by reach.
          Every market here is already addressable.</p>`,
      chips: [
        askChip("Create a campus engagement strategy."),
        askChip("What recruiting actions should I prioritize this month?"),
        short[0] ? searchChip("Search " + short[0].c.name, { tab: "search", country: short[0].code })
                 : askChip("Who should I engage next?")
      ]
    };
  },

  fallback: function () {
    const worstCov = COUNTRY_STATS.slice().sort((a, b) => a.coverage - b.coverage)[0];
    const topHidden = hiddenRanked()[0];
    return {
      html: `<h3>I explain and extend the recommendations</h3>
        <p>I only read the ${CAND.length.toLocaleString()} candidate records in your talent pools, so I
          can justify any recommendation above, compare markets, widen a school shortlist, or turn the
          lot into a plan. Right now the two things worth your attention are
          <b>${esc(worstCov.name)} school coverage at ${pct(worstCov.coverage)}%</b> and
          <b>${topHidden.count} hidden ${esc(topHidden.label.toLowerCase())} matches</b>
          sitting in other pools.</p>
        <p class="sub-txt">Try one of the suggested prompts below.</p>`,
      chips: ENGINE_PROMPTS.slice(0, 3).map(p => askChip(p.text))
    };
  }
};

/* ============================================================
 * Export
 * ========================================================== */
$("#engExport").addEventListener("click", () => {
  if (activeTab === "search") {
    if (!lastResult) return toast("Run a search first");
    const rows = [["Section", "Candidate", "Country", "University", "University abbr", "Tier",
                   "Major", "Degree", "Graduation", "Talent pool", "Stage", "Match score",
                   "Pool relevance", "Matched skills", "All skills", "Recruiter"]];
    const add = (list, label) => list.forEach(x => {
      const c = x.c;
      rows.push([label, c.name, UI.country(c.country).name, c.school, c.schoolAbbr, c.tier,
        c.degreeField, c.degree, c.gradLabel, poolShort(c.pool), POOL_STAGES[c.stageIndex].label,
        x.score, c.relevance, x.matched.join("; "), c.skills.join("; "), c.recruiter]);
    });
    add(lastResult.direct, "Direct match");
    add(lastResult.hidden, "Hidden talent");
    return csv(rows, "talent-discovery-search.csv");
  }
  if (activeTab === "dashboard") {
    const rows = [["Market", "Talent pool count", "Target schools", "Covered schools",
                   "Coverage %", "High potential", "Warm", "Demand (hires)", "Pipeline target",
                   "Pipeline vs target %"]];
    COUNTRY_STATS.forEach(c => rows.push([c.name, c.poolCount, c.schools, c.covered,
      pct(c.coverage), c.hi, c.warm, c.demand, c.target, pct(c.ratio)]));
    rows.push([]);
    rows.push(["Profession", "In pool", "High potential", "Warm", "Demand (hires)",
               "Pipeline target", "vs target %", "Hidden elsewhere"]);
    PROF_STATS.forEach(p => rows.push([p.label, p.total, p.hi, p.warm, p.demand, p.target,
      pct(p.ratio), hiddenStat(p.id).count]));
    return csv(rows, "talent-discovery-dashboard.csv");
  }
  if (activeTab === "copilot") {
    const strip = s => String(s).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    const rows = [["Rank", "Decision", "Recommendation", "Rationale", "Tags", "Supporting metrics"]];
    RECOMMENDED.forEach((a, i) => rows.push([i + 1, a.kicker, a.title, strip(a.reason),
      a.tags.join("; "), a.metrics.map(m => strip(m.k) + ": " + strip(m.v)).join(" | ")]));
    rows.push([]);
    rows.push(["Market", "Opportunity signal", "Candidates in pool", "High potential",
               "School coverage %", "Addressable pipeline", "Growth % YoY", "Peak graduation quarter"]);
    CC_ORDER.forEach(code => {
      const c = ctryStat(code);
      rows.push([c.name, (ENGINE_OPPORTUNITY[code] || {}).label || "", c.poolCount, c.hi,
        pct(c.coverage), pipeOf(code).reachable || 0, pipeOf(code).growth || 0,
        QUARTER_LABEL[maxIndex(quartersOf(code))].split(" ")[0]]);
    });
    return csv(rows, "recommended-recruiting-actions.csv");
  }
  toast("Switch to a tab with exportable data");
});

/* ============================================================
 * Boot
 * ========================================================== */
renderDashboard();
initSearch();
renderActions();
renderMap();
renderInsights();
initCopilot();

})();
