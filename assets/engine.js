/* ==================================================================
 * SECTION B - TALENT DISCOVERY ENGINE
 * ------------------------------------------------------------------
 * Three tabs, one data model:
 *   1 Dashboard                    know the market
 *   2 Search & Hidden Talent       find talent, then find the talent you
 *                                  already had but nobody was working
 *   3 Talent Intelligence Copilot  decide what to do about it
 *
 * Everything on all three tabs is derived from TALENT_POOL_CANDIDATES,
 * so a number shown on the dashboard, in a search result and inside a
 * Copilot answer is always the same number.
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
  activeTab = tab;
  $$("#engPivot .pivot-tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  $$(".eng-pane").forEach(p => p.classList.toggle("active", p.id === "eng-" + tab));
  $$('#nav .nav-item[data-view="engine"]').forEach(a =>
    a.classList.toggle("active", a.dataset.tab === tab));
  window.scrollTo(0, 0);
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

  renderInsights();
  renderActions();
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

function renderInsights() {
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
function buildActions() {
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

function renderActions() {
  const list = buildActions();
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
 * TAB 3 - TALENT INTELLIGENCE COPILOT
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
      <h3>Talent Intelligence Copilot</h3>
      <p>I read the same ${CAND.length.toLocaleString()} candidate records the dashboard and search
        use. Ask me about coverage, pipeline health, hidden talent, cohorts or who to engage &mdash;
        I answer with the numbers behind them, not opinions.</p>
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

  fallback: function () {
    const worstCov = COUNTRY_STATS.slice().sort((a, b) => a.coverage - b.coverage)[0];
    const topHidden = hiddenRanked()[0];
    return {
      html: `<h3>I answer talent-intelligence questions</h3>
        <p>I only read the ${CAND.length.toLocaleString()} candidate records in your talent pools,
          so I can cover coverage, pipeline health, hidden talent, cohorts and engagement priorities.
          Right now the two things worth your attention are
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
  toast("Switch to the Dashboard or Search tab to export");
});

/* ============================================================
 * Boot
 * ========================================================== */
renderDashboard();
initSearch();
initCopilot();

})();
