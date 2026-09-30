/* ==================================================================
 * SECTION A — MARKET INTELLIGENCE
 * ------------------------------------------------------------------
 * Two surfaces, one question: "Where should we hire?"
 *
 *   ASEAN Overview    executive cross-country comparison
 *   Country Profiles  a recruiter research page per market
 *
 * Reads data/market.js for the market model and data/data.js for the
 * target-school list, so the school counts on the overview can never
 * disagree with the school list on a country page.
 * ================================================================== */
(function () {
"use strict";

const $ = UI.$, $$ = UI.$$, el = UI.el, esc = UI.esc, toast = UI.toast, csv = UI.csv;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const cc = code => COUNTRIES.find(c => c.code === code) || { code: code, name: code, flag: "" };
const schoolsOf = code => SCHOOLS.filter(s => s.country === code)
  .slice().sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));

const level = name => MARKET_LEVELS[name] || MARKET_LEVELS.Medium;

/* A band is good news when it points the recruiter's way: high supply
 * is good, high cost and high competition are not. */
function levelTone(metricId, band) {
  const m = MARKET_METRICS.find(x => x.id === metricId);
  const r = level(band).rank;
  const good = m && m.higherIsBetter ? r === 3 : r === 1;
  const bad  = m && m.higherIsBetter ? r === 1 : r === 3;
  return good ? "good" : bad ? "bad" : "mid";
}

function levelPill(metricId, band) {
  return `<span class="lvl ${levelTone(metricId, band)}">${esc(band)}</span>`;
}

/* Month -> percentage across a 12-month track. */
const pctFrom = m => ((m - 1) / 12) * 100;
const pctSpan = (a, b) => ((b - a + 1) / 12) * 100;

function todayPct() {
  const d = new Date();
  const monthFrac = (d.getMonth() + (d.getDate() - 1) / 30) / 12;
  return monthFrac * 100;
}

/* ============================================================
 * Derived figures — computed once, reused by both surfaces
 * ========================================================== */
const MARKET_STATS = MARKET_ORDER.map(code => {
  const schools = schoolsOf(code);
  const sig = MARKET_SIGNALS[code];
  const pipe = MARKET_PIPELINE[code];
  const calendar = MARKET_CALENDAR[code];
  /* Opportunity = cheap + plentiful + uncontested, on a 3..9 scale
   * flipped so a bigger number always means a better place to hire. */
  const opportunity = (4 - level(sig.cost).rank) + level(sig.supply).rank + (4 - level(sig.competition).rank);
  return {
    code: code, name: cc(code).name, flag: cc(code).flag,
    schools: schools, schoolCount: schools.length,
    tier1: schools.filter(s => s.tier === 1).length,
    sig: sig, pipe: pipe, calendar: calendar, opportunity: opportunity
  };
});

const statOf = code => MARKET_STATS.find(s => s.code === code);

/* How many markets have students on an internship in each month. */
const INTERN_BY_MONTH = (function () {
  const out = new Array(12).fill(0);
  MARKET_ORDER.forEach(code => {
    const on = new Set();
    MARKET_CALENDAR[code].intern.forEach(w => {
      for (let m = w.from; m <= w.to; m++) on.add(m - 1);
    });
    on.forEach(m => { out[m]++; });
  });
  return out;
})();

const PEAK_INTERN_MONTH = INTERN_BY_MONTH.indexOf(Math.max(...INTERN_BY_MONTH));
const TOTAL_PIPELINE = MARKET_ORDER.reduce((n, c) => n + MARKET_PIPELINE[c].reachable, 0);

/* ============================================================
 * Shared renderer — the 12-month comparison timeline
 * ========================================================== */
function timelineRows(codes, opts) {
  const o = opts || {};
  const head = `<div class="tl-head">
      <div class="tl-lbl"></div>
      <div class="tl-track tl-months">${MONTHS.map(m => `<span>${m}</span>`).join("")}</div>
    </div>`;

  const rows = codes.map(code => {
    const c = cc(code), cal = MARKET_CALENDAR[code];

    const interns = cal.intern.map(w => {
      const wide = (w.to - w.from + 1) >= 3;
      return `<div class="tl-band intern" style="left:${pctFrom(w.from)}%;width:${pctSpan(w.from, w.to)}%"
          title="${esc(c.name)} · ${esc(w.label)} · ${MONTHS[w.from - 1]} – ${MONTHS[w.to - 1]}">${
          wide ? esc(w.label) : ""}</div>`;
    }).join("");

    const g = cal.grad;
    const grad = `<div class="tl-band grad" style="left:${pctFrom(g.from)}%;width:${pctSpan(g.from, g.to)}%"
        title="${esc(c.name)} · work-ready ${esc(g.label)}">🎓 ${esc(g.label)}</div>`;

    return `<div class="tl-row${o.compact ? " compact" : ""}" data-code="${code}">
        <div class="tl-lbl">${c.flag} <span>${esc(c.name)}</span></div>
        <div class="tl-track">
          ${interns}${grad}
          <div class="tl-now" style="left:${todayPct()}%"></div>
        </div>
      </div>`;
  }).join("");

  return head + rows;
}

/* ============================================================
 * PAGE 1 — ASEAN OVERVIEW
 * ========================================================== */
function kpi(o) {
  return `<div class="kpi" style="--kpi:${o.colour}">
    <div class="kpi-top"><span class="kpi-icon">${o.icon}</span><span class="kpi-k">${esc(o.k)}</span></div>
    <div class="kpi-v">${o.v}<span class="kpi-u">${o.unit || ""}</span></div>
    <div class="kpi-sub">${o.sub}</div>
  </div>`;
}

function renderOverview() {
  const best = MARKET_STATS.slice().sort((a, b) => b.opportunity - a.opportunity)[0];
  const widest = MARKET_STATS.slice().sort((a, b) => b.schoolCount - a.schoolCount)[0];

  $("#ovKpis").innerHTML = [
    kpi({ icon: "🌏", k: "Markets in scope", v: MARKET_STATS.length, colour: "#4c7ef3",
      sub: `${SCHOOLS.length} target schools · ${MARKET_STATS.reduce((n, s) => n + s.tier1, 0)} at Tier 1` }),
    kpi({ icon: "👥", k: "Estimated reachable pipeline", v: (TOTAL_PIPELINE / 1000).toFixed(1), unit: "K",
      colour: "#31b57a", sub: `Widest footprint: ${widest.flag} ${esc(widest.name)} (${widest.schoolCount} schools)` }),
    kpi({ icon: "📅", k: "Peak internship month", v: MONTHS[PEAK_INTERN_MONTH], colour: "#e0a33c",
      sub: `${INTERN_BY_MONTH[PEAK_INTERN_MONTH]} of ${MARKET_STATS.length} markets have students available` }),
    kpi({ icon: "🎯", k: "Best market signal", v: best.flag + " " + esc(best.name), colour: "#8b5cf6",
      sub: `${esc(best.sig.cost)} cost · ${esc(best.sig.supply)} supply · ${esc(best.sig.competition)} competition` })
  ].join("");

  /* 1 · academic calendar comparison */
  $("#ovTimeline").innerHTML = timelineRows(MARKET_ORDER);
  $("#ovTimelineFoot").innerHTML = MONTHS.map((m, i) =>
    `<span class="tl-cov${INTERN_BY_MONTH[i] >= 4 ? " hot" : INTERN_BY_MONTH[i] ? "" : " off"}"
       title="${m}: ${INTERN_BY_MONTH[i]} of ${MARKET_STATS.length} markets have students on internship">
       ${m} <b>${INTERN_BY_MONTH[i]}/${MARKET_STATS.length}</b></span>`).join("");

  /* 2 · talent market insights */
  $("#ovMarketTable").innerHTML = `
    <thead><tr><th>Country</th>${MARKET_METRICS.map(m =>
      `<th title="${esc(m.hint)}">${esc(m.label)}</th>`).join("")}</tr></thead>
    <tbody>${MARKET_STATS.map(s => `<tr data-code="${s.code}" class="clickable">
      <td><b>${s.flag} ${esc(s.name)}</b></td>
      ${MARKET_METRICS.map(m => `<td>${levelPill(m.id, s.sig[m.id])}</td>`).join("")}
    </tr>`).join("")}</tbody>`;

  /* 3 · target school coverage */
  $("#ovCoverage").innerHTML = `
    <thead><tr><th>Country</th><th>Target schools</th><th class="num">Estimated talent pipeline</th></tr></thead>
    <tbody>${MARKET_STATS.map(s => `<tr data-code="${s.code}" class="clickable">
      <td><b>${s.flag} ${esc(s.name)}</b><div class="sub-txt">${s.tier1} Tier 1 · ${s.schoolCount - s.tier1} Tier 2–3</div></td>
      <td><div class="cov-bar"><i style="width:${(s.schoolCount / Math.max(...MARKET_STATS.map(x => x.schoolCount))) * 100}%"></i>
          <b>${s.schoolCount}</b></div>
        <div class="sub-txt">${esc(s.schools.slice(0, 3).map(x => x.abbr).join(", "))}${s.schoolCount > 3 ? " +" + (s.schoolCount - 3) : ""}</div></td>
      <td class="num"><b>${s.pipe.reachable.toLocaleString()}</b>
        <div class="sub-txt ${s.pipe.growth >= 10 ? "up" : ""}">▲ ${s.pipe.growth}% YoY</div></td>
    </tr>`).join("")}</tbody>`;

  $$("#ovMarketTable tr.clickable, #ovCoverage tr.clickable").forEach(tr =>
    tr.addEventListener("click", () => openCountry(tr.dataset.code)));

  /* 4 · AI market insights */
  $("#ovInsights").innerHTML = MARKET_INSIGHTS.map((ins, i) => `
    <div class="ai-card k-${ins.kind}">
      <div class="ai-top"><span class="ai-ic">${ins.icon}</span>
        <span class="ai-tag">Insight ${i + 1}</span></div>
      <div class="ai-head">${esc(ins.head)}</div>
      <p class="ai-body">${esc(ins.body)}</p>
      <button class="btn sm ai-cta" data-country="${esc(ins.go.country)}">${esc(ins.action)} &rarr;</button>
    </div>`).join("");

  $$("#ovInsights .ai-cta").forEach(b =>
    b.addEventListener("click", () => openCountry(b.dataset.country)));
}

/* ============================================================
 * PAGE 2 — COUNTRY PROFILES
 * ========================================================== */
let activeCountry = "MY";

function buildCountryNav() {
  const host = $("#navCountries");
  host.innerHTML = "";
  MARKET_ORDER.forEach(code => {
    const c = cc(code);
    const a = el("a", "nav-sub-item", `<span class="ni">${c.flag}</span>${esc(c.name)}`);
    a.dataset.view = "country";
    a.dataset.country = code;
    a.addEventListener("click", () => renderCountry(code));
    host.appendChild(a);
  });

  /* The parent entry opens whichever market was last looked at. */
  $('#nav .nav-item[data-view="country"]').addEventListener("click", () => renderCountry(activeCountry));
}

/* Navigate to a country page from anywhere (insight card, table row). */
function openCountry(code) {
  const item = $(`#navCountries .nav-sub-item[data-country="${code}"]`);
  if (item) item.click();
}

function renderCountry(code, silent) {
  activeCountry = code;
  const s = statOf(code), c = cc(code), p = MARKET_PROFILE[code], cal = MARKET_CALENDAR[code];

  if (!silent) {
    $$("#navCountries .nav-sub-item").forEach(a =>
      a.classList.toggle("active", a.dataset.country === code));
  }

  $("#cpTitle").innerHTML = `${c.flag} ${esc(c.name)}`;
  $("#cpLead").textContent = p.headline;

  /* country selector */
  $("#cpPicker").innerHTML = MARKET_STATS.map(x =>
    `<button class="ctry-pick${x.code === code ? " active" : ""}" data-code="${x.code}">
       <span class="cp-flag">${x.flag}</span>
       <span class="cp-nm">${esc(x.name)}</span>
       <span class="cp-sub">${x.schoolCount} schools</span>
     </button>`).join("");
  $$("#cpPicker .ctry-pick").forEach(b =>
    b.addEventListener("click", () => openCountry(b.dataset.code)));

  const tierLabel = t => TIERS[t].label.split(" — ")[1] || TIERS[t].label;

  $("#cpBody").innerHTML = `

    <!-- 1 · country summary -->
    <div class="fpanel cp-summary">
      <div class="fpanel-h"><h2>Country Summary</h2>
        <span class="sub-txt">Section A · Step 1 of the recruiter journey</span></div>
      <p class="cp-lead">${esc(p.summary)}</p>
      <div class="cp-pos"><span class="cp-pos-k">Use this market for</span>${esc(p.positioning)}</div>
      <div class="cp-stats">
        <div class="cp-stat"><div class="v">${s.schoolCount}</div><div class="k">Target schools</div></div>
        <div class="cp-stat"><div class="v">${s.tier1}</div><div class="k">Tier 1 priority</div></div>
        <div class="cp-stat"><div class="v">${s.pipe.reachable.toLocaleString()}</div><div class="k">Est. talent pipeline</div></div>
        <div class="cp-stat"><div class="v">+${s.pipe.growth}%</div><div class="k">Pipeline growth YoY</div></div>
      </div>
    </div>

    <div class="cp-two">
      <!-- 2 · target schools -->
      <div class="fpanel">
        <div class="fpanel-h"><h2>Target Schools</h2>
          <span class="sub-txt">${s.schoolCount} schools on the target list</span></div>
        <div class="cp-schools">
          ${s.schools.map(x => `
            <div class="cp-school" style="--tier:${TIERS[x.tier].color}">
              <div class="cs-top">
                <div>
                  <div class="cs-nm">${esc(x.name)}</div>
                  <div class="cs-sub">${esc(x.city)} · <b>${esc(x.abbr)}</b> · ${x.qsWorld ? "QS #" + x.qsWorld : "not ranked"}</div>
                </div>
                <span class="badge" style="background:${TIERS[x.tier].color}22;color:${TIERS[x.tier].color}">T${x.tier} ${esc(tierLabel(x.tier))}</span>
              </div>
              <div class="tags">${x.strengths.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
              <div class="cs-note">${esc(x.notes)}</div>
            </div>`).join("")}
        </div>
      </div>

      <div class="cp-col">
        <!-- 3 · academic calendar -->
        <div class="fpanel">
          <div class="fpanel-h"><h2>Academic Calendar</h2>
            <span class="sub-txt">Internship windows &amp; graduation timing</span></div>
          <div class="tl-wrap"><div class="tl tl-single">${timelineRows([code], { compact: true })}</div></div>
          <dl class="cp-dl">
            <dt>Calendar system</dt><dd>${esc(cal.note)}</dd>
            <dt>Internship window</dt><dd>${esc(cal.internText)}</dd>
            <dt>Graduation</dt><dd>${esc(cal.gradText)}</dd>
          </dl>
        </div>

        <!-- 4 · talent market insights -->
        <div class="fpanel">
          <div class="fpanel-h"><h2>Talent Market Insights</h2>
            <span class="sub-txt">Relative to the ASEAN median</span></div>
          <div class="cp-metrics">
            ${MARKET_METRICS.map(m => `
              <div class="cp-metric ${levelTone(m.id, s.sig[m.id])}">
                <div class="cm-k">${esc(m.label)}</div>
                <div class="cm-v">${esc(s.sig[m.id])}</div>
                <div class="cm-scale">${["Low", "Medium", "High"].map(b =>
                  `<i class="${b === s.sig[m.id] ? "on" : ""}"></i>`).join("")}</div>
                <div class="cm-h">${esc(m.hint)}</div>
              </div>`).join("")}
          </div>
          <div class="cp-strength">${esc(s.pipe.strength)}</div>
        </div>
      </div>
    </div>

    <!-- 5 · recruiting recommendations -->
    <div class="fpanel">
      <div class="fpanel-h"><h2>Recruiting Recommendations</h2>
        <span class="ai-badge">✨ Generated for ${esc(c.name)}</span></div>
      <div class="rec-grid">
        ${p.recommendations.map((r, i) => `
          <div class="rec">
            <span class="rec-n">${i + 1}</span>
            <div class="rec-b"><div class="rec-h">${esc(r.head)}</div>
              <p class="rec-t">${esc(r.body)}</p></div>
          </div>`).join("")}
      </div>
      <div class="cp-next">
        <div>
          <div class="cn-k">Step 2 · Discover Talent</div>
          <div class="cn-t">You know the market. Now see who you already hold in ${esc(c.name)} —
            including the qualified people sitting in the wrong talent pool.</div>
        </div>
        <button class="btn primary" id="cpToSearch">Find talent in ${esc(c.name)} &rarr;</button>
      </div>
    </div>`;

  $("#cpToSearch").addEventListener("click", () => handoff(code));
  if (!silent) {
    UI.go("country");
    UI.syncJourney();
    window.scrollTo(0, 0);
  }
}

/* Hand the market over to Section B with the country pre-filtered. */
function handoff(code) {
  const nav = $('#nav .nav-item[data-tab="search"]');
  if (!nav) return;
  nav.click();
  const sel = $("#engCountry");
  if (sel) {
    sel.value = code;
    const run = $("#engRun");
    if (run) run.click();
  }
  toast("Searching every talent pool in " + cc(code).name);
}

/* ============================================================
 * Exports
 * ========================================================== */
UI.exporters.overview = function () {
  const rows = [["Country", "Talent cost", "Talent supply", "Competition", "Target schools",
                 "Tier 1 schools", "Estimated talent pipeline", "Pipeline growth YoY %",
                 "Internship windows", "Graduation"]];
  MARKET_STATS.forEach(s => rows.push([
    s.name, s.sig.cost, s.sig.supply, s.sig.competition, s.schoolCount, s.tier1,
    s.pipe.reachable, s.pipe.growth,
    s.calendar.intern.map(w => `${w.label} ${MONTHS[w.from - 1]}-${MONTHS[w.to - 1]}`).join("; "),
    s.calendar.grad.label]));
  rows.push([]);
  rows.push(["AI market insight", "Detail"]);
  MARKET_INSIGHTS.forEach(i => rows.push([i.head, i.body]));
  csv(rows, "asean-market-overview.csv");
};

UI.exporters.country = function () {
  const s = statOf(activeCountry), p = MARKET_PROFILE[activeCountry], cal = MARKET_CALENDAR[activeCountry];
  const rows = [["Country profile", s.name]];
  rows.push(["Headline", p.headline]);
  rows.push(["Summary", p.summary]);
  rows.push(["Use this market for", p.positioning]);
  rows.push(["Talent cost", s.sig.cost], ["Talent supply", s.sig.supply], ["Competition", s.sig.competition]);
  rows.push(["Estimated talent pipeline", s.pipe.reachable], ["Pipeline growth YoY %", s.pipe.growth]);
  rows.push(["Calendar system", cal.note], ["Internship window", cal.internText], ["Graduation", cal.gradText]);
  rows.push([]);
  rows.push(["Target school", "Abbr", "Tier", "City", "QS world", "Strengths", "Notes"]);
  s.schools.forEach(x => rows.push([x.name, x.abbr, x.tier, x.city, x.qsWorld || "",
    x.strengths.join("; "), x.notes]));
  rows.push([]);
  rows.push(["Recruiting recommendation", "Detail"]);
  p.recommendations.forEach(r => rows.push([r.head, r.body]));
  csv(rows, "asean-country-profile-" + activeCountry.toLowerCase() + ".csv");
};

/* ================= boot ================= */
buildCountryNav();
renderOverview();
renderCountry(activeCountry, true);   /* pre-render without stealing navigation */
UI.syncJourney();

})();
