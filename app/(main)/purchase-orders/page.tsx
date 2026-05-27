"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// Feature flag — set NEXT_PUBLIC_PO_ENABLED=true in .env.local to enable locally.
// Not set on Vercel → page redirects to home.
const PO_ENABLED = process.env.NEXT_PUBLIC_PO_ENABLED === "true";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
} from "recharts";
import { PO_ROWS, type PORow, type POStatus, CATEGORY_LABEL } from "@/lib/po-data";
import { SUBCATS_BY_CATEGORY, SUBCAT_TO_MANAGER } from "@/lib/category-managers";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtM   = (n: number) => `€${(n / 1_000_000).toFixed(1)}M`;
const fmtK   = (n: number) => n >= 1_000_000 ? fmtM(n) : n >= 1000 ? `€${(n / 1000).toFixed(0)}k` : `€${n.toFixed(0)}`;
const fmtNum = (n: number) => n.toLocaleString();

type Period = "full" | "h1" | "h2" | "q1" | "q2" | "q3" | "q4";

const PERIOD_LABEL: Record<Period, string> = {
  full: "Full Year 2026", h1: "H1 2026", h2: "H2 2026",
  q1: "Q1 2026", q2: "Q2 2026", q3: "Q3 2026", q4: "Q4 2026",
};

const PERIOD_GROUPS = [
  { label: "Annual",    options: [{ id: "full" as Period, label: "Full Year" }] },
  { label: "Half",      options: [{ id: "h1" as Period, label: "H1" }, { id: "h2" as Period, label: "H2" }] },
  { label: "Quarter",   options: [{ id: "q1" as Period, label: "Q1" }, { id: "q2" as Period, label: "Q2" }, { id: "q3" as Period, label: "Q3" }, { id: "q4" as Period, label: "Q4" }] },
];

const STATUS_CONFIG: Record<POStatus, { color: string; bg: string; dot: string; label: string }> = {
  "INITIATED": { color: "#1565C0", bg: "#EFF6FF", dot: "#1565C0", label: "Initiated" },
  "APPROVED":  { color: "#A43700", bg: "#FFF7ED", dot: "#F97316", label: "Approved"  },
  "SENT":      { color: "#065F46", bg: "#ECFDF5", dot: "#10B981", label: "Sent"      },
};

const ALL_STATUSES: POStatus[] = ["INITIATED", "APPROVED", "SENT"];
const MARKETS = ["DACH", "US", "DKSE", "BENELUX", "FR", "GB", "AU", "NZ", "IE", "CA"];

const MARKET_COLORS: Record<string, string> = {
  DACH:    "#067A46",
  US:      "#1565C0",
  DKSE:    "#7C3AED",
  BENELUX: "#D97706",
  FR:      "#6A1B9A",
  GB:      "#C62828",
  AU:      "#00838F",
  NZ:      "#558B2F",
  IE:      "#37474F",
  CA:      "#0277BD",
};

const BAR_COLORS = [
  "#067A46","#0A9E5C","#1565C0","#7C3AED","#D97706",
  "#EA580C","#DB1D1D","#0891B2","#9333EA","#CA8A04",
];

// ── Month-trend builder ───────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function buildMonthlyTrend(rows: PORow[]) {
  const map: Record<string, { month: string; value: number; count: number }> = {};
  for (const r of rows) {
    const m = MONTHS[parseInt(r.poDate.slice(5, 7)) - 1];
    if (!m) continue;
    if (!map[m]) map[m] = { month: m, value: 0, count: 0 };
    map[m].value += r.netValue;
    map[m].count += 1;
  }
  return MONTHS.filter(m => map[m]).map(m => map[m]);
}

// ── Supplier bar data ─────────────────────────────────────────────────────────
function buildSupplierData(rows: PORow[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.supplier, (map.get(r.supplier) ?? 0) + r.netValue);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([supplier, value]) => ({ supplier, value }));
}

// ── Status breakdown ──────────────────────────────────────────────────────────
function buildStatusData(rows: PORow[]) {
  const map = new Map<string, { count: number; value: number }>();
  for (const r of rows) {
    if (!map.has(r.status)) map.set(r.status, { count: 0, value: 0 });
    const e = map.get(r.status)!;
    e.count += 1;
    e.value += r.netValue;
  }
  return ALL_STATUSES.filter(s => map.has(s)).map(s => ({ status: s, ...map.get(s)! }));
}

// ── Market breakdown ──────────────────────────────────────────────────────────
function buildMarketData(rows: PORow[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.market, (map.get(r.market) ?? 0) + r.netValue);
  }
  return MARKETS.filter(m => map.has(m)).map(m => ({ market: m, value: map.get(m)! }));
}

// ── MultiSelectFilter (shared pattern) ───────────────────────────────────────
function MultiSelectFilter({ label, options, values, onChange }: {
  label: string; options: string[]; values: string[]; onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const active = values.length > 0;
  const summary = values.length === 0 ? `All ${label}s`
                : values.length === 1 ? values[0]
                : `${values.length} selected`;
  return (
    <div ref={ref} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ font: "600 12px/16px var(--font-body)", color: "#676767", textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" }}>{label}</span>
      <button onClick={() => setOpen(o => !o)} style={{
        padding: "7px 28px 7px 10px", borderRadius: 8,
        border: `1.5px solid ${active ? "#067A46" : "#E4E4E4"}`,
        background: active ? "#F6FDE9" : "#fff",
        color: active ? "#067A46" : "#242424",
        font: `${active ? 600 : 400} 13px/18px var(--font-body)`,
        cursor: "pointer", textAlign: "left", position: "relative",
        minWidth: 140, maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {summary}
        <svg width="10" height="6" viewBox="0 0 10 6" style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)" }}>
          <path d="M1 1l4 4 4-4" stroke="#676767" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 50,
          background: "#fff", border: "1px solid #E4E4E4", borderRadius: 8,
          boxShadow: "0 8px 20px rgba(0,0,0,.12)", minWidth: 200, maxHeight: 280, overflowY: "auto",
        }}>
          {active && (
            <button onClick={() => onChange([])} style={{
              width: "100%", padding: "8px 12px", border: 0, background: "transparent",
              color: "#B30000", font: "500 12px/16px var(--font-body)", cursor: "pointer", textAlign: "left",
              borderBottom: "1px solid #F0F0F0",
            }}>✕ Clear selection</button>
          )}
          {options.map(opt => {
            const checked = values.includes(opt);
            return (
              <label key={opt} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer",
                background: checked ? "#F6FDE9" : "transparent",
              }}>
                <input type="checkbox" checked={checked}
                  onChange={() => onChange(checked ? values.filter(v => v !== opt) : [...values, opt])}
                  style={{ accentColor: "#067A46" }} />
                <span style={{ font: "400 13px/18px var(--font-body)", color: "#242424" }}>{opt}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function PeriodPicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {PERIOD_GROUPS.map(g => (
        <div key={g.label} style={{ display: "flex", border: "1px solid #E4E4E4", borderRadius: 8, overflow: "hidden" }}>
          {g.options.map(o => (
            <button key={o.id} onClick={() => onChange(o.id)} style={{
              padding: "7px 13px", border: "none", cursor: "pointer",
              font: "500 12px/16px var(--font-body)",
              background: value === o.id ? "#067A46" : "#fff",
              color: value === o.id ? "#fff" : "#676767",
              transition: "all 120ms",
              borderRight: g.options[g.options.length - 1].id !== o.id ? "1px solid #E4E4E4" : "none",
            }}>{o.label}</button>
          ))}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: POStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["INITIATED"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      font: "500 11px/16px var(--font-body)", whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PurchaseOrdersPage() {
  const router = useRouter();

  // Gate: redirect to home on Vercel (flag not set)
  useEffect(() => {
    if (!PO_ENABLED) router.replace("/");
  }, [router]);

  if (!PO_ENABLED) return null;

  const [allRows,        setAllRows]        = useState<PORow[]>(PO_ROWS);
  const [marketTotals,   setMarketTotals]   = useState<Record<string, number>>({});
  const [dataSource,     setDataSource]     = useState<"loading"|"databricks"|"static">("loading");
  const [period,         setPeriod]         = useState<Period>("full");
  const [filterMarkets,     setFilterMarkets]     = useState<string[]>([]);
  const [filterStatus,      setFilterStatus]      = useState<string>("");
  const [filterCategory,    setFilterCategory]    = useState<string>("");
  const [filterSubCategory, setFilterSubCategory] = useState<string[]>([]);

  // Load data
  const loadData = useCallback((p: Period) => {
    setDataSource("loading");
    fetch(`/api/po-data?period=${p}`)
      .then(res => {
        const src = res.headers.get("X-Data-Source");
        return res.json().then((payload: { rows: PORow[]; marketTotals: Record<string, number> }) => ({ payload, src }));
      })
      .then(({ payload, src }) => {
        setAllRows(payload.rows ?? []);
        setMarketTotals(payload.marketTotals ?? {});
        setDataSource(src === "databricks" ? "databricks" : "static");
      })
      .catch(() => { setAllRows(PO_ROWS); setMarketTotals({}); setDataSource("static"); });
  }, []);

  useEffect(() => { loadData(period); }, [period, loadData]);

  // Derive live category options — skip empty codes
  const liveCategories = useMemo(() => {
    const codes = [...new Set(allRows.map(r => r.category).filter(Boolean))].sort();
    return codes.map(c => ({ code: c, label: CATEGORY_LABEL[c] ?? c }));
  }, [allRows]);

  // Sub-category options: narrow by selected category, else show all
  const subCatOptions = useMemo(() => {
    if (filterCategory) {
      const friendlyName = CATEGORY_LABEL[filterCategory];
      return SUBCATS_BY_CATEGORY[friendlyName ?? ''] ?? Object.keys(SUBCAT_TO_MANAGER).sort();
    }
    return Object.keys(SUBCAT_TO_MANAGER).sort();
  }, [filterCategory]);

  // Client-side filters
  const filteredRows = useMemo(() => {
    let rows = allRows;
    if (filterMarkets.length)     rows = rows.filter(r => filterMarkets.includes(r.market));
    if (filterStatus)             rows = rows.filter(r => r.status === filterStatus);
    if (filterCategory)           rows = rows.filter(r => r.category === filterCategory);
    // Sub-category filter: works when PORow has subCategory (future enrichment via culinary_sku JOIN)
    if (filterSubCategory.length) rows = rows.filter(r => filterSubCategory.includes((r as PORow & { subCategory?: string }).subCategory ?? ''));
    return rows;
  }, [allRows, filterMarkets, filterStatus, filterCategory, filterSubCategory]);

  // Derived metrics
  const totalValue   = useMemo(() => filteredRows.reduce((s, r) => s + r.netValue, 0), [filteredRows]);
  const totalPOs     = useMemo(() => new Set(filteredRows.map(r => r.poNumber)).size, [filteredRows]);
  const initiatedVal = useMemo(() => filteredRows.filter(r => r.status === "INITIATED").reduce((s, r) => s + r.netValue, 0), [filteredRows]);
  const initiatedCnt = useMemo(() => new Set(filteredRows.filter(r => r.status === "INITIATED").map(r => r.poNumber)).size, [filteredRows]);
  const sentVal      = useMemo(() => filteredRows.filter(r => r.status === "SENT").reduce((s, r) => s + r.netValue, 0), [filteredRows]);
  const avgValue     = totalPOs > 0 ? totalValue / totalPOs : 0;

  // Chart data
  const monthlyTrend   = useMemo(() => buildMonthlyTrend(filteredRows),  [filteredRows]);
  const supplierData   = useMemo(() => buildSupplierData(filteredRows),   [filteredRows]);
  const statusData     = useMemo(() => buildStatusData(filteredRows),     [filteredRows]);

  // Use server-aggregated totals for the market chart when available (avoids LIMIT-3000 bias).
  // When a market filter is active, fall back to client-side so filtered rows are respected.
  const marketData = useMemo(() => {
    if (Object.keys(marketTotals).length > 0 && filterMarkets.length === 0) {
      return MARKETS
        .filter(m => marketTotals[m] != null)
        .map(m => ({ market: m, value: marketTotals[m] }))
        .sort((a, b) => b.value - a.value);
    }
    return buildMarketData(filteredRows);
  }, [marketTotals, filterMarkets, filteredRows]);

  // Total derived from marketData so the bar percentages use the same base as the values.
  const marketChartTotal = useMemo(
    () => marketData.reduce((s, d) => s + d.value, 0),
    [marketData],
  );

  // Sorted table
  const tableRows = useMemo(() =>
    [...filteredRows].sort((a, b) => b.netValue - a.netValue).slice(0, 50)
  , [filteredRows]);

  return (
    <div style={{ background: "#F8F8F8", minHeight: "100vh" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{ background: "#fff", borderBottom: "1px solid #EEE", padding: "22px 32px" }}>
        <div style={{ font: "400 12px/16px var(--font-body)", color: "#676767", marginBottom: 6, display: "flex", gap: 6 }}>
          <span>Strategic Procurement</span>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: "#242424" }}>Purchase Orders</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ font: "500 30px/38px var(--font-display)", color: "#242424", margin: 0 }}>Purchase Orders</h1>
            <div style={{ font: "400 13px/18px var(--font-body)", color: "#676767", marginTop: 4, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span>PO spend · {PERIOD_LABEL[period]}</span>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#BBB", display: "inline-block" }} />
              {dataSource === "loading"    && <span style={{ color: "#E8820C" }}>⟳ Loading…</span>}
              {dataSource === "databricks" && <span style={{ color: "#067A46" }}>● Live data</span>}
              {dataSource === "static"     && <span style={{ color: "#AAAAAA" }}>● Dummy data</span>}
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#BBB", display: "inline-block" }} />
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "2px 8px", borderRadius: 20,
                background: "#FFF7ED", color: "#A43700",
                font: "500 11px/16px var(--font-body)",
              }}>
                € All values in EUR · FX 2026-05-26
              </span>
            </div>
          </div>
        </div>
      </header>

      <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Period + Filters ────────────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E4E4E4", padding: "14px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ font: "600 12px/16px var(--font-body)", color: "#676767", textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" }}>Period</span>
            <PeriodPicker value={period} onChange={p => setPeriod(p)} />

            <div style={{ width: 1, height: 24, background: "#E4E4E4", flexShrink: 0 }} />

            {/* Market filter */}
            <span style={{ font: "600 12px/16px var(--font-body)", color: "#676767", textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" }}>Market</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {MARKETS.map(m => {
                const active = filterMarkets.includes(m);
                return (
                  <button key={m} onClick={() => setFilterMarkets(prev => active ? prev.filter(x => x !== m) : [...prev, m])} style={{
                    padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                    border: `1.5px solid ${active ? MARKET_COLORS[m] : "#E4E4E4"}`,
                    background: active ? MARKET_COLORS[m] + "18" : "#fff",
                    color: active ? MARKET_COLORS[m] : "#676767",
                    font: `${active ? 600 : 400} 12px/16px var(--font-body)`,
                    transition: "all 120ms",
                  }}>{m}</button>
                );
              })}
              {filterMarkets.length > 0 && (
                <button onClick={() => setFilterMarkets([])} style={{ padding: "5px 10px", borderRadius: 20, cursor: "pointer", border: "1px solid #E4E4E4", background: "transparent", color: "#9CA3AF", font: "400 11px/16px var(--font-body)" }}>✕ Clear</button>
              )}
            </div>

            <div style={{ width: 1, height: 24, background: "#E4E4E4", flexShrink: 0 }} />

            {/* Status filter */}
            <span style={{ font: "600 12px/16px var(--font-body)", color: "#676767", textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" }}>Status</span>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{
              padding: "7px 12px", borderRadius: 8, border: "1px solid #E4E4E4", background: "#fff",
              font: "400 13px/18px var(--font-body)", color: "#242424", cursor: "pointer",
            }}>
              <option value="">All Statuses</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <div style={{ width: 1, height: 24, background: "#E4E4E4", flexShrink: 0 }} />

            {/* Category filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ font: "600 12px/16px var(--font-body)", color: "#676767", textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" }}>Category</span>
              <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setFilterSubCategory([]); }} style={{
                padding: "7px 12px", borderRadius: 8,
                border: `1.5px solid ${filterCategory ? "#067A46" : "#E4E4E4"}`,
                background: filterCategory ? "#F6FDE9" : "#fff",
                font: `${filterCategory ? 600 : 400} 13px/18px var(--font-body)`,
                color: filterCategory ? "#067A46" : "#242424", cursor: "pointer",
              }}>
                <option value="">All Categories</option>
                {liveCategories.map(c => (
                  <option key={c.code} value={c.code}>{c.label} ({c.code})</option>
                ))}
              </select>
            </div>

            {/* Sub-category filter */}
            <MultiSelectFilter
              label="Sub-Category"
              options={subCatOptions}
              values={filterSubCategory}
              onChange={setFilterSubCategory}
            />
          </div>
        </div>

        {/* ── KPI strip ──────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[
            {
              label: "Total PO Spend",
              value: fmtM(totalValue),
              sub: `${fmtNum(totalPOs)} distinct purchase orders`,
              accent: "#067A46",
            },
            {
              label: "Initiated (Pending)",
              value: fmtM(initiatedVal),
              sub: `${initiatedCnt} POs awaiting approval`,
              accent: "#1565C0",
            },
            {
              label: "Sent to Supplier",
              value: fmtM(sentVal),
              sub: "Confirmed & dispatched",
              accent: "#065F46",
            },
            {
              label: "Avg PO Value",
              value: fmtK(avgValue),
              sub: "Per purchase order",
              accent: "#7C3AED",
            },
          ].map(({ label, value, sub, accent }) => (
            <div key={label} style={{ background: "#fff", borderRadius: 10, border: "1px solid #E4E4E4", padding: "16px 20px", borderTop: `3px solid ${accent}` }}>
              <div style={{ font: "500 11px/14px var(--font-body)", color: "#676767", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>{label}</div>
              <div style={{ font: "600 24px/30px var(--font-display)", color: "#242424", marginBottom: 4 }}>{value}</div>
              <div style={{ font: "400 12px/16px var(--font-body)", color: "#9CA3AF" }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Row 1: Trend + Status breakdown ────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>

          {/* Monthly spend trend */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E4E4E4", padding: "20px 24px" }}>
            <div style={{ font: "600 14px/20px var(--font-display)", color: "#242424", marginBottom: 4 }}>Monthly PO Spend</div>
            <div style={{ font: "400 12px/16px var(--font-body)", color: "#9CA3AF", marginBottom: 16 }}>Excluding cancelled POs</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyTrend} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="#F0F0F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <RechartTooltip
                  formatter={(v: number) => [fmtM(v), "PO Spend"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E4E4E4", font: "400 12px/18px var(--font-body)" }}
                />
                <Line type="monotone" dataKey="value" stroke="#067A46" strokeWidth={2.5} dot={{ r: 4, fill: "#067A46" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Status breakdown */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E4E4E4", padding: "20px 24px" }}>
            <div style={{ font: "600 14px/20px var(--font-display)", color: "#242424", marginBottom: 4 }}>By Status</div>
            <div style={{ font: "400 12px/16px var(--font-body)", color: "#9CA3AF", marginBottom: 16 }}>PO count + value</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {statusData.map(({ status, count, value }) => {
                const cfg = STATUS_CONFIG[status as POStatus] ?? STATUS_CONFIG["INITIATED"];
                const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
                return (
                  <div key={status}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <StatusBadge status={status as POStatus} />
                      <div style={{ textAlign: "right" }}>
                        <span style={{ font: "600 12px/16px var(--font-body)", color: "#242424" }}>{fmtM(value)}</span>
                        <span style={{ font: "400 11px/16px var(--font-body)", color: "#9CA3AF", marginLeft: 6 }}>{count} POs</span>
                      </div>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: "#F0F0F0", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: cfg.dot, borderRadius: 2, transition: "width 300ms" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Row 2: Top suppliers bar + Market split ─────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>

          {/* Top suppliers */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E4E4E4", padding: "20px 24px" }}>
            <div style={{ font: "600 14px/20px var(--font-display)", color: "#242424", marginBottom: 4 }}>Top Suppliers by PO Value</div>
            <div style={{ font: "400 12px/16px var(--font-body)", color: "#9CA3AF", marginBottom: 16 }}>Top 8 · excluding cancelled</div>
            <ResponsiveContainer width="100%" height={supplierData.length * 44 + 20}>
              <BarChart data={[...supplierData].reverse()} layout="vertical" margin={{ top: 0, right: 80, bottom: 0, left: 120 }} barCategoryGap="20%">
                <CartesianGrid horizontal={false} stroke="#F0F0F0" />
                <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="supplier" tick={{ fontSize: 12, fill: "#242424", fontWeight: 500 }} axisLine={false} tickLine={false} width={115} />
                <RechartTooltip
                  formatter={(v: number) => [fmtM(v), "PO Value"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E4E4E4", font: "400 12px/18px var(--font-body)" }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={30}>
                  {[...supplierData].reverse().map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Market split */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E4E4E4", padding: "20px 24px" }}>
            <div style={{ font: "600 14px/20px var(--font-display)", color: "#242424", marginBottom: 4 }}>By Market</div>
            <div style={{ font: "400 12px/16px var(--font-body)", color: "#9CA3AF", marginBottom: 16 }}>PO spend share</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {marketData.map(({ market, value }) => {
                const pct = marketChartTotal > 0 ? (value / marketChartTotal) * 100 : 0;
                const color = MARKET_COLORS[market] ?? "#9CA3AF";
                return (
                  <div key={market}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 7, font: "500 13px/18px var(--font-body)", color: "#242424" }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                        {market}
                      </span>
                      <span style={{ font: "600 12px/16px var(--font-body)", color: "#242424" }}>
                        {fmtM(value)}
                        <span style={{ font: "400 11px/16px var(--font-body)", color: "#9CA3AF", marginLeft: 6 }}>{pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "#F0F0F0", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 300ms" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── PO Table ───────────────────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E4E4E4", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #EEE", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ font: "600 14px/20px var(--font-display)", color: "#242424" }}>
              Purchase Orders — Top 50 by Value
            </div>
            <div style={{ font: "400 12px/16px var(--font-body)", color: "#9CA3AF" }}>
              {filteredRows.length} total · showing top 50
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8F8F8" }}>
                  {["PO Number","Date","Supplier","Market","Category","Value (€)","Orig. CCY","Lines","Week","Status"].map(h => (
                    <th key={h} style={{
                      padding: "10px 14px",
                      textAlign: h === "Value (€)" || h === "Lines" ? "right" : "left",
                      font: "600 11px/14px var(--font-body)", color: "#676767",
                      textTransform: "uppercase", letterSpacing: ".04em",
                      borderBottom: "1px solid #E4E4E4", whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r, i) => (
                  <tr key={r.poNumber} style={{ borderBottom: "1px solid #F5F5F5" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#FAFAFA"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <td style={{ padding: "10px 14px", font: "500 12px/16px var(--font-body)", color: "#1565C0" }}>{r.poNumber}</td>
                    <td style={{ padding: "10px 14px", font: "400 12px/16px var(--font-body)", color: "#676767", whiteSpace: "nowrap" }}>
                      {new Date(r.poDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: BAR_COLORS[i % BAR_COLORS.length], flexShrink: 0 }} />
                        <span style={{ font: "500 13px/18px var(--font-body)", color: "#242424" }}>{r.supplier}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                        background: MARKET_COLORS[r.market] + "18", color: MARKET_COLORS[r.market] ?? "#676767",
                      }}>{r.market}</span>
                    </td>
                    <td style={{ padding: "10px 14px", font: "400 12px/16px var(--font-body)", color: "#676767" }}>
                      {CATEGORY_LABEL[r.category] ?? r.category}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right", font: "600 13px/18px var(--font-body)", color: "#242424" }}>{fmtK(r.netValue)}</td>
                    <td style={{ padding: "10px 14px", font: "500 11px/16px var(--font-body)", color: r.currency === "EUR" ? "#9CA3AF" : "#A43700" }}>{r.currency}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", font: "400 12px/16px var(--font-body)", color: "#9CA3AF" }}>{r.lineItems}</td>
                    <td style={{ padding: "10px 14px", font: "400 11px/16px var(--font-body)", color: "#9CA3AF" }}>{r.week}</td>
                    <td style={{ padding: "10px 14px" }}><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
