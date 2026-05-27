"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { ROWS, type SpendRow } from "@/lib/data";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtM  = (n: number) => `€${(n / 1_000_000).toFixed(1)}M`;
const fmtK  = (n: number) => n >= 1_000_000 ? fmtM(n) : `€${(n / 1000).toFixed(0)}k`;

const MARKETS = ["DACH", "US", "DKSE", "BENELUX", "FR", "GB", "AU", "NZ", "IE", "CA"];
const TOP_N_OPTIONS = [5, 10, 15, 20];

type Period = "full" | "h1" | "h2" | "q1" | "q2" | "q3" | "q4";

const PERIOD_GROUPS: { label: string; options: { id: Period; label: string }[] }[] = [
  {
    label: "Annual",
    options: [{ id: "full", label: "Full Year" }],
  },
  {
    label: "Half Year",
    options: [
      { id: "h1", label: "H1" },
      { id: "h2", label: "H2" },
    ],
  },
  {
    label: "Quarter",
    options: [
      { id: "q1", label: "Q1" },
      { id: "q2", label: "Q2" },
      { id: "q3", label: "Q3" },
      { id: "q4", label: "Q4" },
    ],
  },
];

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
  "#067A46","#0A9E5C","#10B981","#1565C0","#1976D2",
  "#7C3AED","#9333EA","#D97706","#EA580C","#DB1D1D",
  "#0891B2","#0284C7","#16A34A","#CA8A04","#9D174D",
  "#6366F1","#F59E0B","#EF4444","#8B5CF6","#EC4899",
];
const OTHERS_COLOR = "#CBD5E1"; // slate-300 for Long Tail bar

// ── Period Picker ─────────────────────────────────────────────────────────────
function PeriodPicker({ value, onChange, disabled }: {
  value: Period; onChange: (p: Period) => void; disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {PERIOD_GROUPS.map(group => (
        <div key={group.label} style={{ display: "flex", border: "1px solid #E4E4E4", borderRadius: 8, overflow: "hidden", opacity: disabled ? 0.4 : 1 }}>
          {group.options.map(opt => (
            <button
              key={opt.id}
              onClick={() => !disabled && onChange(opt.id)}
              disabled={disabled}
              title={disabled ? "Period breakdown requires live Databricks data" : undefined}
              style={{
                padding: "7px 13px", border: "none", cursor: disabled ? "not-allowed" : "pointer",
                font: "500 12px/16px var(--font-body)",
                background: value === opt.id ? "#067A46" : "#fff",
                color: value === opt.id ? "#fff" : "#676767",
                transition: "all 120ms",
                borderRight: group.options[group.options.length - 1].id !== opt.id ? "1px solid #E4E4E4" : "none",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Multi-select market checkbox dropdown ─────────────────────────────────────
function MarketMultiSelect({ values, onChange }: {
  values: string[]; onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (m: string) =>
    onChange(values.includes(m) ? values.filter(v => v !== m) : [...values, m]);

  const label = values.length === 0 ? "All Markets"
    : values.length === 1 ? values[0]
    : `${values.length} markets`;

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 140 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", padding: "8px 12px", borderRadius: 8, cursor: "pointer",
        border: `1.5px solid ${values.length > 0 ? "#067A46" : "#E4E4E4"}`,
        background: values.length > 0 ? "#F0FDF4" : "#fff",
        color: values.length > 0 ? "#067A46" : "#242424",
        font: `${values.length > 0 ? 600 : 400} 13px/18px var(--font-body)`,
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
      }}>
        <span>{label}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100,
          background: "#fff", border: "1px solid #E4E4E4", borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,.1)", minWidth: 160, overflow: "hidden",
        }}>
          {MARKETS.map(m => (
            <label key={m} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 14px",
              cursor: "pointer", font: "400 13px/18px var(--font-body)",
              background: values.includes(m) ? "#F0FDF4" : "transparent",
            }}
              onMouseEnter={e => { if (!values.includes(m)) (e.currentTarget as HTMLElement).style.background = "#F8F8F8"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = values.includes(m) ? "#F0FDF4" : "transparent"; }}
            >
              <input type="checkbox" checked={values.includes(m)} onChange={() => toggle(m)}
                style={{ accentColor: "#067A46", width: 14, height: 14, cursor: "pointer" }} />
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: MARKET_COLORS[m], flexShrink: 0 }} />
                {m}
              </span>
            </label>
          ))}
          {values.length > 0 && (
            <button onClick={() => { onChange([]); setOpen(false); }} style={{
              width: "100%", padding: "8px 14px", border: "none", borderTop: "1px solid #E4E4E4",
              background: "transparent", cursor: "pointer", font: "400 12px/16px var(--font-body)",
              color: "#9CA3AF", textAlign: "left",
            }}>✕ Clear selection</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: SupplierRow }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isOthers = d.isLongTail;
  return (
    <div style={{
      background: "#fff", border: "1px solid #E4E4E4", borderRadius: 8,
      padding: "12px 16px", boxShadow: "0 4px 16px rgba(0,0,0,.1)",
      font: "400 12px/18px var(--font-body)",
    }}>
      <div style={{ font: "600 13px/18px var(--font-body)", color: "#242424", marginBottom: 8 }}>
        {isOthers ? `Long Tail (${d.supplierCount} suppliers)` : d.supplier}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
          <span style={{ color: "#676767" }}>Actual Spend</span>
          <span style={{ font: "600 12px/18px var(--font-body)", color: "#242424" }}>{fmtM(d.actualSpend)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
          <span style={{ color: "#676767" }}>Awarded Budget</span>
          <span style={{ font: "600 12px/18px var(--font-body)", color: "#242424" }}>{fmtM(d.awardedBudget)}</span>
        </div>
        {!isOthers && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
              <span style={{ color: "#676767" }}>Utilisation</span>
              <span style={{
                font: "600 12px/18px var(--font-body)",
                color: d.utilPct >= 100 ? "#B30000" : d.utilPct >= 80 ? "#A43700" : "#067A46",
              }}>{d.utilPct.toFixed(1)}%</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
              <span style={{ color: "#676767" }}>Markets</span>
              <span style={{ font: "500 12px/18px var(--font-body)", color: "#242424" }}>{d.markets.join(", ")}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
              <span style={{ color: "#676767" }}>Category</span>
              <span style={{ font: "500 12px/18px var(--font-body)", color: "#242424" }}>{d.categories.join(", ")}</span>
            </div>
          </>
        )}
        {isOthers && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
            <span style={{ color: "#676767" }}>Suppliers</span>
            <span style={{ font: "600 12px/18px var(--font-body)", color: "#242424" }}>{d.supplierCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface SupplierRow {
  supplier: string;
  actualSpend: number;
  awardedBudget: number;
  utilPct: number;
  markets: string[];
  categories: string[];
  rank: number;
  isLongTail?: boolean;
  supplierCount?: number;
}

// ── Aggregate rows into supplier totals ───────────────────────────────────────
function aggregateSuppliers(rows: SpendRow[]): SupplierRow[] {
  const map = new Map<string, {
    actualSpend: number; awardedBudget: number;
    markets: Set<string>; categories: Set<string>;
  }>();

  for (const r of rows) {
    const key = r.supplier;
    if (!map.has(key)) map.set(key, { actualSpend: 0, awardedBudget: 0, markets: new Set(), categories: new Set() });
    const entry = map.get(key)!;
    entry.actualSpend   += r.cumulativeActualSpendEur;
    entry.awardedBudget += r.cumulativeAwardedSpendEur;
    entry.markets.add(r.market);
    entry.categories.add(r.category);
  }

  return Array.from(map.entries())
    .map(([supplier, d]) => ({
      supplier,
      actualSpend:   d.actualSpend,
      awardedBudget: d.awardedBudget,
      utilPct:       d.awardedBudget > 0 ? (d.actualSpend / d.awardedBudget) * 100 : 0,
      markets:       Array.from(d.markets).sort(),
      categories:    Array.from(d.categories).sort(),
      rank:          0,
    }))
    .sort((a, b) => b.actualSpend - a.actualSpend)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

// Build Long Tail aggregation from suppliers outside top N
function buildLongTail(allSuppliers: SupplierRow[], topN: number): SupplierRow | null {
  const tail = allSuppliers.slice(topN);
  if (tail.length === 0) return null;
  const totalActual  = tail.reduce((s, r) => s + r.actualSpend, 0);
  const totalAwarded = tail.reduce((s, r) => s + r.awardedBudget, 0);
  return {
    supplier:      `Others (Long Tail)`,
    actualSpend:   totalActual,
    awardedBudget: totalAwarded,
    utilPct:       totalAwarded > 0 ? (totalActual / totalAwarded) * 100 : 0,
    markets:       [],
    categories:    [],
    rank:          topN + 1,
    isLongTail:    true,
    supplierCount: tail.length,
  };
}

const PERIOD_LABEL: Record<Period, string> = {
  full: "Full Year 2026",
  h1:   "H1 2026  (W01–W26)",
  h2:   "H2 2026  (W27–W52)",
  q1:   "Q1 2026  (W01–W13)",
  q2:   "Q2 2026  (W14–W26)",
  q3:   "Q3 2026  (W27–W39)",
  q4:   "Q4 2026  (W40–W52)",
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TopSuppliersPage() {
  const [allRows,        setAllRows]        = useState<SpendRow[]>(ROWS);
  const [dataSource,     setDataSource]     = useState<"loading" | "databricks" | "static">("loading");
  const [filterMarkets,  setFilterMarkets]  = useState<string[]>([]);
  const [supplierTotals, setSupplierTotals] = useState<Record<string, { actualSpend: number; awardedSpend: number }>>({});
  const [topN,           setTopN]           = useState(10);
  const [metric,        setMetric]        = useState<"actualSpend" | "awardedBudget">("actualSpend");
  const [period,        setPeriod]        = useState<Period>("full");

  const isLive = dataSource === "databricks";

  // Load data whenever period changes (only meaningful for live Databricks)
  const loadData = useCallback((p: Period) => {
    setDataSource("loading");
    const qs = p !== "full" ? `?period=${p}` : "";
    fetch(`/api/spend-data${qs}`)
      .then(res => {
        const src = res.headers.get("X-Data-Source");
        return res.json().then((payload: { rows: SpendRow[]; supplierTotals?: Record<string, { actualSpend: number; awardedSpend: number }> }) => ({ payload, src }));
      })
      .then(({ payload, src }) => {
        setAllRows(payload.rows ?? []);
        setSupplierTotals(payload.supplierTotals ?? {});
        setDataSource(src === "databricks" ? "databricks" : "static");
      })
      .catch(() => { setAllRows(ROWS); setSupplierTotals({}); setDataSource("static"); });
  }, []);

  useEffect(() => { loadData(period); }, [period, loadData]);

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    // loadData will be triggered by useEffect above
  };

  // Filter rows by selected markets (client-side)
  const filteredRows = useMemo(() => {
    if (filterMarkets.length === 0) return allRows;
    return allRows.filter(r => filterMarkets.includes(r.market));
  }, [allRows, filterMarkets]);

  // Aggregate suppliers and compute Long Tail
  // When no market filter is active AND we have server-side totals, use those (unbiased by LIMIT)
  const allSuppliers = useMemo(() => {
    if (filterMarkets.length === 0 && Object.keys(supplierTotals).length > 0) {
      return Object.entries(supplierTotals)
        .map(([supplier, v], i) => ({
          supplier,
          actualSpend:   v.actualSpend,
          awardedBudget: v.awardedSpend,
          utilPct:       v.awardedSpend > 0 ? (v.actualSpend / v.awardedSpend) * 100 : 0,
          markets:       [] as string[],
          categories:    [] as string[],
          rank:          i + 1,
        }))
        .sort((a, b) => b.actualSpend - a.actualSpend)
        .map((s, i) => ({ ...s, rank: i + 1 }));
    }
    return aggregateSuppliers(filteredRows);
  }, [supplierTotals, filterMarkets, filteredRows]);
  const topSuppliers  = useMemo(() => allSuppliers.slice(0, topN), [allSuppliers, topN]);
  const longTail      = useMemo(() => buildLongTail(allSuppliers, topN), [allSuppliers, topN]);

  // Chart data: top N reversed (so rank 1 appears at top) + Long Tail at very bottom
  const chartData = useMemo(() => {
    const rows: SupplierRow[] = [...topSuppliers].reverse();
    if (longTail) rows.unshift(longTail); // unshift puts Others at visual bottom of chart
    return rows;
  }, [topSuppliers, longTail]);

  // Summary KPIs
  const totalSpend    = allSuppliers.reduce((s, r) => s + r.actualSpend, 0);
  const topNSpend     = topSuppliers.reduce((s, r) => s + r.actualSpend, 0);
  const topNShare     = totalSpend > 0 ? (topNSpend / totalSpend) * 100 : 0;
  const longTailShare = totalSpend > 0 && longTail ? (longTail.actualSpend / totalSpend) * 100 : 0;

  const chartHeight = (topN + (longTail ? 1 : 0)) * 44 + 40;

  return (
    <div style={{ background: "#F8F8F8", minHeight: "100vh" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{ background: "#fff", borderBottom: "1px solid #EEE", padding: "22px 32px" }}>
        <div style={{ font: "400 12px/16px var(--font-body)", color: "#676767", marginBottom: 6, display: "flex", gap: 6 }}>
          <span>Strategic Procurement</span><span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: "#242424" }}>Top Suppliers</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ font: "500 30px/38px var(--font-display)", color: "#242424", margin: 0 }}>Top Suppliers</h1>
            <div style={{ font: "400 13px/18px var(--font-body)", color: "#676767", marginTop: 4, display: "flex", gap: 12, alignItems: "center" }}>
              <span>Aggregated spend by supplier · {PERIOD_LABEL[period]}</span>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#BBB", display: "inline-block" }} />
              {dataSource === "loading"    && <span style={{ color: "#E8820C" }}>⟳ Loading…</span>}
              {dataSource === "databricks" && <span style={{ color: "#067A46" }}>● Live data</span>}
              {dataSource === "static"     && <span style={{ color: "#AAAAAA" }}>● Static data</span>}
            </div>
          </div>
        </div>
      </header>

      <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Period picker ───────────────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E4E4E4", padding: "14px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ font: "600 12px/16px var(--font-body)", color: "#676767", textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" }}>
              Report Period
            </span>
            <PeriodPicker value={period} onChange={handlePeriodChange} disabled={!isLive && dataSource !== "loading"} />
            {dataSource === "static" && (
              <span style={{ font: "400 12px/16px var(--font-body)", color: "#9CA3AF", fontStyle: "italic" }}>
                Period breakdown available with live Databricks connection
              </span>
            )}
          </div>
        </div>

        {/* ── KPI strip ──────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[
            {
              label: "Total Suppliers",
              value: allSuppliers.length.toString(),
              sub: filterMarkets.length > 0 ? filterMarkets.join(" + ") : "All markets",
            },
            {
              label: `Top ${topN} Spend`,
              value: fmtM(topNSpend),
              sub: `${topNShare.toFixed(1)}% of total spend`,
            },
            {
              label: "Long Tail Spend",
              value: longTail ? fmtM(longTail.actualSpend) : "—",
              sub: longTail ? `${longTailShare.toFixed(1)}% · ${longTail.supplierCount} suppliers` : "N/A",
            },
            {
              label: "#1 Supplier",
              value: allSuppliers[0]?.supplier ?? "—",
              sub: allSuppliers[0] ? fmtM(allSuppliers[0].actualSpend) : "",
            },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ background: "#fff", borderRadius: 10, border: "1px solid #E4E4E4", padding: "16px 20px" }}>
              <div style={{ font: "500 11px/14px var(--font-body)", color: "#676767", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>{label}</div>
              <div style={{ font: "600 22px/28px var(--font-display)", color: "#242424", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
              <div style={{ font: "400 12px/16px var(--font-body)", color: "#9CA3AF" }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Chart card ─────────────────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E4E4E4", padding: "20px 24px" }}>

          {/* Controls row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ font: "600 15px/20px var(--font-display)", color: "#242424" }}>
                Top {topN} Suppliers by {metric === "actualSpend" ? "Actual Spend" : "Awarded Budget"}
              </div>
              <div style={{ font: "400 12px/16px var(--font-body)", color: "#9CA3AF", marginTop: 2 }}>
                {filterMarkets.length === 0 ? "All markets" : filterMarkets.join(" · ")}
                {" · "}{PERIOD_LABEL[period]}
                {longTail ? ` · +${longTail.supplierCount} in Long Tail` : ""}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {/* Metric toggle */}
              <div style={{ display: "flex", border: "1px solid #E4E4E4", borderRadius: 8, overflow: "hidden" }}>
                {(["actualSpend", "awardedBudget"] as const).map(m => (
                  <button key={m} onClick={() => setMetric(m)} style={{
                    padding: "7px 14px", border: "none", cursor: "pointer",
                    font: "500 12px/16px var(--font-body)",
                    background: metric === m ? "#067A46" : "#fff",
                    color: metric === m ? "#fff" : "#676767",
                    transition: "all 120ms",
                  }}>
                    {m === "actualSpend" ? "Actual Spend" : "Awarded Budget"}
                  </button>
                ))}
              </div>

              {/* Top N selector */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ font: "500 12px/16px var(--font-body)", color: "#676767", whiteSpace: "nowrap" }}>Show top</span>
                <div style={{ display: "flex", border: "1px solid #E4E4E4", borderRadius: 8, overflow: "hidden" }}>
                  {TOP_N_OPTIONS.map(n => (
                    <button key={n} onClick={() => setTopN(n)} style={{
                      padding: "7px 12px", border: "none", cursor: "pointer",
                      font: "500 12px/16px var(--font-body)",
                      background: topN === n ? "#067A46" : "#fff",
                      color: topN === n ? "#fff" : "#676767",
                      transition: "all 120ms",
                    }}>{n}</button>
                  ))}
                </div>
              </div>

              {/* Market multi-select */}
              <MarketMultiSelect values={filterMarkets} onChange={setFilterMarkets} />
            </div>
          </div>

          {/* Bar chart */}
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 120, bottom: 0, left: 160 }}
              barCategoryGap="20%"
            >
              <CartesianGrid horizontal={false} stroke="#F0F0F0" />
              <XAxis
                type="number"
                tickFormatter={fmtK}
                tick={{ fontSize: 11, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="supplier"
                tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
                  const isOthers = payload.value.startsWith("Others");
                  return (
                    <text x={x} y={y} dy={4} textAnchor="end"
                      fill={isOthers ? "#9CA3AF" : "#242424"}
                      fontWeight={isOthers ? 400 : 500}
                      fontStyle={isOthers ? "italic" : "normal"}
                      fontSize={12}
                      fontFamily="var(--font-body)"
                    >
                      {payload.value}
                    </text>
                  );
                }}
                axisLine={false}
                tickLine={false}
                width={155}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(6,122,70,.05)" }} />
              <Bar dataKey={metric} radius={[0, 4, 4, 0]} maxBarSize={32}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.supplier}
                    fill={entry.isLongTail ? OTHERS_COLOR : BAR_COLORS[index % BAR_COLORS.length]}
                    opacity={entry.isLongTail ? 0.9 : 1}
                  />
                ))}
                <LabelList
                  dataKey={metric}
                  position="right"
                  formatter={fmtM}
                  style={{ font: "600 11px/14px var(--font-body)", fill: "#676767" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Long Tail legend note */}
          {longTail && (
            <div style={{
              marginTop: 12, paddingTop: 12, borderTop: "1px solid #F0F0F0",
              display: "flex", alignItems: "center", gap: 8,
              font: "400 12px/16px var(--font-body)", color: "#9CA3AF",
            }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, background: OTHERS_COLOR, display: "inline-block", flexShrink: 0 }} />
              <span>
                <strong style={{ color: "#676767" }}>Long Tail</strong>
                {" — "}{longTail.supplierCount} suppliers not in top {topN}, contributing {fmtM(longTail.actualSpend)} ({longTailShare.toFixed(1)}% of total spend)
              </span>
            </div>
          )}
        </div>

        {/* ── Table ──────────────────────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E4E4E4", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #EEE", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ font: "600 14px/20px var(--font-display)", color: "#242424" }}>
              Full Ranking — All {allSuppliers.length} Suppliers
            </div>
            {longTail && (
              <div style={{
                padding: "4px 10px", borderRadius: 6, background: "#F8FAFC",
                border: "1px solid #E4E4E4", font: "400 12px/16px var(--font-body)", color: "#9CA3AF",
              }}>
                Long Tail: {longTail.supplierCount} suppliers · {fmtM(longTail.actualSpend)}
              </div>
            )}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8F8F8" }}>
                  {["#", "Supplier", "Actual Spend", "Awarded Budget", "Utilisation", "Markets", "Categories"].map(h => (
                    <th key={h} style={{
                      padding: "10px 16px", textAlign: h === "#" || h === "Utilisation" || h === "Actual Spend" || h === "Awarded Budget" ? "right" : "left",
                      font: "600 11px/14px var(--font-body)", color: "#676767",
                      textTransform: "uppercase", letterSpacing: ".04em",
                      borderBottom: "1px solid #E4E4E4", whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Top N suppliers */}
                {topSuppliers.map((s, i) => {
                  const utilColor = s.utilPct >= 100 ? "#B30000" : s.utilPct >= 80 ? "#A43700" : s.utilPct >= 60 ? "#067A46" : "#676767";
                  return (
                    <tr key={s.supplier} style={{ borderBottom: "1px solid #F5F5F5" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#FAFAFA"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                    >
                      <td style={{ padding: "10px 16px", textAlign: "right", font: "600 12px/16px var(--font-body)", color: i < 3 ? "#067A46" : "#9CA3AF" }}>
                        {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: BAR_COLORS[i % BAR_COLORS.length], flexShrink: 0 }} />
                          <span style={{ font: "500 13px/18px var(--font-body)", color: "#242424" }}>{s.supplier}</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right", font: "600 13px/18px var(--font-body)", color: "#242424" }}>{fmtM(s.actualSpend)}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right", font: "400 13px/18px var(--font-body)", color: "#676767" }}>{fmtM(s.awardedBudget)}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                          <div style={{ width: 60, height: 5, borderRadius: 3, background: "#F0F0F0", overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(100, s.utilPct)}%`, height: "100%", background: utilColor, borderRadius: 3 }} />
                          </div>
                          <span style={{ font: "600 12px/16px var(--font-body)", color: utilColor, minWidth: 40, textAlign: "right" }}>{s.utilPct.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {s.markets.map(m => (
                            <span key={m} style={{
                              padding: "2px 8px", borderRadius: 20, fontSize: 11,
                              background: "#F0F9F4", color: "#067A46", fontWeight: 500,
                            }}>{m}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: "10px 16px", font: "400 12px/16px var(--font-body)", color: "#676767" }}>
                        {s.categories.join(", ")}
                      </td>
                    </tr>
                  );
                })}

                {/* Long Tail separator + row */}
                {longTail && (
                  <>
                    <tr>
                      <td colSpan={7} style={{
                        padding: "0", background: "#F8FAFC",
                        borderTop: "2px dashed #E4E4E4", borderBottom: "1px solid #E4E4E4",
                      }}>
                        <div style={{ padding: "6px 16px", font: "500 11px/14px var(--font-body)", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".05em", display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 16, height: 2, background: "#CBD5E1", display: "inline-block" }} />
                          Long Tail — {longTail.supplierCount} additional suppliers
                          <span style={{ width: 16, height: 2, background: "#CBD5E1", display: "inline-block" }} />
                        </div>
                      </td>
                    </tr>
                    <tr style={{ background: "#FAFBFC", borderBottom: "1px solid #F0F0F0" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#F3F4F6"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#FAFBFC"}
                    >
                      <td style={{ padding: "12px 16px", textAlign: "right", font: "600 12px/16px var(--font-body)", color: "#9CA3AF" }}>
                        {topN + 1}+
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: OTHERS_COLOR, flexShrink: 0 }} />
                          <div>
                            <span style={{ font: "500 13px/18px var(--font-body)", color: "#676767", fontStyle: "italic" }}>
                              Others (Long Tail)
                            </span>
                            <span style={{
                              marginLeft: 8, padding: "1px 7px", borderRadius: 10,
                              background: "#F1F5F9", font: "500 11px/16px var(--font-body)", color: "#64748B",
                            }}>
                              {longTail.supplierCount} suppliers
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", font: "600 13px/18px var(--font-body)", color: "#676767" }}>{fmtM(longTail.actualSpend)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", font: "400 13px/18px var(--font-body)", color: "#9CA3AF" }}>{fmtM(longTail.awardedBudget)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                          <div style={{ width: 60, height: 5, borderRadius: 3, background: "#F0F0F0", overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(100, longTail.utilPct)}%`, height: "100%", background: "#CBD5E1", borderRadius: 3 }} />
                          </div>
                          <span style={{ font: "600 12px/16px var(--font-body)", color: "#9CA3AF", minWidth: 40, textAlign: "right" }}>
                            {longTail.utilPct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", font: "400 12px/16px var(--font-body)", color: "#9CA3AF", fontStyle: "italic" }}>
                        Multiple
                      </td>
                      <td style={{ padding: "12px 16px", font: "400 12px/16px var(--font-body)", color: "#9CA3AF", fontStyle: "italic" }}>
                        Multiple
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
