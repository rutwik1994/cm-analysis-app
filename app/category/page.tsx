"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import {
  ROWS, CATEGORIES, MARKETS, computeMetrics,
  type SpendRow,
} from "@/lib/data";

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORY_COLOR: Record<string, string> = {
  Bakery:  "#A43700",
  Grocery: "#1E40AF",
  Protein: "#166534",
};
const CATEGORY_BG: Record<string, string> = {
  Bakery:  "#FFF7F0",
  Grocery: "#EFF6FF",
  Protein: "#F0FDF4",
};
const MARKET_COLOR: Record<string, string> = {
  DACH:    "#374151",
  US:      "#1E40AF",
  DKSE:    "#7E22CE",
  BENELUX: "#9A3412",
};
const MARKET_BG: Record<string, string> = {
  DACH:    "#F5F5F5",
  US:      "#DBEAFE",
  DKSE:    "#F3E8FF",
  BENELUX: "#FFEDD5",
};
const MARKET_BAR_COLOR: Record<string, string> = {
  DACH:    "#6B7280",
  US:      "#3B82F6",
  DKSE:    "#A855F7",
  BENELUX: "#F97316",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtEur = (n: number) =>
  n >= 1_000_000
    ? `€${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
    ? `€${(n / 1_000).toFixed(0)}k`
    : `€${n.toLocaleString()}`;

function pct(v: number) {
  return `${v.toFixed(1)}%`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Breadcrumb() {
  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <Link
        href="/"
        style={{ font: "400 12px/18px var(--font-body)", color: "#676767", textDecoration: "none" }}
      >
        Strategic Procurement
      </Link>
      <span style={{ color: "#C4C4C4", fontSize: 12 }}>/</span>
      <span style={{ font: "500 12px/18px var(--font-body)", color: "#242424" }}>
        Category Overview
      </span>
    </nav>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        font: "700 16px/22px var(--font-display)",
        color: "#242424",
        margin: "0 0 16px 0",
      }}
    >
      {children}
    </h2>
  );
}

// Scorecard card for one category
function CategoryCard({
  category,
  rows,
}: {
  category: string;
  rows: SpendRow[];
}) {
  const m = useMemo(() => computeMetrics(rows), [rows]);
  const color = CATEGORY_COLOR[category] ?? "#242424";
  const bg = CATEGORY_BG[category] ?? "#F8F8F8";
  const markets = new Set(rows.map((r) => r.market)).size;

  const riskColor =
    m.budgetUtilizationPct >= 90
      ? "#B30000"
      : m.budgetUtilizationPct >= 75
      ? "#A43700"
      : "#067A46";

  return (
    <div
      style={{
        flex: 1,
        minWidth: 220,
        background: "#fff",
        borderRadius: 10,
        border: `1.5px solid ${color}`,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(36,36,36,.07)",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: bg,
          borderBottom: `1.5px solid ${color}`,
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            font: "700 15px/20px var(--font-display)",
            color,
            letterSpacing: ".01em",
          }}
        >
          {category}
        </span>
      </div>
      {/* Body */}
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Total spend */}
        <div>
          <div
            style={{
              font: "400 10px/14px var(--font-body)",
              color: "#676767",
              textTransform: "uppercase",
              letterSpacing: ".05em",
              marginBottom: 3,
            }}
          >
            Total Actual Spend
          </div>
          <div style={{ font: "700 22px/28px var(--font-display)", color: "#242424" }}>
            {fmtEur(m.totalActualSpendEur)}
          </div>
          <div style={{ font: "400 11px/16px var(--font-body)", color: "#676767", marginTop: 1 }}>
            of {fmtEur(m.totalAwardedSpendEur)} awarded
          </div>
        </div>

        {/* Budget utilisation bar */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 5,
            }}
          >
            <span
              style={{
                font: "400 11px/16px var(--font-body)",
                color: "#676767",
                textTransform: "uppercase",
                letterSpacing: ".04em",
              }}
            >
              Budget Utilisation
            </span>
            <span
              style={{
                font: "700 13px/18px var(--font-body)",
                color: riskColor,
              }}
            >
              {pct(m.budgetUtilizationPct)}
            </span>
          </div>
          <div
            style={{
              height: 7,
              background: "#EEE",
              borderRadius: 5,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(m.budgetUtilizationPct, 100)}%`,
                background: riskColor,
                borderRadius: 5,
                transition: "width 600ms cubic-bezier(0,0,0.2,1)",
              }}
            />
          </div>
        </div>

        {/* Stat grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px 12px",
          }}
        >
          {[
            { label: "Suppliers", value: String(m.supplierCount) },
            { label: "Markets", value: String(markets) },
            {
              label: "Avg Adherence",
              value: `${m.avgAdherencePct}%`,
              tone: m.avgAdherencePct >= 80 ? "positive" : m.avgAdherencePct >= 50 ? "neutral" : "danger",
            },
            {
              label: "At-Risk Suppliers",
              value: String(m.atRiskSuppliers),
              tone: m.atRiskSuppliers === 0 ? "positive" : "danger",
            },
          ].map(({ label, value, tone }) => (
            <div
              key={label}
              style={{
                background: "#F8F8F8",
                borderRadius: 7,
                padding: "8px 10px",
              }}
            >
              <div
                style={{
                  font: "400 10px/14px var(--font-body)",
                  color: "#676767",
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                  marginBottom: 2,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  font: "700 16px/22px var(--font-display)",
                  color:
                    tone === "positive"
                      ? "#067A46"
                      : tone === "danger"
                      ? "#B30000"
                      : "#242424",
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Custom tooltip for stacked bar chart
function SpendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; fill: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E4E4E4",
        borderRadius: 8,
        padding: "12px 14px",
        boxShadow: "0 4px 16px rgba(36,36,36,.10)",
        minWidth: 180,
      }}
    >
      <div
        style={{
          font: "700 13px/18px var(--font-display)",
          color: "#242424",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {payload.map((p) => (
        <div
          key={p.name}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginBottom: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: p.fill,
                flexShrink: 0,
              }}
            />
            <span
              style={{ font: "400 12px/16px var(--font-body)", color: "#676767" }}
            >
              {p.name}
            </span>
          </div>
          <span
            style={{ font: "600 12px/16px var(--font-mono)", color: "#242424" }}
          >
            {fmtEur(p.value ?? 0)}
          </span>
        </div>
      ))}
      <div
        style={{
          borderTop: "1px solid #E4E4E4",
          marginTop: 6,
          paddingTop: 6,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span style={{ font: "600 12px/16px var(--font-body)", color: "#242424" }}>
          Total
        </span>
        <span style={{ font: "700 12px/16px var(--font-mono)", color: "#242424" }}>
          {fmtEur(total)}
        </span>
      </div>
    </div>
  );
}

// ── Cell colouring helpers for benchmark table ─────────────────────────────────
type Dir = "higher-better" | "lower-better";

function getRank(values: number[], dir: Dir): ("best" | "mid" | "worst")[] {
  const sorted = [...values].sort((a, b) => (dir === "higher-better" ? b - a : a - b));
  return values.map((v) => {
    const rank = sorted.indexOf(v);
    if (rank === 0) return "best";
    if (rank === sorted.length - 1) return "worst";
    return "mid";
  });
}

function rankBg(rank: "best" | "mid" | "worst") {
  if (rank === "best") return "#DCFCE7";
  if (rank === "worst") return "#FEE2E2";
  return "#F8F8F8";
}
function rankColor(rank: "best" | "mid" | "worst") {
  if (rank === "best") return "#166534";
  if (rank === "worst") return "#991B1B";
  return "#374151";
}

// ── Navigation card ────────────────────────────────────────────────────────────
function MarketNavCard({
  market,
  href,
  spend,
}: {
  market: string;
  href: string;
  spend: number;
}) {
  const color = MARKET_COLOR[market] ?? "#374151";
  const bg = MARKET_BG[market] ?? "#F5F5F5";
  return (
    <Link
      href={href}
      style={{
        flex: 1,
        minWidth: 150,
        background: "#fff",
        border: `1.5px solid ${color}`,
        borderRadius: 10,
        padding: "18px 20px",
        textDecoration: "none",
        display: "block",
        transition: "box-shadow 120ms, transform 120ms",
        boxShadow: "0 1px 4px rgba(36,36,36,.06)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.boxShadow =
          "0 4px 16px rgba(36,36,36,.13)";
        (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.boxShadow =
          "0 1px 4px rgba(36,36,36,.06)";
        (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          display: "inline-block",
          background: bg,
          color,
          borderRadius: 6,
          padding: "3px 10px",
          font: "700 11px/18px var(--font-body)",
          textTransform: "uppercase",
          letterSpacing: ".06em",
          marginBottom: 10,
        }}
      >
        {market}
      </div>
      <div style={{ font: "700 18px/24px var(--font-display)", color: "#242424" }}>
        {fmtEur(spend)}
      </div>
      <div
        style={{
          font: "400 11px/16px var(--font-body)",
          color: "#676767",
          marginTop: 2,
        }}
      >
        actual spend
      </div>
      <div
        style={{
          marginTop: 12,
          font: "600 12px/16px var(--font-body)",
          color,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        View Deep-dive
        <span style={{ fontSize: 14 }}>→</span>
      </div>
    </Link>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Page() {
  // Per-category rows
  const rowsByCategory = useMemo(() => {
    const map = new Map<string, SpendRow[]>();
    for (const cat of CATEGORIES) {
      map.set(cat, ROWS.filter((r) => r.category === cat));
    }
    return map;
  }, []);

  // Per-category metrics
  const metricsByCategory = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeMetrics>>();
    for (const cat of CATEGORIES) {
      map.set(cat, computeMetrics(rowsByCategory.get(cat) ?? []));
    }
    return map;
  }, [rowsByCategory]);

  // Per-category-per-market spend (max cumulative per supplier then sum)
  const spendByCatMarket = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    for (const cat of CATEGORIES) {
      result[cat] = {};
      for (const mkt of MARKETS) {
        const filtered = ROWS.filter((r) => r.category === cat && r.market === mkt);
        const maxPerSup = new Map<string, number>();
        for (const r of filtered) {
          maxPerSup.set(
            r.supplier,
            Math.max(maxPerSup.get(r.supplier) ?? 0, r.cumulativeActualSpendEur)
          );
        }
        result[cat][mkt] = [...maxPerSup.values()].reduce((s, v) => s + v, 0);
      }
    }
    return result;
  }, []);

  // Stacked bar chart data: one bar group per category, stacked by market
  const spendChartData = useMemo(() =>
    CATEGORIES.map((cat) => ({
      category: cat,
      ...Object.fromEntries(MARKETS.map((mkt) => [mkt, spendByCatMarket[cat]?.[mkt] ?? 0])),
    })),
    [spendByCatMarket]
  );

  // Per-market total spend (for navigation cards)
  const spendByMarket = useMemo(() => {
    const result: Record<string, number> = {};
    for (const mkt of MARKETS) {
      const maxPerSup = new Map<string, number>();
      for (const r of ROWS.filter((r) => r.market === mkt)) {
        maxPerSup.set(
          r.supplier,
          Math.max(maxPerSup.get(r.supplier) ?? 0, r.cumulativeActualSpendEur)
        );
      }
      result[mkt] = [...maxPerSup.values()].reduce((s, v) => s + v, 0);
    }
    return result;
  }, []);

  // Radar chart data: normalised scores per category
  const radarData = useMemo(() => {
    const cats = CATEGORIES.map((cat) => metricsByCategory.get(cat)!);
    const maxSpend = Math.max(...cats.map((m) => m.totalActualSpendEur));
    return [
      {
        metric: "Spend Volume",
        ...Object.fromEntries(
          CATEGORIES.map((cat, i) => [cat, Math.round((cats[i].totalActualSpendEur / maxSpend) * 100)])
        ),
      },
      {
        metric: "Budget Util",
        ...Object.fromEntries(CATEGORIES.map((cat, i) => [cat, Math.round(cats[i].budgetUtilizationPct)])),
      },
      {
        metric: "Adherence",
        ...Object.fromEntries(CATEGORIES.map((cat, i) => [cat, Math.round(cats[i].avgAdherencePct)])),
      },
      {
        metric: "Supplier Count",
        ...Object.fromEntries(
          CATEGORIES.map((cat, i) => {
            const maxSup = Math.max(...cats.map((m) => m.supplierCount));
            return [cat, maxSup > 0 ? Math.round((cats[i].supplierCount / maxSup) * 100) : 0];
          })
        ),
      },
      {
        metric: "Risk Score",
        ...Object.fromEntries(
          CATEGORIES.map((cat, i) => [
            cat,
            Math.max(0, 100 - Math.round(cats[i].atRiskSuppliers * 25)),
          ])
        ),
      },
    ];
  }, [metricsByCategory]);

  // Benchmarking table ranks
  const tableRows = useMemo(() => {
    const cats = CATEGORIES;
    const getM = (cat: string) => metricsByCategory.get(cat)!;
    const totalSpend = cats.map((c) => getM(c).totalActualSpendEur);
    const budgetUtil = cats.map((c) => getM(c).budgetUtilizationPct);
    const adherence = cats.map((c) => getM(c).avgAdherencePct);
    const atRisk = cats.map((c) => getM(c).atRiskSuppliers);
    const suppliers = cats.map((c) => getM(c).supplierCount);
    const mktCount = cats.map((c) => new Set(rowsByCategory.get(c)!.map((r) => r.market)).size);

    return [
      {
        label: "Total Spend (€)",
        values: totalSpend,
        fmt: (v: number) => fmtEur(v),
        dir: "higher-better" as Dir,
        ranks: getRank(totalSpend, "higher-better"),
      },
      {
        label: "Budget Utilisation",
        values: budgetUtil,
        fmt: (v: number) => pct(v),
        dir: "lower-better" as Dir,
        ranks: getRank(budgetUtil, "lower-better"),
      },
      {
        label: "Avg Adherence",
        values: adherence,
        fmt: (v: number) => `${v}%`,
        dir: "higher-better" as Dir,
        ranks: getRank(adherence, "higher-better"),
      },
      {
        label: "At-Risk Suppliers",
        values: atRisk,
        fmt: (v: number) => String(v),
        dir: "lower-better" as Dir,
        ranks: getRank(atRisk, "lower-better"),
      },
      {
        label: "# Suppliers",
        values: suppliers,
        fmt: (v: number) => String(v),
        dir: "higher-better" as Dir,
        ranks: getRank(suppliers, "higher-better"),
      },
      {
        label: "# Markets",
        values: mktCount,
        fmt: (v: number) => String(v),
        dir: "higher-better" as Dir,
        ranks: getRank(mktCount, "higher-better"),
      },
    ];
  }, [metricsByCategory, rowsByCategory]);

  // Overall totals
  const grandTotal = useMemo(() => {
    const maxPerSup = new Map<string, number>();
    for (const r of ROWS) {
      maxPerSup.set(r.supplier, Math.max(maxPerSup.get(r.supplier) ?? 0, r.cumulativeActualSpendEur));
    }
    return [...maxPerSup.values()].reduce((s, v) => s + v, 0);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8F8F8",
        fontFamily: "var(--font-body)",
        padding: "0 0 60px 0",
      }}
    >
      {/* ── Page header ── */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #E4E4E4",
          padding: "28px 40px 22px 40px",
        }}
      >
        <Breadcrumb />
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 8,
          }}
        >
          <div>
            <h1
              style={{
                font: "800 28px/36px var(--font-display)",
                color: "#242424",
                margin: 0,
                letterSpacing: "-.01em",
              }}
            >
              Category Overview
            </h1>
            <p
              style={{
                font: "400 14px/20px var(--font-body)",
                color: "#676767",
                margin: "6px 0 0 0",
              }}
            >
              Cross-category benchmarking · Bakery, Grocery, Protein ·{" "}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  background: "#F0FDF4",
                  color: "#166534",
                  padding: "1px 7px",
                  borderRadius: 5,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {fmtEur(grandTotal)} total portfolio spend
              </span>
            </p>
          </div>
          {/* Legend chips */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORIES.map((cat) => (
              <div
                key={cat}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: CATEGORY_BG[cat],
                  border: `1px solid ${CATEGORY_COLOR[cat]}`,
                  borderRadius: 20,
                  padding: "4px 12px",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: CATEGORY_COLOR[cat],
                  }}
                />
                <span
                  style={{
                    font: "600 12px/16px var(--font-body)",
                    color: CATEGORY_COLOR[cat],
                  }}
                >
                  {cat}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "32px 40px", display: "flex", flexDirection: "column", gap: 32 }}>

        {/* 1. Category Scorecard Row */}
        <section>
          <SectionTitle>Category Scorecards</SectionTitle>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            {CATEGORIES.map((cat) => (
              <CategoryCard
                key={cat}
                category={cat}
                rows={rowsByCategory.get(cat) ?? []}
              />
            ))}
          </div>
        </section>

        {/* 2. Charts row: Stacked bar + Radar */}
        <section>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 20 }}>
            {/* Stacked Bar Chart */}
            <div
              style={{
                background: "#fff",
                borderRadius: 10,
                border: "1px solid #E4E4E4",
                padding: "24px 24px 18px 24px",
                boxShadow: "0 1px 4px rgba(36,36,36,.05)",
              }}
            >
              <SectionTitle>Spend by Category & Market</SectionTitle>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={spendChartData}
                  margin={{ top: 4, right: 8, left: 10, bottom: 4 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 12, fontWeight: 600, fill: "#676767" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => fmtEur(v)}
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                    width={64}
                  />
                  <Tooltip content={<SpendTooltip />} />
                  <Legend
                    wrapperStyle={{
                      font: "500 11px var(--font-body)",
                      color: "#676767",
                      paddingTop: 12,
                    }}
                  />
                  {MARKETS.map((mkt) => (
                    <Bar
                      key={mkt}
                      dataKey={mkt}
                      stackId="a"
                      fill={MARKET_BAR_COLOR[mkt]}
                      radius={mkt === MARKETS[MARKETS.length - 1] ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Radar Chart */}
            <div
              style={{
                background: "#fff",
                borderRadius: 10,
                border: "1px solid #E4E4E4",
                padding: "24px 20px 18px 20px",
                boxShadow: "0 1px 4px rgba(36,36,36,.05)",
              }}
            >
              <SectionTitle>Performance Radar</SectionTitle>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="#E4E4E4" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fontSize: 10, fontWeight: 500, fill: "#676767" }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: "#C4C4C4" }}
                    tickCount={4}
                  />
                  {CATEGORIES.map((cat) => (
                    <Radar
                      key={cat}
                      name={cat}
                      dataKey={cat}
                      stroke={CATEGORY_COLOR[cat]}
                      fill={CATEGORY_COLOR[cat]}
                      fillOpacity={0.08}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend
                    wrapperStyle={{
                      font: "500 11px var(--font-body)",
                      color: "#676767",
                      paddingTop: 8,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #E4E4E4",
                      font: "400 12px var(--font-body)",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* 3. Benchmarking Table */}
        <section>
          <div
            style={{
              background: "#fff",
              borderRadius: 10,
              border: "1px solid #E4E4E4",
              padding: "24px",
              boxShadow: "0 1px 4px rgba(36,36,36,.05)",
              overflowX: "auto",
            }}
          >
            <SectionTitle>Cross-Category Benchmarking</SectionTitle>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                font: "400 13px/18px var(--font-body)",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 14px",
                      font: "600 11px/16px var(--font-body)",
                      color: "#676767",
                      textTransform: "uppercase",
                      letterSpacing: ".05em",
                      borderBottom: "2px solid #E4E4E4",
                      background: "#FAFAFA",
                      borderRadius: "8px 0 0 0",
                    }}
                  >
                    Metric
                  </th>
                  {CATEGORIES.map((cat, i) => (
                    <th
                      key={cat}
                      style={{
                        textAlign: "center",
                        padding: "10px 20px",
                        borderBottom: `2px solid ${CATEGORY_COLOR[cat]}`,
                        background: CATEGORY_BG[cat],
                        borderRadius: i === CATEGORIES.length - 1 ? "0 8px 0 0" : 0,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: CATEGORY_COLOR[cat],
                          }}
                        />
                        <span
                          style={{
                            font: "700 13px/18px var(--font-display)",
                            color: CATEGORY_COLOR[cat],
                          }}
                        >
                          {cat}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, ri) => (
                  <tr key={row.label}>
                    <td
                      style={{
                        padding: "11px 14px",
                        font: "500 13px/18px var(--font-body)",
                        color: "#242424",
                        borderBottom: ri < tableRows.length - 1 ? "1px solid #F0F0F0" : "none",
                        background: "#FAFAFA",
                      }}
                    >
                      {row.label}
                    </td>
                    {row.values.map((v, ci) => {
                      const rank = row.ranks[ci];
                      return (
                        <td
                          key={CATEGORIES[ci]}
                          style={{
                            padding: "11px 20px",
                            textAlign: "center",
                            borderBottom: ri < tableRows.length - 1 ? "1px solid #F0F0F0" : "none",
                            background: rankBg(rank),
                          }}
                        >
                          <span
                            style={{
                              font: "700 14px/20px var(--font-mono)",
                              color: rankColor(rank),
                            }}
                          >
                            {row.fmt(v)}
                          </span>
                          {rank === "best" && (
                            <span style={{ marginLeft: 5, fontSize: 11 }}>▲</span>
                          )}
                          {rank === "worst" && (
                            <span style={{ marginLeft: 5, fontSize: 11 }}>▼</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
              {(
                [
                  { bg: "#DCFCE7", label: "Best performer" },
                  { bg: "#FEE2E2", label: "Needs attention" },
                  { bg: "#F8F8F8", label: "Mid-range" },
                ] as const
              ).map(({ bg, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background: bg,
                      border: "1px solid #E4E4E4",
                    }}
                  />
                  <span style={{ font: "400 11px/16px var(--font-body)", color: "#676767" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Market Coverage Matrix */}
        <section>
          <div
            style={{
              background: "#fff",
              borderRadius: 10,
              border: "1px solid #E4E4E4",
              padding: "24px",
              boxShadow: "0 1px 4px rgba(36,36,36,.05)",
              overflowX: "auto",
            }}
          >
            <SectionTitle>Market Coverage Matrix</SectionTitle>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                font: "400 12px/16px var(--font-body)",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      padding: "10px 16px",
                      textAlign: "left",
                      font: "600 11px/16px var(--font-body)",
                      color: "#676767",
                      textTransform: "uppercase",
                      letterSpacing: ".05em",
                      borderBottom: "2px solid #E4E4E4",
                      background: "#FAFAFA",
                      width: 110,
                    }}
                  >
                    Market
                  </th>
                  {CATEGORIES.map((cat) => (
                    <th
                      key={cat}
                      style={{
                        padding: "10px 16px",
                        textAlign: "center",
                        borderBottom: `2px solid ${CATEGORY_COLOR[cat]}`,
                        background: CATEGORY_BG[cat],
                      }}
                    >
                      <span
                        style={{
                          font: "700 12px/16px var(--font-display)",
                          color: CATEGORY_COLOR[cat],
                        }}
                      >
                        {cat}
                      </span>
                    </th>
                  ))}
                  <th
                    style={{
                      padding: "10px 16px",
                      textAlign: "center",
                      font: "600 11px/16px var(--font-body)",
                      color: "#676767",
                      textTransform: "uppercase",
                      letterSpacing: ".05em",
                      borderBottom: "2px solid #E4E4E4",
                      background: "#FAFAFA",
                    }}
                  >
                    Row Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {MARKETS.map((mkt, mi) => {
                  const rowTotal = CATEGORIES.reduce(
                    (s, cat) => s + (spendByCatMarket[cat]?.[mkt] ?? 0),
                    0
                  );
                  return (
                    <tr key={mkt}>
                      <td
                        style={{
                          padding: "13px 16px",
                          borderBottom: mi < MARKETS.length - 1 ? "1px solid #F0F0F0" : "none",
                          background: "#FAFAFA",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            style={{
                              background: MARKET_BG[mkt],
                              color: MARKET_COLOR[mkt],
                              borderRadius: 5,
                              padding: "2px 9px",
                              font: "700 11px/16px var(--font-body)",
                              textTransform: "uppercase",
                              letterSpacing: ".05em",
                              border: `1px solid ${MARKET_COLOR[mkt]}`,
                            }}
                          >
                            {mkt}
                          </div>
                        </div>
                      </td>
                      {CATEGORIES.map((cat) => {
                        const spend = spendByCatMarket[cat]?.[mkt] ?? 0;
                        const active = spend > 0;
                        return (
                          <td
                            key={cat}
                            style={{
                              padding: "13px 16px",
                              textAlign: "center",
                              borderBottom: mi < MARKETS.length - 1 ? "1px solid #F0F0F0" : "none",
                              background: active ? CATEGORY_BG[cat] : "#FAFAFA",
                              transition: "background 120ms",
                            }}
                          >
                            {active ? (
                              <div>
                                <div
                                  style={{
                                    font: "700 14px/20px var(--font-mono)",
                                    color: CATEGORY_COLOR[cat],
                                  }}
                                >
                                  {fmtEur(spend)}
                                </div>
                                <div
                                  style={{
                                    font: "400 10px/14px var(--font-body)",
                                    color: "#9CA3AF",
                                    marginTop: 2,
                                  }}
                                >
                                  {rowTotal > 0 ? `${((spend / rowTotal) * 100).toFixed(0)}% of row` : "—"}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: "#D1D5DB", fontSize: 18 }}>—</span>
                            )}
                          </td>
                        );
                      })}
                      <td
                        style={{
                          padding: "13px 16px",
                          textAlign: "center",
                          borderBottom: mi < MARKETS.length - 1 ? "1px solid #F0F0F0" : "none",
                          background: "#F0FDF4",
                        }}
                      >
                        <div
                          style={{
                            font: "700 14px/20px var(--font-mono)",
                            color: "#166534",
                          }}
                        >
                          {rowTotal > 0 ? fmtEur(rowTotal) : "—"}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {/* Column totals */}
                <tr>
                  <td
                    style={{
                      padding: "13px 16px",
                      borderTop: "2px solid #E4E4E4",
                      background: "#F8F8F8",
                      font: "700 12px/16px var(--font-body)",
                      color: "#242424",
                    }}
                  >
                    Col Total
                  </td>
                  {CATEGORIES.map((cat) => {
                    const colTotal = MARKETS.reduce(
                      (s, mkt) => s + (spendByCatMarket[cat]?.[mkt] ?? 0),
                      0
                    );
                    return (
                      <td
                        key={cat}
                        style={{
                          padding: "13px 16px",
                          textAlign: "center",
                          borderTop: "2px solid #E4E4E4",
                          background: CATEGORY_BG[cat],
                        }}
                      >
                        <div
                          style={{
                            font: "700 14px/20px var(--font-mono)",
                            color: CATEGORY_COLOR[cat],
                          }}
                        >
                          {fmtEur(colTotal)}
                        </div>
                      </td>
                    );
                  })}
                  <td
                    style={{
                      padding: "13px 16px",
                      textAlign: "center",
                      borderTop: "2px solid #E4E4E4",
                      background: "#DCFCE7",
                    }}
                  >
                    <div
                      style={{
                        font: "800 15px/20px var(--font-mono)",
                        color: "#166534",
                      }}
                    >
                      {fmtEur(grandTotal)}
                    </div>
                    <div
                      style={{
                        font: "500 10px/14px var(--font-body)",
                        color: "#4ADE80",
                        marginTop: 2,
                        textTransform: "uppercase",
                        letterSpacing: ".04em",
                      }}
                    >
                      Portfolio
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Market Deep-Dive Navigation */}
        <section>
          <SectionTitle>Market Deep-Dives</SectionTitle>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <MarketNavCard market="DACH"    href="/category/dach"    spend={spendByMarket["DACH"]    ?? 0} />
            <MarketNavCard market="US"      href="/category/us"      spend={spendByMarket["US"]      ?? 0} />
            <MarketNavCard market="DKSE"    href="/category/dkse"    spend={spendByMarket["DKSE"]    ?? 0} />
            <MarketNavCard market="BENELUX" href="/category/benelux" spend={spendByMarket["BENELUX"] ?? 0} />
          </div>
        </section>

      </div>
    </div>
  );
}
