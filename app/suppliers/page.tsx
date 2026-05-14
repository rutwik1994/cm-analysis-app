"use client";

import React, { useState, useMemo } from "react";
import { ROWS, SUPPLIER_COLOR, computeSupplierSplit } from "@/lib/data";
import type { SpendRow } from "@/lib/data";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtEur = (n: number) => `€${n.toLocaleString("de-DE")}`;
const fmtK   = (n: number) => n >= 1_000_000 ? `€${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `€${(n / 1000).toFixed(1)}k` : `€${n}`;

// ── Types ─────────────────────────────────────────────────────────────────────
interface SupplierRecord {
  supplier: string;
  category: string;
  market: string;
  categoryManager: string;
  actualSpend: number;
  awardedSpend: number;
  utilPct: number;
  adherencePct: number;
  budgetRisk: string;
  performanceScore: number;
  status: "critical" | "at-risk" | "on-track" | "under-delivering";
}

// ── Derive supplier records from ROWS ─────────────────────────────────────────
function buildSupplierRecords(rows: SpendRow[]): SupplierRecord[] {
  const map = new Map<
    string,
    {
      supplier: string;
      category: string;
      market: string;
      categoryManager: string;
      actualSpend: number;
      awardedSpend: number;
      adherenceSum: number;
      adherenceCount: number;
      budgetRisk: string;
    }
  >();

  for (const r of rows) {
    const cur = map.get(r.supplier);
    if (!cur) {
      map.set(r.supplier, {
        supplier: r.supplier,
        category: r.category,
        market: r.market,
        categoryManager: r.categoryManager,
        actualSpend: r.cumulativeActualSpendEur,
        awardedSpend: r.cumulativeAwardedSpendEur,
        adherenceSum: r.adherencePct > 0 ? r.adherencePct : 0,
        adherenceCount: r.adherencePct > 0 ? 1 : 0,
        budgetRisk: r.budgetRisk,
      });
    } else {
      // Take max cumulative values
      if (r.cumulativeActualSpendEur > cur.actualSpend) cur.actualSpend = r.cumulativeActualSpendEur;
      if (r.cumulativeAwardedSpendEur > cur.awardedSpend) cur.awardedSpend = r.cumulativeAwardedSpendEur;
      if (r.adherencePct > 0) {
        cur.adherenceSum += r.adherencePct;
        cur.adherenceCount++;
      }
      // Use the latest budgetRisk (last row wins for latest reading)
      cur.budgetRisk = r.budgetRisk;
    }
  }

  return [...map.values()].map((d) => {
    const utilPct = d.awardedSpend > 0 ? Math.round((d.actualSpend / d.awardedSpend) * 100) : 0;
    const adherencePct = d.adherenceCount > 0 ? Math.round(d.adherenceSum / d.adherenceCount) : 0;

    // Performance score
    let score = 100;
    if (utilPct > 90) score -= 30;
    else if (utilPct > 80) score -= 15;
    if (utilPct < 30) score -= 20;
    score += Math.round((adherencePct / 100) * 30);
    if (d.budgetRisk === "High") score -= 10;
    else if (d.budgetRisk === "Medium") score -= 5;
    score = Math.max(0, Math.min(100, score));

    const status: SupplierRecord["status"] =
      utilPct >= 90 ? "critical"
      : utilPct >= 80 ? "at-risk"
      : utilPct < 40 ? "under-delivering"
      : "on-track";

    return {
      supplier: d.supplier,
      category: d.category,
      market: d.market,
      categoryManager: d.categoryManager,
      actualSpend: d.actualSpend,
      awardedSpend: d.awardedSpend,
      utilPct,
      adherencePct,
      budgetRisk: d.budgetRisk,
      performanceScore: score,
      status,
    };
  });
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: SupplierRecord["status"] }) {
  const configs = {
    critical:          { label: "Critical",         bg: "#FEE2E2", color: "#991B1B", icon: "🔴" },
    "at-risk":         { label: "At Risk",           bg: "#FEF3C7", color: "#92400E", icon: "⚠️" },
    "on-track":        { label: "On Track",          bg: "#DCFCE7", color: "#166534", icon: "✅" },
    "under-delivering":{ label: "Under-Delivering",  bg: "#F1F5F9", color: "#475569", icon: "📉" },
  };
  const c = configs[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 8px", borderRadius: 12,
      background: c.bg, color: c.color,
      font: "600 11px/16px var(--font-body)",
      whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: 10 }}>{c.icon}</span>
      {c.label}
    </span>
  );
}

// ── Utilisation Cell ──────────────────────────────────────────────────────────
function UtilCell({ pct }: { pct: number }) {
  const color = pct >= 90 ? "#DC2626" : pct >= 80 ? "#D97706" : pct >= 40 ? "#067A46" : "#9CA3AF";
  const bg    = pct >= 90 ? "#FEE2E2" : pct >= 80 ? "#FEF3C7" : pct >= 40 ? "#F0FDF4" : "#F3F4F6";
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 8,
      background: bg, color, font: "700 13px/20px var(--font-mono)",
    }}>
      {pct}%
    </span>
  );
}

// ── Performance Bar ───────────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "#067A46" : score >= 60 ? "#D97706" : "#DC2626";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "#E4E4E4", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 4, transition: "width 600ms" }} />
      </div>
      <span style={{ font: "600 12px/18px var(--font-mono)", color: "#242424", minWidth: 28, textAlign: "right" }}>{score}</span>
    </div>
  );
}

// ── Sort Icon ─────────────────────────────────────────────────────────────────
function SortIcon({ dir }: { dir: "asc" | "desc" | null }) {
  if (!dir) return <span style={{ color: "#D1D5DB", marginLeft: 4 }}>⇅</span>;
  return <span style={{ color: "#067A46", marginLeft: 4 }}>{dir === "asc" ? "↑" : "↓"}</span>;
}

// ── Performance Matrix ────────────────────────────────────────────────────────
function PerformanceMatrix({ suppliers }: { suppliers: SupplierRecord[] }) {
  const W = 540, H = 380;
  const PAD = { top: 30, right: 30, bottom: 50, left: 50 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // Scale: X = utilPct (0-110), Y = adherencePct (0-25 — data range)
  const xMin = 0, xMax = 110;
  const yMin = 0, yMax = 25;

  const toX = (v: number) => PAD.left + ((v - xMin) / (xMax - xMin)) * plotW;
  const toY = (v: number) => PAD.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  // Quadrant thresholds
  const xMid = toX(55);
  const yMid = toY(12.5);

  // Stagger labels vertically to reduce overlap between dots at similar positions
  const labelOffsets = new Map<string, number>();
  const sortedForLabels = [...suppliers].sort((a, b) => toX(a.utilPct) - toX(b.utilPct));
  sortedForLabels.forEach((s, i) => {
    // Alternate label positions: above, below, above, below to spread overlapping labels
    labelOffsets.set(s.supplier, i % 2 === 0 ? -10 : 14);
  });

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: "hidden", display: "block" }}>
      {/* Quadrant backgrounds */}
      <rect x={PAD.left} y={PAD.top} width={xMid - PAD.left} height={yMid - PAD.top} fill="#FEF3C7" opacity={0.35} />
      <rect x={xMid} y={PAD.top} width={W - PAD.right - xMid} height={yMid - PAD.top} fill="#DCFCE7" opacity={0.35} />
      <rect x={PAD.left} y={yMid} width={xMid - PAD.left} height={H - PAD.bottom - yMid} fill="#F1F5F9" opacity={0.35} />
      <rect x={xMid} y={yMid} width={W - PAD.right - xMid} height={H - PAD.bottom - yMid} fill="#FEE2E2" opacity={0.35} />

      {/* Quadrant labels */}
      <text x={PAD.left + 8} y={PAD.top + 16} fill="#92400E" fontSize={10} fontWeight={600} opacity={0.7}>Slack</text>
      <text x={xMid + 8} y={PAD.top + 16} fill="#166534" fontSize={10} fontWeight={600} opacity={0.7}>Star</text>
      <text x={PAD.left + 8} y={H - PAD.bottom - 8} fill="#475569" fontSize={10} fontWeight={600} opacity={0.7}>Underperformer</text>
      <text x={xMid + 8} y={H - PAD.bottom - 8} fill="#991B1B" fontSize={10} fontWeight={600} opacity={0.7}>Watch</text>

      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={toX(v)} y1={PAD.top} x2={toX(v)} y2={H - PAD.bottom} stroke="#E4E4E4" strokeDasharray="3,3" />
          <text x={toX(v)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="#9CA3AF">{v}%</text>
        </g>
      ))}
      {[0, 5, 10, 15, 20, 25].map((v) => (
        <g key={v}>
          <line x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)} stroke="#E4E4E4" strokeDasharray="3,3" />
          <text x={PAD.left - 4} y={toY(v) + 4} textAnchor="end" fontSize={9} fill="#9CA3AF">{v}%</text>
        </g>
      ))}

      {/* Mid crosshair */}
      <line x1={xMid} y1={PAD.top} x2={xMid} y2={H - PAD.bottom} stroke="#9CA3AF" strokeDasharray="4,3" strokeWidth={1.5} />
      <line x1={PAD.left} y1={yMid} x2={W - PAD.right} y2={yMid} stroke="#9CA3AF" strokeDasharray="4,3" strokeWidth={1.5} />

      {/* Axes labels */}
      <text x={PAD.left + plotW / 2} y={H - 4} textAnchor="middle" fontSize={11} fill="#676767" fontWeight={600}>Budget Utilisation %</text>
      <text x={12} y={PAD.top + plotH / 2} textAnchor="middle" fontSize={11} fill="#676767" fontWeight={600} transform={`rotate(-90, 12, ${PAD.top + plotH / 2})`}>Adherence %</text>

      {/* Supplier dots */}
      {suppliers.map((s) => {
        const cx = toX(s.utilPct);
        const cy = toY(s.adherencePct);
        const color = SUPPLIER_COLOR[s.supplier] ?? "#067A46";
        const shortName = s.supplier.length > 14 ? s.supplier.slice(0, 12) + "…" : s.supplier;
        const labelDy = labelOffsets.get(s.supplier) ?? -10;
        // Clamp label X so it doesn't overflow the right edge
        const labelX = Math.min(cx, W - PAD.right - shortName.length * 4.2);
        // Clamp label Y so it stays inside the plot bounds
        const labelY = Math.max(PAD.top + 8, Math.min(H - PAD.bottom - 2, cy + labelDy));
        return (
          <g key={s.supplier}>
            <circle cx={cx} cy={cy} r={6} fill={color} opacity={0.9} />
            <circle cx={cx} cy={cy} r={6} fill="none" stroke="#fff" strokeWidth={1.5} />
            <title>{s.supplier} — {s.utilPct}% util, {s.adherencePct}% adherence</title>
            <text x={labelX + 8} y={labelY} fontSize={8.5} fill="#242424" fontWeight={600} style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3, strokeLinejoin: "round" }}>{shortName}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Category Manager Summary ──────────────────────────────────────────────────
function CatManagerSummary({ suppliers }: { suppliers: SupplierRecord[] }) {
  const grouped = useMemo(() => {
    const m = new Map<string, { totalSpend: number; atRisk: number; supplierCount: number }>();
    for (const s of suppliers) {
      const cur = m.get(s.categoryManager) ?? { totalSpend: 0, atRisk: 0, supplierCount: 0 };
      cur.totalSpend += s.actualSpend;
      cur.supplierCount++;
      if (s.status === "critical" || s.status === "at-risk") cur.atRisk++;
      m.set(s.categoryManager, cur);
    }
    return [...m.entries()]
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.totalSpend - a.totalSpend);
  }, [suppliers]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
      {grouped.map((mgr) => (
        <div key={mgr.name} style={{
          background: "#fff", borderRadius: 10, border: "1px solid #E4E4E4",
          padding: "16px 18px",
        }}>
          <div style={{ font: "600 13px/18px var(--font-body)", color: "#242424", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>{mgr.name}</span>
            {mgr.atRisk > 0 && (
              <span style={{
                background: "#FEE2E2", color: "#991B1B",
                padding: "2px 7px", borderRadius: 8, fontSize: 11, fontWeight: 700,
              }}>
                {mgr.atRisk} at risk
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div>
              <div style={{ font: "400 10px/14px var(--font-body)", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".04em" }}>Portfolio Spend</div>
              <div style={{ font: "700 15px/22px var(--font-display)", color: "#242424", marginTop: 2 }}>{fmtK(mgr.totalSpend)}</div>
            </div>
            <div>
              <div style={{ font: "400 10px/14px var(--font-body)", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".04em" }}>Suppliers</div>
              <div style={{ font: "700 15px/22px var(--font-display)", color: "#242424", marginTop: 2 }}>{mgr.supplierCount}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type SortKey = keyof Pick<SupplierRecord, "supplier" | "category" | "market" | "actualSpend" | "awardedSpend" | "utilPct" | "adherencePct" | "performanceScore">;

export default function Page() {
  const allSuppliers = useMemo(() => buildSupplierRecords(ROWS), []);

  // Filters
  const categories = useMemo(() => ["All", ...Array.from(new Set(allSuppliers.map((s) => s.category))).sort()], [allSuppliers]);
  const markets    = useMemo(() => ["All", ...Array.from(new Set(allSuppliers.map((s) => s.market))).sort()], [allSuppliers]);

  const [filterCategory, setFilterCategory] = useState("All");
  const [filterMarket,   setFilterMarket]   = useState("All");
  const [filterStatus,   setFilterStatus]   = useState("All");
  const [sortKey,  setSortKey]  = useState<SortKey>("utilPct");
  const [sortDir,  setSortDir]  = useState<"asc" | "desc">("desc");
  const [search,   setSearch]   = useState("");

  const filtered = useMemo(() => {
    let list = allSuppliers;
    if (filterCategory !== "All") list = list.filter((s) => s.category === filterCategory);
    if (filterMarket   !== "All") list = list.filter((s) => s.market   === filterMarket);
    if (filterStatus   !== "All") {
      const statusMap: Record<string, SupplierRecord["status"]> = {
        "Critical":         "critical",
        "At Risk":          "at-risk",
        "On Track":         "on-track",
        "Under-Delivering": "under-delivering",
      };
      const target = statusMap[filterStatus];
      if (target) list = list.filter((s) => s.status === target);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) =>
        s.supplier.toLowerCase().includes(q) ||
        s.categoryManager.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [allSuppliers, filterCategory, filterMarket, filterStatus, sortKey, sortDir, search]);

  // KPIs from full set
  const kpis = useMemo(() => ({
    total:           allSuppliers.length,
    atRisk:          allSuppliers.filter((s) => s.status === "at-risk").length,
    critical:        allSuppliers.filter((s) => s.status === "critical").length,
    underDelivering: allSuppliers.filter((s) => s.status === "under-delivering").length,
  }), [allSuppliers]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: "10px 12px",
    font: "600 11px/16px var(--font-body)",
    color: sortKey === key ? "#067A46" : "#676767",
    textTransform: "uppercase",
    letterSpacing: ".04em",
    whiteSpace: "nowrap",
    cursor: "pointer",
    userSelect: "none",
    borderBottom: "2px solid #E4E4E4",
    background: "#FAFAFA",
    textAlign: "left",
  });

  const tdStyle: React.CSSProperties = {
    padding: "11px 12px",
    borderBottom: "1px solid #F0F0F0",
    font: "400 13px/18px var(--font-body)",
    color: "#242424",
    verticalAlign: "middle",
  };

  const selectStyle: React.CSSProperties = {
    padding: "7px 10px",
    borderRadius: 8,
    border: "1px solid #E4E4E4",
    background: "#fff",
    font: "400 13px/18px var(--font-body)",
    color: "#242424",
    cursor: "pointer",
    outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8F8F8", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 64px" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ font: "400 12px/16px var(--font-body)", color: "#9CA3AF", marginBottom: 6 }}>
            Strategic Procurement
            <span style={{ margin: "0 6px", color: "#D1D5DB" }}>›</span>
            <span style={{ color: "#676767" }}>Supplier Tracker</span>
          </div>
          <h1 style={{ font: "700 28px/34px var(--font-display)", color: "#242424", margin: 0 }}>
            Supplier Tracker
          </h1>
          <p style={{ font: "400 14px/20px var(--font-body)", color: "#676767", marginTop: 6, marginBottom: 0 }}>
            Scorecard, performance matrix and risk overview across all active supplier contracts.
          </p>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { label: "Total Suppliers",    value: String(kpis.total),           sub: "across all categories", tone: "neutral"   },
            { label: "At Risk",            value: String(kpis.atRisk),          sub: "Utilisation ≥ 80%",    tone: kpis.atRisk > 0 ? "warning" : "neutral" },
            { label: "Critical",           value: String(kpis.critical),        sub: "Utilisation ≥ 90%",    tone: kpis.critical > 0 ? "danger"  : "neutral" },
            { label: "Under-Delivering",   value: String(kpis.underDelivering), sub: "Utilisation < 40%",    tone: "neutral"   },
          ].map((k) => {
            const borderColor = k.tone === "danger" ? "#FCA5A5" : k.tone === "warning" ? "#FCD34D" : "#E4E4E4";
            const subColor    = k.tone === "danger" ? "#B30000" : k.tone === "warning" ? "#A43700" : "#676767";
            return (
              <div key={k.label} style={{
                flex: "1 1 180px", background: "#fff", borderRadius: 10,
                padding: "18px 20px", border: `1px solid ${borderColor}`,
                boxShadow: "0 1px 3px rgba(36,36,36,.06)",
              }}>
                <div style={{ font: "400 11px/14px var(--font-body)", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>{k.label}</div>
                <div style={{ font: "700 28px/34px var(--font-display)", color: "#242424" }}>{k.value}</div>
                <div style={{ font: "400 12px/16px var(--font-body)", color: subColor, marginTop: 4 }}>{k.sub}</div>
              </div>
            );
          })}
        </div>

        {/* ── Filter Bar ─────────────────────────────────────────────────── */}
        <div style={{
          background: "#fff", borderRadius: 10, border: "1px solid #E4E4E4",
          padding: "14px 18px", marginBottom: 20,
          display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
        }}>
          <input
            placeholder="Search supplier or manager…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              ...selectStyle,
              flex: "1 1 200px",
              minWidth: 180,
            }}
          />
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={selectStyle}>
            {categories.map((c) => <option key={c}>{c === "All" ? "All Categories" : c}</option>)}
          </select>
          <select value={filterMarket} onChange={(e) => setFilterMarket(e.target.value)} style={selectStyle}>
            {markets.map((m) => <option key={m}>{m === "All" ? "All Markets" : m}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
            {["All", "Critical", "At Risk", "On Track", "Under-Delivering"].map((s) => (
              <option key={s}>{s === "All" ? "All Statuses" : s}</option>
            ))}
          </select>
          <span style={{ font: "400 12px/16px var(--font-body)", color: "#9CA3AF", marginLeft: "auto" }}>
            {filtered.length} of {allSuppliers.length} suppliers
          </span>
        </div>

        {/* ── Scorecard Table ─────────────────────────────────────────────── */}
        <div style={{
          background: "#fff", borderRadius: 10, border: "1px solid #E4E4E4",
          marginBottom: 24, overflow: "hidden",
          boxShadow: "0 1px 3px rgba(36,36,36,.06)",
        }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ font: "700 16px/22px var(--font-display)", color: "#242424", margin: 0 }}>
              Supplier Scorecard
            </h2>
            <span style={{ font: "400 12px/16px var(--font-body)", color: "#9CA3AF" }}>
              Click column headers to sort
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
              <thead>
                <tr>
                  <th style={thStyle("supplier")} onClick={() => handleSort("supplier")}>
                    Supplier Name <SortIcon dir={sortKey === "supplier" ? sortDir : null} />
                  </th>
                  <th style={thStyle("category")} onClick={() => handleSort("category")}>
                    Category <SortIcon dir={sortKey === "category" ? sortDir : null} />
                  </th>
                  <th style={thStyle("market")} onClick={() => handleSort("market")}>
                    Market <SortIcon dir={sortKey === "market" ? sortDir : null} />
                  </th>
                  <th style={{ ...thStyle("actualSpend"), textAlign: "right" }} onClick={() => handleSort("actualSpend")}>
                    Actual Spend <SortIcon dir={sortKey === "actualSpend" ? sortDir : null} />
                  </th>
                  <th style={{ ...thStyle("awardedSpend"), textAlign: "right" }} onClick={() => handleSort("awardedSpend")}>
                    Budget <SortIcon dir={sortKey === "awardedSpend" ? sortDir : null} />
                  </th>
                  <th style={thStyle("utilPct")} onClick={() => handleSort("utilPct")}>
                    Util % <SortIcon dir={sortKey === "utilPct" ? sortDir : null} />
                  </th>
                  <th style={thStyle("adherencePct")} onClick={() => handleSort("adherencePct")}>
                    Adherence % <SortIcon dir={sortKey === "adherencePct" ? sortDir : null} />
                  </th>
                  <th style={{ ...thStyle("supplier" as SortKey), cursor: "default" }}>Risk</th>
                  <th style={thStyle("performanceScore")} onClick={() => handleSort("performanceScore")}>
                    Score <SortIcon dir={sortKey === "performanceScore" ? sortDir : null} />
                  </th>
                  <th style={{ ...thStyle("supplier" as SortKey), cursor: "default" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ ...tdStyle, textAlign: "center", color: "#9CA3AF", padding: "32px 12px" }}>
                      No suppliers match the current filters.
                    </td>
                  </tr>
                ) : filtered.map((s, i) => {
                  const color = SUPPLIER_COLOR[s.supplier] ?? "#067A46";
                  const riskColor = s.budgetRisk === "High" ? "#991B1B" : s.budgetRisk === "Medium" ? "#92400E" : "#166534";
                  const riskBg    = s.budgetRisk === "High" ? "#FEE2E2" : s.budgetRisk === "Medium" ? "#FEF3C7" : "#DCFCE7";
                  return (
                    <tr
                      key={s.supplier}
                      style={{ background: i % 2 === 0 ? "#fff" : "#FAFAFA", transition: "background 80ms" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#F0FDF4")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#FAFAFA")}
                    >
                      {/* Supplier Name */}
                      <td style={{ ...tdStyle, maxWidth: 200 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
                          <span style={{ font: "600 13px/18px var(--font-body)", color: "#242424", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {s.supplier}
                          </span>
                        </div>
                        <div style={{ font: "400 11px/14px var(--font-body)", color: "#9CA3AF", paddingLeft: 16, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.categoryManager}
                        </div>
                      </td>
                      {/* Category */}
                      <td style={tdStyle}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                          background: s.category === "Bakery" ? "#FEF3C7" : s.category === "Grocery" ? "#EFF6FF" : "#F0FDF4",
                          color:      s.category === "Bakery" ? "#92400E" : s.category === "Grocery" ? "#1E40AF" : "#166534",
                        }}>
                          {s.category}
                        </span>
                      </td>
                      {/* Market */}
                      <td style={tdStyle}>
                        <span style={{
                          padding: "2px 7px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                          background: s.market === "US" ? "#EFF6FF" : s.market === "DKSE" ? "#FDF4FF" : s.market === "BENELUX" ? "#FFF7ED" : "#F5F5F5",
                          color:      s.market === "US" ? "#1E40AF" : s.market === "DKSE" ? "#7E22CE" : s.market === "BENELUX" ? "#9A3412" : "#374151",
                        }}>
                          {s.market}
                        </span>
                      </td>
                      {/* Actual Spend */}
                      <td style={{ ...tdStyle, textAlign: "right", font: "600 13px/18px var(--font-mono)", color: "#242424" }}>
                        {fmtEur(s.actualSpend)}
                      </td>
                      {/* Budget */}
                      <td style={{ ...tdStyle, textAlign: "right", font: "400 13px/18px var(--font-mono)", color: "#676767" }}>
                        {fmtEur(s.awardedSpend)}
                      </td>
                      {/* Utilisation */}
                      <td style={tdStyle}>
                        <UtilCell pct={s.utilPct} />
                      </td>
                      {/* Adherence */}
                      <td style={tdStyle}>
                        <span style={{ font: "600 13px/18px var(--font-mono)", color: s.adherencePct >= 70 ? "#067A46" : s.adherencePct >= 40 ? "#D97706" : "#DC2626" }}>
                          {s.adherencePct}%
                        </span>
                      </td>
                      {/* Risk */}
                      <td style={tdStyle}>
                        <span style={{
                          padding: "2px 7px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                          background: riskBg, color: riskColor,
                        }}>
                          {s.budgetRisk}
                        </span>
                      </td>
                      {/* Performance Score */}
                      <td style={{ ...tdStyle, minWidth: 120 }}>
                        <ScoreBar score={s.performanceScore} />
                      </td>
                      {/* Status */}
                      <td style={tdStyle}>
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Performance Matrix + Cat Manager (side by side on wide screens) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24, alignItems: "start" }}>

          {/* Performance Matrix */}
          <div style={{
            background: "#fff", borderRadius: 10, border: "1px solid #E4E4E4",
            padding: "20px 20px 16px", boxShadow: "0 1px 3px rgba(36,36,36,.06)",
          }}>
            <h2 style={{ font: "700 15px/20px var(--font-display)", color: "#242424", margin: "0 0 6px" }}>
              Performance Matrix
            </h2>
            <p style={{ font: "400 12px/16px var(--font-body)", color: "#9CA3AF", margin: "0 0 16px" }}>
              Budget utilisation vs. adherence — filtered suppliers shown
            </p>
            <PerformanceMatrix suppliers={filtered} />

            {/* Legend */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, justifyContent: "center" }}>
              {[
                { color: "#DCFCE7", label: "Star: high util + high adherence" },
                { color: "#FEE2E2", label: "Watch: high util + low adherence" },
                { color: "#FEF3C7", label: "Slack: low util + high adherence" },
                { color: "#F1F5F9", label: "Underperformer: low util + low adherence" },
              ].map((l) => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, border: "1px solid #E4E4E4", display: "inline-block" }} />
                  <span style={{ font: "400 10px/14px var(--font-body)", color: "#9CA3AF" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category Manager Summary */}
          <div style={{
            background: "#fff", borderRadius: 10, border: "1px solid #E4E4E4",
            padding: "20px 20px 16px", boxShadow: "0 1px 3px rgba(36,36,36,.06)",
          }}>
            <h2 style={{ font: "700 15px/20px var(--font-display)", color: "#242424", margin: "0 0 6px" }}>
              Category Manager Summary
            </h2>
            <p style={{ font: "400 12px/16px var(--font-body)", color: "#9CA3AF", margin: "0 0 16px" }}>
              Portfolio spend and at-risk exposure per manager
            </p>
            <CatManagerSummary suppliers={allSuppliers} />
          </div>

        </div>

        {/* ── Footnote ───────────────────────────────────────────────────── */}
        <div style={{ font: "400 11px/16px var(--font-body)", color: "#C4C4C4", textAlign: "center" }}>
          Utilisation = cumulative actual spend ÷ awarded budget · Adherence = avg across all contract weeks ·
          Performance score: 100 base, −30 if util ≥ 90%, −15 if util ≥ 80%, −20 if util &lt; 30%, +up to 30 for adherence, −10/−5 for High/Medium budget risk
        </div>

      </div>
    </div>
  );
}
