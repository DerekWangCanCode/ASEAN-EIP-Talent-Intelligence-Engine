/* Talent Strategy Hub for ASEAN EIP — application shell
 * ------------------------------------------------------------------
 * Owns the shared helpers, the sidebar router, the recruiter-journey
 * ribbon and the export dispatcher. The two content sections mount
 * themselves on top of this:
 *
 *   assets/market.js  Section A - Market Intelligence
 *   assets/engine.js  Section B - Talent Discovery
 */
(function () {
"use strict";

/* ================= helpers ================= */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const country = c => COUNTRIES.find(x => x.code === c) || { name: c, flag: "", currency: "", fxToUSD: 1 };
const LANG_NAMES = { EN: "English", MS: "Malay", ID: "Indonesian", TH: "Thai", VN: "Vietnamese", FIL: "Filipino" };
const langNames = codes => codes.map(c => LANG_NAMES[c] || c).join(" / ");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = ms => new Promise(r => setTimeout(r, ms));

function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}

function fmtMoney(v, cur, compact) {
  if (compact && v >= 1e9) return (v / 1e9).toFixed(v >= 1e10 ? 0 : 1) + "B";
  if (compact && v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + "M";
  if (compact && v >= 1e4) return Math.round(v / 1e3) + "K";
  return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
const toUSD = (v, c) => v * country(c).fxToUSD;

function csv(rows, name) {
  const body = rows.map(r => r.map(c => {
    const s = c == null ? "" : String(c);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8" });
  const a = el("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Exported " + name);
}

/* multi-select chip group */
function chipGroup(host, items, opts) {
  const o = opts || {};
  const key = o.key || "value";
  const labelOf = o.labelOf || (x => x);
  const valOf = o.valOf || (x => x);
  const preselect = (o.preselect || []).map(String);
  host.innerHTML = "";
  items.forEach(it => {
    const b = el("button", "chip", esc(labelOf(it)));
    b.dataset[key] = valOf(it);
    if (preselect.includes(String(valOf(it)))) b.classList.add("active");
    b.addEventListener("click", () => { b.classList.toggle("active"); host.dispatchEvent(new Event("change")); });
    host.appendChild(b);
  });
}
const activeOf = (host, key) => $$(".chip.active", host).map(b => b.dataset[key]);

/* ================= routing =================
 * A nav item names a view. Section B items additionally name a tab,
 * which assets/engine.js picks up from its own listener. Section A's
 * country entries additionally name a market, which assets/market.js
 * picks up the same way. */
function go(view) {
  $$(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + view));
  window.scrollTo(0, 0);
}

/* Delegated, because the country entries are injected by market.js
 * after this module has already run. */
$("#nav").addEventListener("click", e => {
  const a = e.target.closest(".nav-item, .nav-sub-item");
  if (!a || !a.dataset.view) return;
  $$("#nav .nav-item, #nav .nav-sub-item").forEach(x => x.classList.remove("active"));
  a.classList.add("active");
  if (a.dataset.view === "country") {
    const parent = $('#nav .nav-item[data-view="country"]');
    if (parent) parent.classList.add("active");
  }
  go(a.dataset.view);
  syncJourney();
});

/* ================= recruiter-journey ribbon =================
 * Step 1 Know the Market - Section A
 * Step 2 Discover Talent - Section B dashboard + search
 * Step 3 Take Action     - the Copilot
 */
function currentStep() {
  const view = ($(".view.active") || {}).id || "";
  if (view !== "view-engine") return 1;
  const tab = ($("#engPivot .pivot-tab.active") || {}).dataset;
  return tab && tab.tab === "copilot" ? 3 : 2;
}

function syncJourney() {
  const step = currentStep();
  $$("#journey .jn-step").forEach(s =>
    s.classList.toggle("on", Number(s.dataset.step) === step));
}

$$("#journey .jn-step").forEach(s => s.addEventListener("click", () => {
  const target = s.dataset.go;
  const item = target === "overview"
    ? $('#nav .nav-item[data-view="overview"]')
    : $('#nav .nav-item[data-tab="' + target + '"]');
  if (item) item.click();
}));

/* The pivot inside Section B moves the journey too. */
document.addEventListener("click", e => {
  if (e.target.closest("#engPivot .pivot-tab")) setTimeout(syncJourney, 0);
});

/* ============================================================
 * Export dispatcher
 * Section modules register their own exporters on UI.exporters.
 * ========================================================== */
document.addEventListener("click", e => {
  const ex = e.target.closest("[data-export]");
  if (ex) return doExport(ex.dataset.export);
  const cp = e.target.closest("[data-copy]");
  if (cp) {
    const txt = $("#" + cp.dataset.copy).textContent;
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast("Copied"), () => toast("Copy blocked by the browser"));
  }
});

function doExport(kind) {
  if (UI.exporters[kind]) return UI.exporters[kind]();
  toast("Nothing to export yet");
}

/* Bridge: the section modules live in their own files but reuse these
 * helpers and the routing / export plumbing declared inside here. */
window.UI = {
  $: $, $$: $$, el: el, esc: esc, toast: toast, sleep: sleep, clamp: clamp,
  country: country, langNames: langNames, fmtMoney: fmtMoney, toUSD: toUSD, csv: csv,
  chipGroup: chipGroup, activeOf: activeOf,
  go: go, syncJourney: syncJourney,
  exporters: {}
};

syncJourney();

})();
