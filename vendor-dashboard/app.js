/* ============================================================
   Oman Wedding Vendors — Dashboard logic (no framework, no build)
   Loads vendors.json (or an uploaded file), then filters, sorts,
   paginates and exports entirely client-side.
   ============================================================ */
"use strict";

const STORE_KEY = "oman-vendors-data-v1";
const THEME_KEY = "oman-vendors-theme";

const state = {
  vendors: [],
  meta: { generatedAt: null, sample: false, source: "vendors.json" },
  filtered: [],
  selected: new Set(),
  page: 1,
  sort: { key: "business_name", dir: "asc" },
  filters: { search: "", cats: new Set(), govs: new Set(), minRating: 0,
             hasPhone: false, hasWebsite: false, operationalOnly: false },
};

const $ = (sel) => document.querySelector(sel);
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  for (const k of kids) n.append(k);
  return n;
};

/* ---------------- data loading ---------------- */
async function boot() {
  initTheme();
  wireEvents();
  const cached = loadCached();
  if (cached) {
    applyData(cached, "saved upload");
  } else {
    try {
      const res = await fetch("vendors.json", { cache: "no-store" });
      if (!res.ok) throw new Error(res.status);
      applyData(await res.json(), "vendors.json");
    } catch (e) {
      applyData({ vendors: [], sample: true }, "vendors.json");
    }
  }
}

function applyData(data, source) {
  const vendors = normalize(Array.isArray(data) ? data : data.vendors || []);
  state.vendors = vendors;
  state.meta = {
    generatedAt: (data && data.generatedAt) || null,
    sample: !!(data && data.sample),
    source,
  };
  buildFacets();
  render();
  updateMeta();
}

function normalize(rows) {
  return rows.map((r) => ({
    place_id: r.place_id || "",
    business_name: r.business_name || "Unnamed",
    category: r.category || "Uncategorized",
    phone: r.phone || "",
    website: r.website || "",
    rating: r.rating == null ? null : Number(r.rating),
    rating_count: r.rating_count == null ? null : Number(r.rating_count),
    address: r.address || "",
    governorate: r.governorate || "Unknown",
    latitude: r.latitude ?? null,
    longitude: r.longitude ?? null,
    maps_url: r.maps_url || "",
    business_status: r.business_status || "",
    opening_hours: r.opening_hours || "",
  }));
}

/* ---------------- facets (filter chips) ---------------- */
function buildFacets() {
  const govCounts = tally(state.vendors, "governorate");
  const catCounts = tally(state.vendors, "category");
  $("#govCount").textContent = `${govCounts.size} areas`;
  $("#catCount").textContent = `${catCounts.size} types`;
  renderChips("#govFilter", govCounts, state.filters.govs);
  renderChips("#catFilter", catCounts, state.filters.cats);
}

function tally(rows, key) {
  const m = new Map();
  for (const r of rows) m.set(r[key], (m.get(r[key]) || 0) + 1);
  return new Map([...m.entries()].sort((a, b) => b[1] - a[1]));
}

function renderChips(sel, counts, activeSet) {
  const host = $(sel);
  host.textContent = "";
  for (const [value, n] of counts) {
    const chip = el("button", {
      className: "chip" + (activeSet.has(value) ? " active" : ""),
      type: "button",
      onclick: () => {
        activeSet.has(value) ? activeSet.delete(value) : activeSet.add(value);
        chip.classList.toggle("active");
        state.page = 1;
        render();
      },
    });
    chip.append(value, el("span", { className: "n", textContent: n }));
    host.append(chip);
  }
}

/* ---------------- filtering & sorting ---------------- */
function computeFiltered() {
  const f = state.filters;
  const q = f.search.trim().toLowerCase();
  let rows = state.vendors.filter((v) => {
    if (f.cats.size && !f.cats.has(v.category)) return false;
    if (f.govs.size && !f.govs.has(v.governorate)) return false;
    if (f.minRating && !(v.rating >= f.minRating)) return false;
    if (f.hasPhone && !v.phone) return false;
    if (f.hasWebsite && !v.website) return false;
    if (f.operationalOnly && v.business_status !== "OPERATIONAL") return false;
    if (q) {
      const hay = `${v.business_name} ${v.phone} ${v.address} ${v.website} ${v.category} ${v.governorate}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const { key, dir } = state.sort;
  const mul = dir === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    let x = a[key], y = b[key];
    if (typeof x === "number" || typeof y === "number") {
      x = x ?? -Infinity; y = y ?? -Infinity;
      return (x - y) * mul;
    }
    return String(x).localeCompare(String(y), "en") * mul;
  });
  state.filtered = rows;
}

/* ---------------- render ---------------- */
function render() {
  computeFiltered();
  renderStats();
  renderTable();
  renderPager();
  $("#resultCount").innerHTML =
    `Showing <b>${state.filtered.length.toLocaleString()}</b> of ${state.vendors.length.toLocaleString()} vendors`;
}

function renderStats() {
  const rows = state.filtered;
  const rated = rows.filter((r) => r.rating != null);
  const avg = rated.length ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : 0;
  const withPhone = rows.filter((r) => r.phone).length;
  const withSite = rows.filter((r) => r.website).length;
  const govs = new Set(rows.map((r) => r.governorate)).size;
  const stats = [
    { k: "Vendors in view", v: rows.length.toLocaleString(), sub: `${state.vendors.length.toLocaleString()} total collected` },
    { k: "Avg rating", v: avg ? avg.toFixed(2) : "—", gold: true, sub: `${rated.length.toLocaleString()} rated` },
    { k: "With phone", v: pct(withPhone, rows.length), sub: `${withPhone.toLocaleString()} contactable` },
    { k: "With website", v: pct(withSite, rows.length), sub: `${withSite.toLocaleString()} online` },
    { k: "Governorates", v: govs, sub: `${new Set(rows.map((r) => r.category)).size} categories` },
  ];
  $("#stats").textContent = "";
  for (const s of stats) {
    const card = el("div", { className: "stat" + (s.gold ? " gold" : "") });
    card.append(
      el("div", { className: "k", textContent: s.k }),
      el("div", { className: "v", textContent: s.v }),
      el("div", { className: "sub", textContent: s.sub }),
    );
    $("#stats").append(card);
  }
}
const pct = (n, d) => (d ? Math.round((n / d) * 100) + "%" : "—");

function pageSlice() {
  const size = $("#pageSize").value;
  if (size === "all") return { rows: state.filtered, size: state.filtered.length };
  const n = Number(size);
  const start = (state.page - 1) * n;
  return { rows: state.filtered.slice(start, start + n), size: n };
}

function renderTable() {
  const tbody = $("#tbody");
  tbody.textContent = "";
  const { rows } = pageSlice();
  const empty = $("#emptyState");

  if (!state.vendors.length) {
    empty.hidden = false;
    empty.innerHTML = `<h3>No data loaded yet</h3>
      <p>Run the collector's dashboard export, or click <b>Load data</b> to open a
      <code>vendors.json</code> / <code>.csv</code> exported by the collector.</p>`;
    return;
  }
  if (!rows.length) {
    empty.hidden = false;
    empty.innerHTML = `<h3>No matches</h3><p>No vendors match the current filters.</p>`;
    return;
  }
  empty.hidden = true;

  for (const v of rows) {
    const tr = el("tr");
    const cb = el("input", { type: "checkbox", checked: state.selected.has(v.place_id) });
    cb.addEventListener("change", () => {
      cb.checked ? state.selected.add(v.place_id) : state.selected.delete(v.place_id);
      syncSelectAll();
    });

    tr.append(
      el("td", { className: "col-check" }, cb),
      cell(
        el("div", { className: "biz-name", textContent: v.business_name }),
        v.address ? el("div", { className: "biz-addr", textContent: v.address }) : "",
      ),
      cell(el("span", { className: "cat-tag", textContent: v.category })),
      cell(document.createTextNode(v.governorate)),
      ratingCell(v),
      contactCell(v),
      statusCell(v),
      linksCell(v),
    );
    tbody.append(tr);
  }
  syncSelectAll();
}

function cell(...kids) { return el("td", {}, ...kids.filter(Boolean)); }

function ratingCell(v) {
  const td = el("td", { className: "num rating-cell" });
  if (v.rating == null) { td.append("—"); return td; }
  td.append(el("span", { className: "star", textContent: "★ " }),
            document.createTextNode(v.rating.toFixed(1)));
  if (v.rating_count != null)
    td.append(el("span", { className: "count", textContent: ` (${v.rating_count})` }));
  return td;
}

function contactCell(v) {
  const td = el("td");
  if (v.phone) td.append(el("a", { href: `tel:${v.phone.replace(/\s+/g, "")}`, textContent: v.phone }));
  else td.append(el("span", { className: "pill none", textContent: "no phone" }));
  return td;
}

function statusCell(v) {
  const map = {
    OPERATIONAL: ["ok", "Open"],
    CLOSED_TEMPORARILY: ["warn", "Temp. closed"],
    CLOSED_PERMANENTLY: ["bad", "Closed"],
  };
  const [cls, label] = map[v.business_status] || ["none", v.business_status || "—"];
  return el("td", {}, el("span", { className: `pill ${cls}`, textContent: label }));
}

function linksCell(v) {
  const td = el("td");
  const links = el("div", { className: "links" });
  links.append(
    iconLink(v.maps_url, "📍", "Open in Google Maps"),
    iconLink(v.website, "🌐", "Website"),
    iconLink(waLink(v.phone), "💬", "WhatsApp"),
  );
  td.append(links);
  return td;
}
function iconLink(href, glyph, title) {
  return el("a", {
    className: "ilink" + (href ? "" : " disabled"),
    href: href || "#", title, target: "_blank", rel: "noopener", textContent: glyph,
  });
}
function waLink(phone) {
  if (!phone) return "";
  const digits = phone.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

function renderPager() {
  const size = $("#pageSize").value;
  const pager = $("#pager");
  if (size === "all" || state.filtered.length <= Number(size)) { pager.hidden = true; return; }
  const total = Math.ceil(state.filtered.length / Number(size));
  state.page = Math.min(state.page, total) || 1;
  pager.hidden = false;
  $("#pageInfo").textContent = `Page ${state.page} of ${total}`;
  $("#prevPage").disabled = state.page <= 1;
  $("#nextPage").disabled = state.page >= total;
}

function syncSelectAll() {
  const { rows } = pageSlice();
  const all = rows.length && rows.every((r) => state.selected.has(r.place_id));
  $("#selectAll").checked = all;
  $("#selectAll").indeterminate = !all && rows.some((r) => state.selected.has(r.place_id));
}

/* ---------------- exports ---------------- */
const CSV_COLS = [
  ["business_name", "Business Name"], ["category", "Category"], ["phone", "Phone Number"],
  ["governorate", "Governorate"], ["address", "Address"], ["maps_url", "Google Maps URL"],
  ["rating", "Rating"], ["rating_count", "Review Count"], ["website", "Website"],
  ["latitude", "Latitude"], ["longitude", "Longitude"], ["business_status", "Business Status"],
  ["opening_hours", "Opening Hours"],
];
function toCSV(rows, cols = CSV_COLS) {
  const esc = (val) => {
    let s = val == null ? "" : String(val);
    if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const head = cols.map(([, label]) => esc(label)).join(",");
  const body = rows.map((r) => cols.map(([key]) => esc(r[key])).join(",")).join("\n");
  return "﻿" + head + "\n" + body; // BOM for Excel/Arabic
}
function download(filename, text, type = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function stamp() { return new Date().toISOString().slice(0, 10); }

function selectedRows() {
  return state.filtered.filter((r) => state.selected.has(r.place_id));
}

function handleExport(kind) {
  switch (kind) {
    case "csv-filtered":
      download(`oman-vendors-${stamp()}.csv`, toCSV(state.filtered));
      toast(`Downloaded ${state.filtered.length} rows`); break;
    case "csv-all":
      download(`oman-vendors-all-${stamp()}.csv`, toCSV(state.vendors));
      toast(`Downloaded ${state.vendors.length} rows`); break;
    case "csv-selected": {
      const rows = selectedRows();
      if (!rows.length) return toast("No rows selected");
      download(`oman-vendors-selected-${stamp()}.csv`, toCSV(rows));
      toast(`Downloaded ${rows.length} selected`); break;
    }
    case "json-filtered":
      download(`oman-vendors-${stamp()}.json`,
        JSON.stringify({ generatedAt: new Date().toISOString(), count: state.filtered.length, vendors: state.filtered }, null, 2),
        "application/json"); break;
    case "whatsapp": {
      const rows = (selectedRows().length ? selectedRows() : state.filtered).filter((r) => r.phone);
      const cols = [["business_name", "Business Name"], ["category", "Category"],
                    ["phone", "Phone"], ["wa", "WhatsApp Link"], ["governorate", "Governorate"]];
      const withWa = rows.map((r) => ({ ...r, wa: waLink(r.phone) }));
      download(`oman-vendors-whatsapp-${stamp()}.csv`, toCSV(withWa, cols));
      toast(`${withWa.length} contacts with phone numbers`); break;
    }
  }
  $("#exportMenu").hidden = true;
}

/* ---------------- upload ---------------- */
function handleFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      let data;
      if (file.name.toLowerCase().endsWith(".json")) {
        data = JSON.parse(reader.result);
      } else {
        data = { vendors: parseCSV(reader.result) };
      }
      saveCached(data);
      applyData(data, `upload: ${file.name}`);
      toast(`Loaded ${state.vendors.length} vendors from ${file.name}`);
    } catch (e) {
      toast("Could not read that file — expected vendors.json or a CSV export");
    }
  };
  reader.readAsText(file);
}

function parseCSV(text) {
  const rows = csvRows(text.replace(/^﻿/, ""));
  if (!rows.length) return [];
  const header = rows.shift().map((h) => h.trim());
  const idx = (labels) => header.findIndex((h) => labels.includes(h.toLowerCase()));
  const map = {
    business_name: idx(["business name", "business_name", "name"]),
    category: idx(["category"]), phone: idx(["phone number", "phone"]),
    governorate: idx(["governorate"]), address: idx(["address"]),
    maps_url: idx(["google maps url", "maps_url"]), rating: idx(["rating"]),
    rating_count: idx(["review count", "rating_count"]), website: idx(["website"]),
    latitude: idx(["latitude"]), longitude: idx(["longitude"]),
    business_status: idx(["business status", "business_status"]),
    opening_hours: idx(["opening hours", "opening_hours"]),
  };
  return rows.filter((r) => r.length > 1).map((r) => {
    const o = {};
    for (const k in map) o[k] = map[k] >= 0 ? r[map[k]] : "";
    o.place_id = o.maps_url || o.business_name + "|" + o.address;
    return o;
  });
}
function csvRows(text) {
  const out = []; let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); out.push(row); row = []; field = ""; }
    else if (c === "\r") { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); out.push(row); }
  return out;
}

/* ---------------- persistence & misc ---------------- */
function saveCached(data) { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) {} }
function loadCached() { try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; } }

function updateMeta() {
  const m = state.meta;
  const parts = [`${state.vendors.length.toLocaleString()} vendors`];
  if (m.generatedAt) parts.push(`updated ${new Date(m.generatedAt).toLocaleDateString()}`);
  if (m.sample) parts.push("SAMPLE DATA");
  parts.push(`source: ${m.source}`);
  $("#dataMeta").textContent = parts.join(" · ");
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 2600);
}

/* ---------------- theme ---------------- */
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) document.documentElement.dataset.theme = saved;
}
function toggleTheme() {
  const cur = document.documentElement.dataset.theme
    || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
}

/* ---------------- events ---------------- */
function wireEvents() {
  $("#search").addEventListener("input", debounce((e) => {
    state.filters.search = e.target.value; state.page = 1; render();
  }, 180));

  $("#minRating").addEventListener("input", (e) => {
    const v = Number(e.target.value);
    state.filters.minRating = v;
    $("#minRatingOut").textContent = v ? v.toFixed(1) + "+" : "Any";
    state.page = 1; render();
  });

  for (const [id, key] of [["hasPhone", "hasPhone"], ["hasWebsite", "hasWebsite"], ["operationalOnly", "operationalOnly"]]) {
    $("#" + id).addEventListener("change", (e) => { state.filters[key] = e.target.checked; state.page = 1; render(); });
  }

  $("#resetFilters").addEventListener("click", () => {
    state.filters = { search: "", cats: new Set(), govs: new Set(), minRating: 0,
                      hasPhone: false, hasWebsite: false, operationalOnly: false };
    $("#search").value = ""; $("#minRating").value = 0; $("#minRatingOut").textContent = "Any";
    $("#hasPhone").checked = $("#hasWebsite").checked = $("#operationalOnly").checked = false;
    buildFacets(); state.page = 1; render();
  });

  $("#sortSelect").addEventListener("change", (e) => {
    const [key, dir] = e.target.value.split(":");
    state.sort = { key, dir }; render(); markSortedHeader();
  });
  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      state.sort = { key, dir: state.sort.key === key && state.sort.dir === "asc" ? "desc" : "asc" };
      render(); markSortedHeader();
    });
  });

  $("#pageSize").addEventListener("change", () => { state.page = 1; render(); });
  $("#prevPage").addEventListener("click", () => { state.page--; render(); });
  $("#nextPage").addEventListener("click", () => { state.page++; render(); });

  $("#selectAll").addEventListener("change", (e) => {
    const { rows } = pageSlice();
    rows.forEach((r) => e.target.checked ? state.selected.add(r.place_id) : state.selected.delete(r.place_id));
    renderTable();
  });

  $("#exportBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    const m = $("#exportMenu"); m.hidden = !m.hidden;
  });
  $("#exportMenu").addEventListener("click", (e) => {
    const k = e.target.dataset.export; if (k) handleExport(k);
  });
  document.addEventListener("click", () => ($("#exportMenu").hidden = true));

  $("#uploadBtn").addEventListener("click", () => $("#fileInput").click());
  $("#fileInput").addEventListener("change", (e) => e.target.files[0] && handleFile(e.target.files[0]));
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => { e.preventDefault(); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]); });

  $("#themeBtn").addEventListener("click", toggleTheme);
}
function markSortedHeader() {
  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.classList.toggle("sorted", th.dataset.sort === state.sort.key);
    th.classList.toggle("asc", th.dataset.sort === state.sort.key && state.sort.dir === "asc");
  });
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

boot();
