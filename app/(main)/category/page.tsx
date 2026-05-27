"use client";
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from "recharts";
import type { CategoryOverviewRow } from "@/app/api/category-overview/route";
import type { CategorySupplierRow } from "@/app/api/category-suppliers/route";

// ── Constants ─────────────────────────────────────────────────────────────────
const MARKETS = [
  { code: "DACH",    flag: "🇩🇪" },
  { code: "US",      flag: "🇺🇸" },
  { code: "DKSE",    flag: "🇩🇰" },
  { code: "BENELUX", flag: "🇧🇪" },
  { code: "FR",      flag: "🇫🇷" },
  { code: "GB",      flag: "🇬🇧" },
  { code: "AU",      flag: "🇦🇺" },
  { code: "NZ",      flag: "🇳🇿" },
  { code: "IE",      flag: "🇮🇪" },
  { code: "CA",      flag: "🇨🇦" },
];

const MARKET_COLORS: Record<string, string> = {
  DACH: "#067A46", US: "#1565C0", DKSE: "#7C3AED", BENELUX: "#D97706",
  FR: "#6A1B9A", GB: "#C62828", AU: "#00838F", NZ: "#558B2F", IE: "#37474F", CA: "#0277BD",
};

const CATEGORIES = [
  { code: "PTN", label: "Proteins"    },
  { code: "DAI", label: "Dairy"       },
  { code: "PHF", label: "Produce"     },
  { code: "BAK", label: "Bakery"      },
  { code: "DRY", label: "Dry Goods"   },
  { code: "SPI", label: "Spices"      },
  { code: "CON", label: "Convenience" },
  { code: "PRO", label: "Processed"   },
];

const YEARS = [2024, 2025, 2026];
const QUARTERS = [1, 2, 3, 4];

const BAR_BLUE   = "#1565C0";
const TOTAL_GREY = "#94A3B8";

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtSpend = (n: number) =>
  n >= 1_000_000 ? `€${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `€${(n / 1_000).toFixed(0)}k`
  : `€${n.toFixed(0)}`;

const fmtVol = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(0)}k`
  : `${n.toFixed(0)}`;

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, empty = false,
}: { label: string; value?: string | number; empty?: boolean }) {
  return (
    <div style={{
      flex: 1, minWidth: 100,
      border: `1.5px dashed ${empty ? "#D1D5DB" : "#1565C0"}`,
      borderRadius: 8, padding: "12px 14px",
      background: empty ? "#F9FAFB" : "#fff",
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      {empty ? (
        <div style={{ color: "#D1D5DB", font: "400 12px/16px var(--font-body)", textAlign: "center", paddingTop: 8 }}>
          —
        </div>
      ) : (
        <>
          <div style={{ font: "700 22px/28px var(--font-display)", color: "#1565C0" }}>
            {value}
          </div>
          <div style={{ font: "400 11px/14px var(--font-body)", color: "#6B7280", textTransform: "uppercase", letterSpacing: ".04em" }}>
            {label}
          </div>
        </>
      )}
    </div>
  );
}

// ── KPI Section ───────────────────────────────────────────────────────────────
function KpiSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{
        background: "#1E3A5F", color: "#fff",
        font: "600 13px/18px var(--font-body)", letterSpacing: ".04em", textTransform: "uppercase",
        padding: "10px 14px", borderRadius: "8px 8px 0 0",
      }}>
        {title}
      </div>
      <div style={{
        border: "1px solid #E5E7EB", borderTop: "none",
        borderRadius: "0 0 8px 8px", padding: "12px",
        display: "flex", gap: 10,
        background: "#fff",
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Custom bar label (horizontal — appears to the right of the bar) ───────────
function SpendLabel({ x, y, width, height, value, isTotal }: { x?: number; y?: number; width?: number; height?: number; value?: number; isTotal?: boolean }) {
  if (!value) return null;
  return (
    <text
      x={(x ?? 0) + (width ?? 0) + 6}
      y={(y ?? 0) + (height ?? 0) / 2}
      textAnchor="start"
      dominantBaseline="middle"
      fill={isTotal ? TOTAL_GREY : BAR_BLUE}
      style={{ font: "600 11px var(--font-body)" }}
    >
      {fmtSpend(value)}
    </text>
  );
}

function VolLabel({ x, y, width, height, value, isTotal }: { x?: number; y?: number; width?: number; height?: number; value?: number; isTotal?: boolean }) {
  if (!value) return null;
  return (
    <text
      x={(x ?? 0) + (width ?? 0) + 6}
      y={(y ?? 0) + (height ?? 0) / 2}
      textAnchor="start"
      dominantBaseline="middle"
      fill={isTotal ? TOTAL_GREY : BAR_BLUE}
      style={{ font: "600 11px var(--font-body)" }}
    >
      {fmtVol(value)}
    </text>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CategoryOverviewPage() {
  const [selectedCat,    setSelectedCat]    = useState("PTN");
  const [year,           setYear]           = useState(2026);
  const [timeframe,      setTimeframe]      = useState<"year" | "quarter">("year");
  const [quarter,        setQuarter]        = useState(1);
  const [filterMarkets,  setFilterMarkets]  = useState<string[]>(
    MARKETS.filter(m => m.code !== "US").map(m => m.code)
  );
  const [filterSubCats,  setFilterSubCats]  = useState<string[]>([]);
  const [rows,           setRows]           = useState<CategoryOverviewRow[]>([]);
  const [dataSource,     setDataSource]     = useState<"loading" | "databricks" | "static">("loading");
  const [chartMode,      setChartMode]      = useState<"spend" | "volume">("spend");
  const [suppliers,      setSuppliers]      = useState<CategorySupplierRow[]>([]);
  const [suppLoading,    setSuppLoading]    = useState(false);
  const [showBrief,      setShowBrief]      = useState(false);
  const [brief,          setBrief]          = useState('');
  const [briefLoading,   setBriefLoading]   = useState(false);

  // Debounce ref — avoids firing a Databricks query on every fast market-toggle click
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback((
    y: number, cat: string, tf: "year" | "quarter", q: number, mkts: string[], subCats: string[]
  ) => {
    setDataSource("loading");
    const qParam  = tf === "quarter" ? `&quarter=${q}` : "";
    const mParam  = mkts.length     ? `&market=${mkts.join(",")}` : "";
    const scParam = subCats.length  ? `&subCategory=${subCats.map(encodeURIComponent).join(",")}` : "";
    const base    = `year=${y}&category=${cat}${qParam}${mParam}`;

    // Fetch overview + suppliers in parallel
    setSuppLoading(true);
    Promise.all([
      fetch(`/api/category-overview?${base}`)
        .then(res => res.json().then((data: CategoryOverviewRow[]) => ({ data, src: res.headers.get("X-Data-Source") }))),
      fetch(`/api/category-suppliers?${base}${scParam}`)
        .then(res => res.json() as Promise<CategorySupplierRow[]>),
    ])
      .then(([{ data, src }, supps]) => {
        setRows(data);
        setDataSource(src?.startsWith("databricks") ? "databricks" : "static");
        setSuppliers(supps);
      })
      .catch(() => { setRows([]); setDataSource("static"); setSuppliers([]); })
      .finally(() => setSuppLoading(false));
  }, []);

  useEffect(() => {
    setFilterSubCats([]);
    // Debounce so rapid market-filter clicks collapse into one request
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(
      () => loadData(year, selectedCat, timeframe, quarter, filterMarkets, []),
      280,
    );
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, selectedCat, timeframe, quarter, filterMarkets]);

  // Re-fetch suppliers when sub-cat filter changes (overview already covers full data)
  useEffect(() => {
    if (dataSource === "loading") return;
    setSuppLoading(true);
    const qParam  = timeframe === "quarter" ? `&quarter=${quarter}` : "";
    const mParam  = filterMarkets.length ? `&market=${filterMarkets.join(",")}` : "";
    const scParam = filterSubCats.length ? `&subCategory=${filterSubCats.map(encodeURIComponent).join(",")}` : "";
    fetch(`/api/category-suppliers?year=${year}&category=${selectedCat}${qParam}${mParam}${scParam}`)
      .then(res => res.json() as Promise<CategorySupplierRow[]>)
      .then(setSuppliers)
      .catch(() => setSuppliers([]))
      .finally(() => setSuppLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSubCats]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const allCatRows = useMemo(() =>
    rows.filter(r => r.category === selectedCat)
        .sort((a, b) => b.spendEur - a.spendEur),
  [rows, selectedCat]);

  // Sub-category options from loaded data (sorted by spend desc)
  const subCatOptions = useMemo(() =>
    allCatRows.map(r => r.subCategory).filter(Boolean),
  [allCatRows]);

  const catRows = useMemo(() =>
    filterSubCats.length > 0
      ? allCatRows.filter(r => filterSubCats.includes(r.subCategory))
      : allCatRows,
  [allCatRows, filterSubCats]);

  const spendChartData = useMemo(() => {
    const totalSpend = catRows.reduce((s, r) => s + r.spendEur, 0);
    const bars = catRows.map(r => ({
      name:    r.subCategory,
      value:   r.spendEur,
      isTotal: false,
    }));
    if (bars.length > 0) {
      bars.push({ name: "TOTAL", value: totalSpend, isTotal: true });
    }
    return bars;
  }, [catRows]);

  const volChartData = useMemo(() => {
    const totalUnits = catRows.reduce((s, r) => s + r.units, 0);
    const bars = catRows.map(r => ({
      name:    r.subCategory,
      value:   r.units,
      isTotal: false,
    }));
    if (bars.length > 0) {
      bars.push({ name: "TOTAL", value: totalUnits, isTotal: true });
    }
    return bars;
  }, [catRows]);

  // KPI aggregates
  const totalSuppliers = useMemo(() => {
    const s = new Set<string>();
    catRows.forEach(r => { for (let i = 0; i < r.suppliers; i++) s.add(`${r.subCategory}-${i}`); });
    // Use max per category as unique supplier count is not deduped across subcats
    return catRows.reduce((sum, r) => sum + r.suppliers, 0);
  }, [catRows]);

  const totalFamilies = useMemo(() =>
    catRows.reduce((s, r) => s + r.families, 0), [catRows]);

  const totalSkus = useMemo(() =>
    catRows.reduce((s, r) => s + r.skus, 0), [catRows]);

  const catLabel = CATEGORIES.find(c => c.code === selectedCat)?.label ?? selectedCat;
  const timeLabel = timeframe === "quarter" ? `Q${quarter} ${year}` : `${year}`;
  const chartTitle = `${catLabel} — ${timeLabel}`;

  // Re-rank suppliers based on active toggle so the list always shows high → low
  const rankedSuppliers = useMemo(() =>
    [...suppliers].sort((a, b) =>
      chartMode === "spend" ? b.spendEur - a.spendEur : b.units - a.units
    ),
  [suppliers, chartMode]);

  // Give 30% headroom on the value axis so labels don't clip
  const xMax = (data: { value: number }[]) => {
    const m = Math.max(...data.map(d => d.value), 0);
    return Math.ceil(m * 1.35);
  };

  // Dynamic chart height: 34px per bar, min 240px
  const chartH = (data: { value: number }[]) =>
    Math.max(240, data.length * 34 + 20);

  // ── Executive Brief ──────────────────────────────────────────────────────────
  const buildContext = useCallback(() => {
    const lines: string[] = [];
    const timeLabel = timeframe === "quarter" ? `Q${quarter} ${year}` : `${year}`;
    const mktLabel  = filterMarkets.length === 0 ? "All Markets" : filterMarkets.join(", ");
    const scLabel   = filterSubCats.length  === 0 ? "All Sub-categories" : filterSubCats.join(", ");

    lines.push(`## Category Spend Overview — ${catLabel} · ${timeLabel}`);
    lines.push(`Filters: Markets=${mktLabel}, Sub-categories=${scLabel}`);
    lines.push('');

    const totalSpend = catRows.reduce((s, r) => s + r.spendEur, 0);
    const totalUnits = catRows.reduce((s, r) => s + r.units, 0);
    lines.push(`## Key Metrics`);
    lines.push(`- Total Spend (EUR): €${totalSpend.toLocaleString('de-DE')}`);
    lines.push(`- Total Units Ordered: ${totalUnits.toLocaleString('de-DE')}`);
    lines.push(`- Total Suppliers: ${totalSuppliers.toLocaleString()}`);
    lines.push(`- Active SKUs: ${totalSkus.toLocaleString()}`);
    lines.push(`- Product Families: ${totalFamilies.toLocaleString()}`);
    lines.push('');

    lines.push(`## Sub-category Breakdown (ranked by spend)`);
    lines.push(`Sub-category | Spend (EUR) | Units | Suppliers | SKUs | Families`);
    catRows.forEach(r => {
      lines.push(`${r.subCategory} | €${r.spendEur.toLocaleString('de-DE')} | ${r.units.toLocaleString('de-DE')} | ${r.suppliers} | ${r.skus} | ${r.families}`);
    });

    return lines.join('\n');
  }, [catLabel, timeframe, quarter, year, filterMarkets, filterSubCats, catRows, totalSuppliers, totalSkus, totalFamilies]);

  const briefContextLabel = useMemo(() => [
    catLabel,
    filterMarkets.length === 0 ? "All Markets" : filterMarkets.length === 1 ? filterMarkets[0] : `${filterMarkets.length} markets`,
    timeframe === "quarter" ? `Q${quarter} ${year}` : `${year}`,
  ].join(" · "), [catLabel, filterMarkets, timeframe, quarter, year]);

  async function generateBrief() {
    setBriefLoading(true);
    setShowBrief(true);
    setBrief('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Generate a concise executive briefing with these sections: (1) Headline Numbers — total spend and units ordered; (2) Sub-category Performance — top 3 by spend with EUR figures, and any sub-categories with unusually low volume vs spend; (3) Supply Complexity — supplier count, SKU count, product families and what this means for risk; (4) Key Observations — 2-3 notable patterns; (5) Recommended Actions — exactly 3 bullet points for the category manager. Use bold for numbers. Be specific with €EUR figures.',
          context: buildContext(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setBrief(`⚠️ ${data.error || 'Failed to generate brief — please try again.'}`);
      } else {
        setBrief(data.answer || 'No content returned.');
      }
    } catch (err) {
      setBrief(`⚠️ Network error — ${err instanceof Error ? err.message : 'please try again.'}`);
    } finally {
      setBriefLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{ background: "#fff", borderBottom: "1px solid #EEE", padding: "22px 32px" }}>
        <div style={{ font: "400 12px/16px var(--font-body)", color: "#676767", marginBottom: 6, display: "flex", gap: 6 }}>
          <span>Category Management</span>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: "#242424" }}>Overview</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ font: "500 30px/38px var(--font-display)", color: "#242424", margin: 0 }}>
              Category Spend Overview
            </h1>
            <div style={{ font: "400 13px/18px var(--font-body)", color: "#676767", marginTop: 4, display: "flex", gap: 10, alignItems: "center" }}>
              <span>Spend & volume by subcategory</span>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#BBB", display: "inline-block" }} />
              {dataSource === "loading"    && <span style={{ color: "#E8820C" }}>⟳ Loading…</span>}
              {dataSource === "databricks" && <span style={{ color: "#067A46" }}>● Live data</span>}
              {dataSource === "static"     && <span style={{ color: "#AAAAAA" }}>● Sample data</span>}
            </div>
          </div>
          <button
            onClick={generateBrief}
            disabled={dataSource === "loading"}
            style={{
              padding: "9px 20px",
              background: briefLoading ? "#166534" : "linear-gradient(135deg, #067A46 0%, #0A9E5C 100%)",
              color: "#fff",
              borderRadius: 8,
              font: "700 13px/18px var(--font-body)",
              border: "none",
              cursor: briefLoading || dataSource === "loading" ? "wait" : "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(6,122,70,0.35)",
              letterSpacing: ".01em",
              display: "flex", alignItems: "center", gap: 7,
              transition: "box-shadow 150ms, transform 150ms",
              opacity: dataSource === "loading" ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (dataSource !== "loading") { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(6,122,70,0.5)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(6,122,70,0.35)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
          >
            {briefLoading ? "⟳ Generating…" : "📋 Executive Brief"}
          </button>
        </div>
      </header>

      <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20, flex: 1, overflowY: "auto" }}>

        {/* ── Controls ───────────────────────────────────────────────────── */}
        <div style={{
          background: "#fff", border: "1px solid #E4E4E4", borderRadius: 10,
          padding: "14px 20px", display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap",
        }}>

          {/* Category selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ font: "500 11px/14px var(--font-body)", color: "#676767", textTransform: "uppercase", letterSpacing: ".04em" }}>Category</span>
            <select
              value={selectedCat}
              onChange={e => setSelectedCat(e.target.value)}
              style={{
                padding: "7px 12px", borderRadius: 8,
                border: "1.5px solid #067A46", background: "#F6FDE9",
                font: "600 13px/18px var(--font-body)", color: "#067A46", cursor: "pointer",
              }}
            >
              {CATEGORIES.map(c => (
                <option key={c.code} value={c.code}>{c.label} ({c.code})</option>
              ))}
            </select>
          </div>

          <div style={{ width: 1, height: 32, background: "#E4E4E4" }} />

          {/* Timeframe toggle */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ font: "500 11px/14px var(--font-body)", color: "#676767", textTransform: "uppercase", letterSpacing: ".04em" }}>Timeframe</span>
            <div style={{ display: "flex", border: "1px solid #E4E4E4", borderRadius: 8, overflow: "hidden" }}>
              {(["year", "quarter"] as const).map(tf => (
                <button key={tf} onClick={() => setTimeframe(tf)} style={{
                  padding: "7px 16px", border: "none", cursor: "pointer",
                  font: "500 12px/16px var(--font-body)",
                  background: timeframe === tf ? "#1E3A5F" : "#fff",
                  color:      timeframe === tf ? "#fff"    : "#676767",
                  borderRight: tf === "year" ? "1px solid #E4E4E4" : "none",
                  transition: "all 120ms",
                }}>
                  {tf === "year" ? "Year" : "Quarter"}
                </button>
              ))}
            </div>
          </div>

          {/* Year selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ font: "500 11px/14px var(--font-body)", color: "#676767", textTransform: "uppercase", letterSpacing: ".04em" }}>Year</span>
            <div style={{ display: "flex", border: "1px solid #E4E4E4", borderRadius: 8, overflow: "hidden" }}>
              {YEARS.map(y => (
                <button key={y} onClick={() => setYear(y)} style={{
                  padding: "7px 16px", border: "none", cursor: "pointer",
                  font: "500 12px/16px var(--font-body)",
                  background: year === y ? "#1E3A5F" : "#fff",
                  color:      year === y ? "#fff"    : "#676767",
                  borderRight: y !== YEARS[YEARS.length - 1] ? "1px solid #E4E4E4" : "none",
                  transition: "all 120ms",
                }}>
                  {y}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: 1, height: 32, background: "#E4E4E4" }} />

          {/* Market filter */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ font: "500 11px/14px var(--font-body)", color: "#676767", textTransform: "uppercase", letterSpacing: ".04em" }}>
              Market
              {filterMarkets.length > 0 && (
                <button
                  onClick={() => setFilterMarkets([])}
                  style={{ marginLeft: 8, border: 0, background: "transparent", color: "#9CA3AF", cursor: "pointer", font: "400 10px var(--font-body)" }}
                >
                  ✕ Clear
                </button>
              )}
            </span>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {MARKETS.map(m => {
                const active = filterMarkets.includes(m.code);
                const color  = MARKET_COLORS[m.code] ?? "#676767";
                return (
                  <button
                    key={m.code}
                    onClick={() => setFilterMarkets(prev =>
                      active ? prev.filter(x => x !== m.code) : [...prev, m.code]
                    )}
                    style={{
                      padding: "5px 10px", borderRadius: 20, cursor: "pointer",
                      border: `1.5px solid ${active ? color : "#E4E4E4"}`,
                      background: active ? color + "18" : "#fff",
                      color: active ? color : "#676767",
                      font: `${active ? 600 : 400} 11px/16px var(--font-body)`,
                      transition: "all 120ms",
                    }}
                  >
                    {m.flag} {m.code}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ width: 1, height: 32, background: "#E4E4E4" }} />

          {/* Sub-category filter */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ font: "500 11px/14px var(--font-body)", color: "#676767", textTransform: "uppercase", letterSpacing: ".04em" }}>
              Sub-Category
              {filterSubCats.length > 0 && (
                <button
                  onClick={() => setFilterSubCats([])}
                  style={{ marginLeft: 8, border: 0, background: "transparent", color: "#9CA3AF", cursor: "pointer", font: "400 10px var(--font-body)" }}
                >
                  ✕ Clear
                </button>
              )}
            </span>
            {subCatOptions.length === 0 ? (
              <span style={{ font: "400 11px/16px var(--font-body)", color: "#D1D5DB" }}>Loading…</span>
            ) : (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", maxWidth: 620 }}>
                {subCatOptions.map(sc => {
                  const active = filterSubCats.includes(sc);
                  return (
                    <button
                      key={sc}
                      onClick={() => setFilterSubCats(prev =>
                        active ? prev.filter(x => x !== sc) : [...prev, sc]
                      )}
                      style={{
                        padding: "5px 10px", borderRadius: 20, cursor: "pointer",
                        border: `1.5px solid ${active ? "#1565C0" : "#E4E4E4"}`,
                        background: active ? "#1565C018" : "#fff",
                        color: active ? "#1565C0" : "#676767",
                        font: `${active ? 600 : 400} 11px/16px var(--font-body)`,
                        transition: "all 120ms",
                      }}
                    >
                      {sc}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quarter selector — only when Quarter timeframe active */}
          {timeframe === "quarter" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ font: "500 11px/14px var(--font-body)", color: "#676767", textTransform: "uppercase", letterSpacing: ".04em" }}>Quarter</span>
              <div style={{ display: "flex", border: "1px solid #E4E4E4", borderRadius: 8, overflow: "hidden" }}>
                {QUARTERS.map(q => (
                  <button key={q} onClick={() => setQuarter(q)} style={{
                    padding: "7px 14px", border: "none", cursor: "pointer",
                    font: "500 12px/16px var(--font-body)",
                    background: quarter === q ? "#1E3A5F" : "#fff",
                    color:      quarter === q ? "#fff"    : "#676767",
                    borderRight: q < 4 ? "1px solid #E4E4E4" : "none",
                    transition: "all 120ms",
                  }}>
                    Q{q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Chart + Top Suppliers ───────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16, alignItems: "start" }}>

          {/* Single toggled chart */}
          <div style={{ background: "#fff", border: "1px solid #E4E4E4", borderRadius: 10, padding: "20px 20px 16px" }}>
            {/* Chart header + toggle */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
              <div>
                <div style={{ font: "600 13px/18px var(--font-display)", color: "#242424" }}>
                  {catLabel} — Sub-category Breakdown
                </div>
                <div style={{ font: "400 11px/14px var(--font-body)", color: "#9CA3AF", marginTop: 3 }}>
                  {chartMode === "spend" ? "In EUR" : "In units"} · {timeLabel}
                </div>
              </div>
              {/* Spend / Volume toggle */}
              <div style={{ display: "flex", border: "1px solid #E4E4E4", borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                {(["spend", "volume"] as const).map(m => (
                  <button key={m} onClick={() => setChartMode(m)} style={{
                    padding: "6px 14px", border: "none", cursor: "pointer",
                    font: "500 12px/16px var(--font-body)",
                    background: chartMode === m ? "#1E3A5F" : "#fff",
                    color:      chartMode === m ? "#fff"    : "#676767",
                    borderRight: m === "spend" ? "1px solid #E4E4E4" : "none",
                    transition: "all 120ms",
                  }}>
                    {m === "spend" ? "€ Spend" : "# Volume"}
                  </button>
                ))}
              </div>
            </div>

            {dataSource === "loading" ? (
              <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "#BBB", font: "400 13px/18px var(--font-body)" }}>
                Loading…
              </div>
            ) : (chartMode === "spend" ? spendChartData : volChartData).length === 0 ? (
              <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "#BBB", font: "400 13px/18px var(--font-body)" }}>
                No data for {catLabel} · {timeLabel}
              </div>
            ) : (() => {
              const chartData = chartMode === "spend" ? spendChartData : volChartData;
              const fmt       = chartMode === "spend" ? fmtSpend : fmtVol;
              const LabelComp = chartMode === "spend" ? SpendLabel : VolLabel;
              return (
                <ResponsiveContainer width="100%" height={chartH(chartData)}>
                  <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 70, left: 0, bottom: 4 }} barCategoryGap="30%">
                    <CartesianGrid horizontal={false} stroke="#F0F0F0" />
                    <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} domain={[0, xMax(chartData)]} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#374151" }} axisLine={false} tickLine={false} width={150} />
                    <Tooltip formatter={(v: number) => [fmt(v), chartMode === "spend" ? "Spend" : "Units"]} contentStyle={{ borderRadius: 8, border: "1px solid #E4E4E4", font: "400 12px var(--font-body)" }} />
                    <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                      {chartData.map((d, i) => <Cell key={i} fill={d.isTotal ? TOTAL_GREY : BAR_BLUE} />)}
                      <LabelList dataKey="value" content={(props) => {
                        const { x, y, width, height, value, index } = props as { x?: number; y?: number; width?: number; height?: number; value?: number; index?: number };
                        const isTotal = index !== undefined && chartData[index]?.isTotal;
                        return <LabelComp x={x} y={y} width={width} height={height} value={value} isTotal={isTotal} />;
                      }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>

          {/* Top 10 Suppliers */}
          <div style={{ background: "#fff", border: "1px solid #E4E4E4", borderRadius: 10, padding: "20px 20px 16px" }}>
            <div style={{ font: "600 13px/18px var(--font-display)", color: "#242424", marginBottom: 3 }}>
              Top 10 Suppliers
            </div>
            <div style={{ font: "400 11px/14px var(--font-body)", color: "#9CA3AF", marginBottom: 16 }}>
              {catLabel}{filterSubCats.length > 0 ? ` · ${filterSubCats.join(", ")}` : ""} · {timeLabel}
            </div>

            {suppLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[90, 75, 82, 68, 78, 60, 70, 55, 65, 50].map((w, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 18, font: "600 11px var(--font-body)", color: "#D1D5DB", textAlign: "right" }}>{i + 1}</div>
                    <div style={{ flex: 1, height: 12, background: "#F3F4F6", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${w}%`, height: "100%", background: "#E5E7EB", borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : rankedSuppliers.length === 0 ? (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#BBB", font: "400 13px/18px var(--font-body)" }}>
                No supplier data
              </div>
            ) : (() => {
              const maxVal = Math.max(...rankedSuppliers.map(s => chartMode === "spend" ? s.spendEur : s.units));
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  {rankedSuppliers.map((s, i) => {
                    const val = chartMode === "spend" ? s.spendEur : s.units;
                    const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                    return (
                      <div key={s.supplier}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <span style={{ font: "600 11px/14px var(--font-body)", color: "#9CA3AF", width: 18, textAlign: "right", flexShrink: 0 }}>
                              {i + 1}
                            </span>
                            <span style={{ font: "500 12px/16px var(--font-body)", color: "#242424" }}>
                              {s.supplier}
                            </span>
                          </div>
                          <span style={{ font: "600 11px/14px var(--font-body)", color: BAR_BLUE, flexShrink: 0, marginLeft: 8 }}>
                            {chartMode === "spend" ? fmtSpend(s.spendEur) : fmtVol(s.units)}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 18, flexShrink: 0 }} />
                          <div style={{ flex: 1, height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: BAR_BLUE, borderRadius: 3, transition: "width 400ms ease" }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── KPI Sections ───────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>

          {/* Supply */}
          <KpiSection title="Supply">
            <KpiCard label="Total Suppliers" value={totalSuppliers.toLocaleString()} />
          </KpiSection>

          {/* Complexity */}
          <KpiSection title="Complexity">
            <KpiCard label="Product Families" value={totalFamilies.toLocaleString()} />
            <KpiCard label="Active SKUs" value={totalSkus.toLocaleString()} />
          </KpiSection>

          {/* Performance */}
          <KpiSection title="Performance">
            <div style={{
              padding: "10px 16px",
              color: "#9CA3AF",
              font: "400 12px/18px var(--font-body)",
              fontStyle: "italic",
            }}>
              Coming Soon
            </div>
          </KpiSection>
        </div>

      </div>

      {/* ── Executive Brief Panel ──────────────────────────────────────── */}
      {showBrief && (
        <div style={{
          position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 1100,
          width: 480, background: "#fff", borderLeft: "1px solid #E4E4E4",
          boxShadow: "-8px 0 32px rgba(0,0,0,.1)", display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #EEE", background: "#1D4ED8", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>📋</span>
            <div style={{ flex: 1 }}>
              <div style={{ font: "600 14px/18px var(--font-body)", color: "#fff" }}>Executive Brief</div>
              <div style={{ font: "400 11px/14px var(--font-body)", color: "rgba(255,255,255,.7)" }}>
                {briefContextLabel} · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>
            <button onClick={() => setShowBrief(false)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "rgba(255,255,255,.8)", fontSize: 20, padding: 4, lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {briefLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 40 }}>
                <div style={{ font: "400 13px/20px var(--font-body)", color: "#888", textAlign: "center", marginBottom: 16 }}>Generating brief…</div>
                {[80, 70, 90, 65, 75].map((w, i) => (
                  <div key={i} style={{ width: `${w}%`, height: 14, background: "#F0F0F0", borderRadius: 6 }} />
                ))}
              </div>
            ) : (
              <ReactMarkdown components={{
                h2:     ({ children }) => <h2 style={{ font: "600 16px/22px var(--font-display)", color: "#1D4ED8", borderBottom: "2px solid #DBEAFE", paddingBottom: 8, marginBottom: 12, marginTop: 24 }}>{children}</h2>,
                h3:     ({ children }) => <h3 style={{ font: "600 14px/20px var(--font-body)", color: "#242424", marginBottom: 8, marginTop: 16 }}>{children}</h3>,
                p:      ({ children }) => <p style={{ margin: "0 0 10px", font: "400 13px/20px var(--font-body)", color: "#374151" }}>{children}</p>,
                ul:     ({ children }) => <ul style={{ margin: "4px 0 12px", paddingLeft: 20 }}>{children}</ul>,
                ol:     ({ children }) => <ol style={{ margin: "4px 0 12px", paddingLeft: 20 }}>{children}</ol>,
                li:     ({ children }) => <li style={{ font: "400 13px/20px var(--font-body)", color: "#374151", marginBottom: 4 }}>{children}</li>,
                strong: ({ children }) => <strong style={{ fontWeight: 600, color: "#1D4ED8" }}>{children}</strong>,
              }}>
                {brief}
              </ReactMarkdown>
            )}
          </div>
          <div style={{ padding: "14px 20px", borderTop: "1px solid #EEE", display: "flex", gap: 10 }}>
            <button onClick={generateBrief} disabled={briefLoading} style={{ flex: 1, padding: "9px 14px", background: briefLoading ? "#93C5FD" : "#1D4ED8", color: "#fff", borderRadius: 8, border: "none", font: "600 13px/18px var(--font-body)", cursor: briefLoading ? "default" : "pointer" }}>
              ↺ Regenerate
            </button>
            <button onClick={() => setShowBrief(false)} style={{ padding: "9px 16px", background: "#F4F4F4", color: "#4B4B4B", borderRadius: 8, border: "none", font: "600 13px/18px var(--font-body)", cursor: "pointer" }}>
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
