"use client";

import { useState, useMemo } from "react";
import {
  ComposedChart,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Line,
  Area,
} from "recharts";
import { ROWS, computeMetrics, computeSupplierSplit } from "@/lib/data";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000)
    return `€${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)
    return `€${Math.round(n).toLocaleString("en-DE")}`;
  return `€${Math.round(n)}`;
}

function fmtShort(n: number): string {
  if (Math.abs(n) >= 1_000_000)
    return `€${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)
    return `€${Math.round(n).toLocaleString("en-DE")}`;
  return `€${Math.round(n)}`;
}

function pct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

// Contract: W24/2025 → W23/2026 = 52 weeks total
// Current week W19/2026 → elapsed ≈ 44 weeks, remaining ≈ 8 weeks
const TOTAL_WEEKS = 52;
const ELAPSED_WEEKS = 44;

// ─── week-level data for the trajectory chart ───────────────────────────────

// Build weekly cumulative actuals from ROWS (one point per unique week across all suppliers)
function buildWeeklyActuals() {
  // For each week, get the sum of max cumulative actual spend across all suppliers
  const weekMap = new Map<string, number>();
  const weekIsForecast = new Map<string, boolean>();

  // For each week, sum up the latest cumulative per supplier
  const allWeeks = [...new Set(ROWS.map((r) => r.contractWeek))].sort();

  for (const week of allWeeks) {
    const weekRows = ROWS.filter((r) => r.contractWeek === week);
    // Sum cumulative actuals for all suppliers at this week snapshot
    const supplierMap = new Map<string, number>();
    for (const r of weekRows) {
      const cur = supplierMap.get(r.supplier) ?? 0;
      supplierMap.set(r.supplier, Math.max(cur, r.cumulativeActualSpendEur));
    }
    const total = [...supplierMap.values()].reduce((s, v) => s + v, 0);
    weekMap.set(week, total);
    weekIsForecast.set(
      week,
      weekRows.some((r) => r.actualsStatus === "Forecast")
    );
  }
  return { weekMap, weekIsForecast, allWeeks };
}

// ─── slider component ────────────────────────────────────────────────────────

interface SliderProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  color: string;
}

function SliderControl({
  label,
  description,
  value,
  min,
  max,
  step,
  onChange,
  color,
}: SliderProps) {
  const pctPos = ((value - min) / (max - min)) * 100;
  const isPositive = value > 0;
  const isNegative = value < 0;
  const valueColor = isPositive ? "#067A46" : isNegative ? "#C0392B" : "#676767";

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E4E4E4",
        borderRadius: 10,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 14,
              fontWeight: 600,
              color: "#242424",
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: 12, color: "#676767", marginTop: 2 }}>
            {description}
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 24,
            fontWeight: 700,
            color: valueColor,
            lineHeight: 1,
          }}
        >
          {value > 0 ? "+" : ""}
          {value}%
        </div>
      </div>

      <div style={{ position: "relative", height: 36, display: "flex", alignItems: "center" }}>
        {/* Track background */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 6,
            background: "#F0F0F0",
            borderRadius: 3,
          }}
        />
        {/* Filled track */}
        <div
          style={{
            position: "absolute",
            left: `${((0 - min) / (max - min)) * 100}%`,
            width: `${Math.abs(pctPos - ((0 - min) / (max - min)) * 100)}%`,
            height: 6,
            background: color,
            borderRadius: 3,
            ...(value < 0
              ? { left: `${pctPos}%`, width: `${((0 - min) / (max - min)) * 100 - pctPos}%` }
              : {}),
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
            zIndex: 2,
          }}
        />
        {/* Thumb */}
        <div
          style={{
            position: "absolute",
            left: `calc(${pctPos}% - 10px)`,
            width: 20,
            height: 20,
            background: color,
            borderRadius: "50%",
            border: "3px solid #fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "#AAAAAA",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span>{min}%</span>
        <span>0%</span>
        <span>+{max}%</span>
      </div>
    </div>
  );
}

// ─── custom tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E4E4E4",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6, color: "#242424" }}>
        {label}
      </div>
      {payload.map((p, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 3,
            color: "#242424",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: p.color,
            }}
          />
          <span style={{ color: "#676767" }}>{p.name}:</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
            {fmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function Page() {
  const [volumeAdj, setVolumeAdj] = useState(0);
  const [priceAdj, setPriceAdj] = useState(0);
  const [consolidationAdj, setConsolidationAdj] = useState(0);

  // ── base metrics ──
  const metrics = useMemo(() => computeMetrics(ROWS), []);
  const supplierSplit = useMemo(() => computeSupplierSplit(ROWS), []);

  // ── baseline forecast ──
  // Extrapolate from elapsed 44 weeks to full 52 weeks
  const baselineForecast = useMemo(() => {
    return Math.round(
      (metrics.totalActualSpendEur / ELAPSED_WEEKS) * TOTAL_WEEKS
    );
  }, [metrics.totalActualSpendEur]);

  // ── scenario projection ──
  const scenarioProjected = useMemo(() => {
    return Math.round(
      baselineForecast *
        (1 + volumeAdj / 100) *
        (1 + priceAdj / 100) *
        (1 - (consolidationAdj / 100) * 0.15)
    );
  }, [baselineForecast, volumeAdj, priceAdj, consolidationAdj]);

  const scenarioAdjustment = scenarioProjected - baselineForecast;
  const budgetVariance = scenarioProjected - metrics.totalAwardedSpendEur;
  const budgetVariancePct =
    metrics.totalAwardedSpendEur > 0
      ? (budgetVariance / metrics.totalAwardedSpendEur) * 100
      : 0;

  const riskLevel =
    budgetVariancePct > 5
      ? "Red"
      : budgetVariancePct > -5
      ? "Amber"
      : "Green";
  const riskColor =
    riskLevel === "Red"
      ? "#C0392B"
      : riskLevel === "Amber"
      ? "#E67E22"
      : "#067A46";
  const riskBg =
    riskLevel === "Red"
      ? "#FEF2F2"
      : riskLevel === "Amber"
      ? "#FFFBEB"
      : "#F0FDF4";

  // ── pre-defined scenarios for comparison chart ──
  const conservativeScenario = Math.round(
    baselineForecast * (1 + -10 / 100) * (1 + -5 / 100)
  );
  const optimisticScenario = Math.round(
    baselineForecast * (1 + 5 / 100) * (1 - (10 / 100) * 0.15)
  );

  const scenarioComparisonData = [
    {
      name: "Conservative",
      value: conservativeScenario,
      fill: "#0891B2",
    },
    { name: "Baseline", value: baselineForecast, fill: "#676767" },
    {
      name: "Current Scenario",
      value: scenarioProjected,
      fill:
        scenarioProjected > metrics.totalAwardedSpendEur ? "#C0392B" : "#067A46",
    },
    { name: "Optimistic", value: optimisticScenario, fill: "#8B5CF6" },
  ];

  // ── trajectory chart data ──
  const trajectoryData = useMemo(() => {
    const { weekMap, weekIsForecast, allWeeks } = buildWeeklyActuals();

    // Build weekly incremental spend for trajectory
    const points: Array<{
      weekLabel: string;
      actual: number | null;
      baseline: number | null;
      scenario: number | null;
      budget: number;
    }> = [];

    // Get per-week run rate from last known historical cumulative
    const lastHistoricalCum = metrics.totalActualSpendEur;
    const weeklyRunRate = lastHistoricalCum / ELAPSED_WEEKS;

    // Map existing weeks
    allWeeks.forEach((week) => {
      const cum = weekMap.get(week) ?? 0;
      const isFC = weekIsForecast.get(week) ?? false;
      const label = week.replace("20", "").replace("-", " ");

      // Approximate per-week index (weeks since W24/2025)
      const [yr, wk] = week.split("-W").map(Number);
      const weekIndex =
        yr === 2025 ? wk - 24 : 52 - 24 + wk;

      const budgetLine =
        (metrics.totalAwardedSpendEur / TOTAL_WEEKS) * Math.max(1, weekIndex);

      if (!isFC) {
        // historical
        const scenarioCum = Math.round(
          cum *
            (1 + volumeAdj / 100) *
            (1 + priceAdj / 100) *
            (1 - (consolidationAdj / 100) * 0.15)
        );
        points.push({
          weekLabel: label,
          actual: cum,
          baseline: null,
          scenario: scenarioCum,
          budget: Math.round(budgetLine),
        });
      }
    });

    // Add projected weeks W20–W23
    const projectedWeeks = [
      "2026-W20",
      "2026-W21",
      "2026-W22",
      "2026-W23",
    ];
    projectedWeeks.forEach((week, idx) => {
      const weekIndex = 52 - 24 + parseInt(week.split("-W")[1]);
      const elapsed = ELAPSED_WEEKS + idx + 1;
      const baselineP = Math.round(weeklyRunRate * elapsed);
      const scenarioP = Math.round(
        baselineP *
          (1 + volumeAdj / 100) *
          (1 + priceAdj / 100) *
          (1 - (consolidationAdj / 100) * 0.15)
      );
      const budgetLine = Math.round(
        (metrics.totalAwardedSpendEur / TOTAL_WEEKS) * weekIndex
      );
      points.push({
        weekLabel: week.replace("20", "").replace("-", " "),
        actual: null,
        baseline: baselineP,
        scenario: scenarioP,
        budget: budgetLine,
      });
    });

    return points;
  }, [metrics, volumeAdj, priceAdj, consolidationAdj]);

  // ── supplier impact table ──
  const supplierImpact = useMemo(() => {
    return supplierSplit.map((s) => {
      const supplierBaseline = Math.round(
        (s.actualEur / ELAPSED_WEEKS) * TOTAL_WEEKS
      );
      const supplierScenario = Math.round(
        supplierBaseline *
          (1 + volumeAdj / 100) *
          (1 + priceAdj / 100) *
          (1 - (consolidationAdj / 100) * 0.15)
      );
      const vsAwarded = supplierScenario - s.awardedEur;
      const vsAwardedPct =
        s.awardedEur > 0 ? (vsAwarded / s.awardedEur) * 100 : 0;
      return {
        ...s,
        supplierBaseline,
        supplierScenario,
        vsAwarded,
        vsAwardedPct,
      };
    });
  }, [supplierSplit, volumeAdj, priceAdj, consolidationAdj]);

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8F8F8",
        fontFamily: "var(--font-body)",
        color: "#242424",
      }}
    >
      {/* ── header ── */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #E4E4E4",
          padding: "24px 32px 20px",
        }}
      >
        <div style={{ fontSize: 12, color: "#676767", marginBottom: 6 }}>
          Strategic Procurement{" "}
          <span style={{ margin: "0 6px", color: "#C8C8C8" }}>/</span>
          Budget Forecast
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 26,
                fontWeight: 700,
                color: "#242424",
                margin: 0,
              }}
            >
              Budget Forecast
            </h1>
            <p style={{ fontSize: 13, color: "#676767", margin: "4px 0 0" }}>
              End-of-contract projections with interactive what-if scenario
              modelling · Contract W24/2025 → W23/2026
            </p>
          </div>
          <div
            style={{
              background: riskBg,
              border: `1px solid ${riskColor}30`,
              borderRadius: 8,
              padding: "8px 16px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: riskColor,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Budget Risk
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                fontWeight: 700,
                color: riskColor,
              }}
            >
              {riskLevel}
            </div>
          </div>
        </div>
      </div>

      {/* ── content ── */}
      <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
        {/* ── KPI row ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 28,
          }}
        >
          {[
            {
              label: "Total Awarded Budget",
              value: fmt(metrics.totalAwardedSpendEur),
              sub: `${metrics.supplierCount} suppliers · ${metrics.contractStart} → W23/2026`,
              accent: "#242424",
            },
            {
              label: "Total Actual Spend",
              value: fmt(metrics.totalActualSpendEur),
              sub: `${metrics.budgetUtilizationPct}% of awarded · through W19/2026`,
              accent: "#067A46",
            },
            {
              label: "Forecast End-of-Contract",
              value: fmt(baselineForecast),
              sub: `Extrapolated at current run-rate (${fmt(
                Math.round(metrics.totalActualSpendEur / ELAPSED_WEEKS)
              )}/wk)`,
              accent:
                baselineForecast > metrics.totalAwardedSpendEur
                  ? "#C0392B"
                  : "#0891B2",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              style={{
                background: "#fff",
                border: "1px solid #E4E4E4",
                borderRadius: 10,
                padding: "20px 24px",
              }}
            >
              <div style={{ fontSize: 12, color: "#676767", marginBottom: 8 }}>
                {kpi.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  fontWeight: 700,
                  color: kpi.accent,
                  lineHeight: 1.1,
                }}
              >
                {kpi.value}
              </div>
              <div style={{ fontSize: 12, color: "#AAAAAA", marginTop: 6 }}>
                {kpi.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ── scenario builder + summary ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 380px",
            gap: 20,
            marginBottom: 28,
            alignItems: "start",
          }}
        >
          {/* sliders panel */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #E4E4E4",
              borderRadius: 10,
              padding: "24px",
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#242424",
                }}
              >
                What-If Scenario Builder
              </div>
              <div style={{ fontSize: 12, color: "#676767", marginTop: 3 }}>
                Adjust levers to model how changes affect end-of-contract spend
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SliderControl
                label="Volume Adjustment"
                description="Simulate ordering more or fewer units across all categories"
                value={volumeAdj}
                min={-30}
                max={30}
                step={1}
                onChange={setVolumeAdj}
                color="#1268FF"
              />
              <SliderControl
                label="Price Inflation"
                description="Simulate commodity price changes affecting unit costs"
                value={priceAdj}
                min={-20}
                max={20}
                step={1}
                onChange={setPriceAdj}
                color="#E67E22"
              />
              <SliderControl
                label="Supplier Consolidation"
                description="Efficiency gain from moving spend to better-performing suppliers"
                value={consolidationAdj}
                min={0}
                max={40}
                step={1}
                onChange={setConsolidationAdj}
                color="#8B5CF6"
              />
            </div>
            <button
              onClick={() => {
                setVolumeAdj(0);
                setPriceAdj(0);
                setConsolidationAdj(0);
              }}
              style={{
                marginTop: 18,
                background: "none",
                border: "1px solid #E4E4E4",
                borderRadius: 6,
                padding: "7px 16px",
                fontSize: 12,
                color: "#676767",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
              }}
            >
              Reset to Baseline
            </button>
          </div>

          {/* scenario summary card */}
          <div
            style={{
              background: "#fff",
              border: `1.5px solid ${riskColor}40`,
              borderRadius: 10,
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 14,
                fontWeight: 700,
                color: "#242424",
                marginBottom: 20,
              }}
            >
              Scenario Summary
            </div>

            {[
              {
                label: "Baseline projection",
                value: fmtShort(baselineForecast),
                color: "#676767",
                mono: true,
              },
              {
                label: "Scenario adjustment",
                value:
                  (scenarioAdjustment >= 0 ? "+" : "") +
                  fmtShort(scenarioAdjustment),
                color:
                  scenarioAdjustment > 0
                    ? "#C0392B"
                    : scenarioAdjustment < 0
                    ? "#067A46"
                    : "#676767",
                mono: true,
              },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid #F0F0F0",
                }}
              >
                <span style={{ fontSize: 13, color: "#676767" }}>
                  {row.label}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    fontWeight: 600,
                    color: row.color,
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}

            {/* projected total — prominent */}
            <div
              style={{
                padding: "16px 0 14px",
                borderBottom: "1px solid #F0F0F0",
              }}
            >
              <div style={{ fontSize: 12, color: "#676767", marginBottom: 4 }}>
                Projected total
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 32,
                  fontWeight: 700,
                  color: riskColor,
                  lineHeight: 1,
                }}
              >
                {fmtShort(scenarioProjected)}
              </div>
            </div>

            {/* vs budget */}
            <div style={{ padding: "14px 0 0" }}>
              <div style={{ fontSize: 12, color: "#676767", marginBottom: 6 }}>
                vs Awarded Budget ({fmtShort(metrics.totalAwardedSpendEur)})
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 20,
                    fontWeight: 700,
                    color: riskColor,
                  }}
                >
                  {budgetVariance >= 0 ? "+" : ""}
                  {fmtShort(budgetVariance)}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    color: riskColor,
                  }}
                >
                  ({pct(budgetVariancePct)})
                </span>
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: "inline-block",
                  background: riskBg,
                  border: `1px solid ${riskColor}30`,
                  borderRadius: 20,
                  padding: "4px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: riskColor,
                }}
              >
                {riskLevel === "Red"
                  ? "Over budget — action required"
                  : riskLevel === "Amber"
                  ? "Near budget — monitor closely"
                  : "Under budget — healthy trajectory"}
              </div>
            </div>
          </div>
        </div>

        {/* ── scenario comparison chart ── */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #E4E4E4",
            borderRadius: 10,
            padding: "24px",
            marginBottom: 24,
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 700,
                color: "#242424",
              }}
            >
              Scenario Comparison
            </div>
            <div style={{ fontSize: 12, color: "#676767", marginTop: 3 }}>
              End-of-contract spend projections across scenarios vs awarded
              budget
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={scenarioComparisonData}
              barSize={52}
              margin={{ top: 16, right: 24, left: 16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#F0F0F0"
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "#676767" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => fmt(v)}
                tick={{ fontSize: 11, fill: "#676767", fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine
                y={metrics.totalAwardedSpendEur}
                stroke="#C0392B"
                strokeDasharray="5 4"
                strokeWidth={1.5}
                label={{
                  value: `Awarded Budget ${fmt(metrics.totalAwardedSpendEur)}`,
                  position: "insideTopRight",
                  fontSize: 11,
                  fill: "#C0392B",
                  fontFamily: "var(--font-mono)",
                }}
              />
              <Bar
                dataKey="value"
                name="Projected Spend"
                radius={[4, 4, 0, 0]}
                fill="#067A46"
                label={{
                  position: "top",
                  formatter: (v: number) => fmt(v),
                  fontSize: 11,
                  fill: "#676767",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {scenarioComparisonData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── forecast trajectory chart ── */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #E4E4E4",
            borderRadius: 10,
            padding: "24px",
            marginBottom: 24,
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 700,
                color: "#242424",
              }}
            >
              Forecast Trajectory
            </div>
            <div style={{ fontSize: 12, color: "#676767", marginTop: 3 }}>
              Weekly cumulative spend — historical actuals, baseline projection,
              and scenario-adjusted line vs awarded budget
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={trajectoryData}
              margin={{ top: 16, right: 24, left: 16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#F0F0F0"
              />
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 10, fill: "#676767" }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tickFormatter={(v) => fmt(v)}
                tick={{ fontSize: 11, fill: "#676767", fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12, color: "#676767" }}
              />
              {/* Budget line */}
              <Line
                type="monotone"
                dataKey="budget"
                name="Awarded Budget"
                stroke="#C0392B"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
              />
              {/* Actual cumulative spend */}
              <Area
                type="monotone"
                dataKey="actual"
                name="Actual Spend"
                stroke="#067A46"
                strokeWidth={2}
                fill="#067A4612"
                dot={false}
                connectNulls={false}
              />
              {/* Baseline projection */}
              <Line
                type="monotone"
                dataKey="baseline"
                name="Baseline Projection"
                stroke="#676767"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                connectNulls={false}
              />
              {/* Scenario adjusted */}
              <Line
                type="monotone"
                dataKey="scenario"
                name="Scenario Adjusted"
                stroke="#1268FF"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* ── supplier impact table ── */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #E4E4E4",
            borderRadius: 10,
            padding: "24px",
            marginBottom: 8,
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 700,
                color: "#242424",
              }}
            >
              Supplier-Level Impact
            </div>
            <div style={{ fontSize: 12, color: "#676767", marginTop: 3 }}>
              How the current scenario affects each supplier's projected spend
              vs their awarded budget
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1.5px solid #E4E4E4",
                    textAlign: "left",
                  }}
                >
                  {[
                    "Supplier",
                    "Actual to Date",
                    "Awarded Budget",
                    "Baseline Forecast",
                    "Scenario Projection",
                    "vs Budget",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 12px",
                        fontWeight: 600,
                        color: "#676767",
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {supplierImpact.map((row, i) => {
                  const isOver = row.vsAwardedPct > 5;
                  const isNear = row.vsAwardedPct > -5 && row.vsAwardedPct <= 5;
                  const rowColor = isOver
                    ? "#C0392B"
                    : isNear
                    ? "#E67E22"
                    : "#067A46";
                  const rowBg = isOver
                    ? "#FEF2F2"
                    : isNear
                    ? "#FFFBEB"
                    : "#F0FDF4";
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid #F4F4F4",
                        background: i % 2 === 0 ? "transparent" : "#FAFAFA",
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          fontWeight: 500,
                          color: "#242424",
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.supplier}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily: "var(--font-mono)",
                          color: "#242424",
                        }}
                      >
                        {fmt(row.actualEur)}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily: "var(--font-mono)",
                          color: "#242424",
                        }}
                      >
                        {fmt(row.awardedEur)}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily: "var(--font-mono)",
                          color: "#676767",
                        }}
                      >
                        {fmt(row.supplierBaseline)}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 600,
                          color: "#242424",
                        }}
                      >
                        {fmt(row.supplierScenario)}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 600,
                          color: rowColor,
                        }}
                      >
                        {row.vsAwarded >= 0 ? "+" : ""}
                        {fmtShort(row.vsAwarded)}{" "}
                        <span style={{ fontSize: 11 }}>
                          ({pct(row.vsAwardedPct)})
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            background: rowBg,
                            color: rowColor,
                            border: `1px solid ${rowColor}30`,
                            borderRadius: 20,
                            padding: "2px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {isOver ? "Over Budget" : isNear ? "Near Budget" : "On Track"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr
                  style={{
                    borderTop: "2px solid #E4E4E4",
                    background: "#FAFAFA",
                    fontWeight: 700,
                  }}
                >
                  <td
                    style={{
                      padding: "12px 12px",
                      fontWeight: 700,
                      color: "#242424",
                    }}
                  >
                    Total
                  </td>
                  <td
                    style={{
                      padding: "12px 12px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      color: "#242424",
                    }}
                  >
                    {fmt(metrics.totalActualSpendEur)}
                  </td>
                  <td
                    style={{
                      padding: "12px 12px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      color: "#242424",
                    }}
                  >
                    {fmt(metrics.totalAwardedSpendEur)}
                  </td>
                  <td
                    style={{
                      padding: "12px 12px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      color: "#676767",
                    }}
                  >
                    {fmt(baselineForecast)}
                  </td>
                  <td
                    style={{
                      padding: "12px 12px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      color: riskColor,
                    }}
                  >
                    {fmt(scenarioProjected)}
                  </td>
                  <td
                    style={{
                      padding: "12px 12px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      color: riskColor,
                    }}
                  >
                    {budgetVariance >= 0 ? "+" : ""}
                    {fmtShort(budgetVariance)}{" "}
                    <span style={{ fontSize: 11 }}>
                      ({pct(budgetVariancePct)})
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px 12px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        background: riskBg,
                        color: riskColor,
                        border: `1px solid ${riskColor}30`,
                        borderRadius: 20,
                        padding: "2px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {riskLevel}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* methodology footnote */}
        <div
          style={{
            padding: "12px 0 4px",
            fontSize: 11,
            color: "#AAAAAA",
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "#676767" }}>Methodology:</strong> Baseline
          forecast = (Total actual spend ÷ {ELAPSED_WEEKS} elapsed weeks) ×{" "}
          {TOTAL_WEEKS} contract weeks. Scenario projection = Baseline ×
          (1 + Volume%) × (1 + Price%) × (1 − Consolidation% × 0.15). Budget
          risk: Green &lt;95% of awarded; Amber 95–105%; Red &gt;105%.
          Contract period W24/2025 → W23/2026. Data as of W19/2026.
        </div>
      </div>
    </div>
  );
}
