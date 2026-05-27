"use client";

import { useState, useMemo } from "react";
import { ROWS, SUPPLIER_COLOR, SpendRow } from "@/lib/data";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractEntry {
  supplier: string;
  category: string;
  market: string;
  categoryManager: string;
  contractStart: string;
  contractEnd: string;
  daysUntilExpiry: number;
  actualSpend: number;
  awardedSpend: number;
  utilPct: number;
  status: "Critical" | "At Risk" | "On Track" | "Under-delivering";
  needsRenewal: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTRACT_END_DATE = new Date("2026-06-07");
const TODAY = new Date("2026-05-14");
const DAYS_REMAINING = Math.round(
  (CONTRACT_END_DATE.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24)
);

// ─── Derive contract entries from ROWS ───────────────────────────────────────

function buildContracts(rows: SpendRow[]): ContractEntry[] {
  // One entry per supplier — take max cumulative values
  const map = new Map<
    string,
    {
      supplier: string;
      category: string;
      market: string;
      categoryManager: string;
      actualSpend: number;
      awardedSpend: number;
      minWeek: string;
      maxWeek: string;
      hasForecast: boolean;
    }
  >();

  for (const r of rows) {
    const existing = map.get(r.supplier);
    if (!existing) {
      map.set(r.supplier, {
        supplier: r.supplier,
        category: r.category,
        market: r.market,
        categoryManager: r.categoryManager,
        actualSpend: r.cumulativeActualSpendEur,
        awardedSpend: r.cumulativeAwardedSpendEur,
        minWeek: r.contractWeek,
        maxWeek: r.contractWeek,
        hasForecast: r.actualsStatus === "Forecast",
      });
    } else {
      if (r.cumulativeActualSpendEur > existing.actualSpend)
        existing.actualSpend = r.cumulativeActualSpendEur;
      if (r.cumulativeAwardedSpendEur > existing.awardedSpend)
        existing.awardedSpend = r.cumulativeAwardedSpendEur;
      if (r.contractWeek < existing.minWeek) existing.minWeek = r.contractWeek;
      if (r.contractWeek > existing.maxWeek) existing.maxWeek = r.contractWeek;
      if (r.actualsStatus === "Forecast") existing.hasForecast = true;
    }
  }

  return [...map.values()].map((e) => {
    const util =
      e.awardedSpend > 0
        ? Math.round((e.actualSpend / e.awardedSpend) * 1000) / 10
        : 0;

    let status: ContractEntry["status"];
    if (util >= 90) status = "Critical";
    else if (util >= 80) status = "At Risk";
    else if (util < 40) status = "Under-delivering";
    else status = "On Track";

    return {
      supplier: e.supplier,
      category: e.category,
      market: e.market,
      categoryManager: e.categoryManager,
      contractStart: "2025-W24",
      contractEnd: e.hasForecast ? "2026-W21" : "2026-W23",
      daysUntilExpiry: DAYS_REMAINING,
      actualSpend: e.actualSpend,
      awardedSpend: e.awardedSpend,
      utilPct: util,
      status,
      needsRenewal: status === "Critical" || status === "At Risk",
    };
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtEur(val: number): string {
  if (val >= 1_000_000) return `€${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `€${(val / 1_000).toFixed(0)}K`;
  return `€${val}`;
}

function statusColor(status: ContractEntry["status"]): string {
  switch (status) {
    case "Critical":
      return "#DC2626";
    case "At Risk":
      return "#D97706";
    case "On Track":
      return "#067A46";
    case "Under-delivering":
      return "#0369A1";
  }
}

function statusBg(status: ContractEntry["status"]): string {
  switch (status) {
    case "Critical":
      return "#FEF2F2";
    case "At Risk":
      return "#FFFBEB";
    case "On Track":
      return "#F0FDF4";
    case "Under-delivering":
      return "#EFF6FF";
  }
}

function utilBarColor(util: number): string {
  if (util >= 90) return "#DC2626";
  if (util >= 80) return "#D97706";
  if (util < 40) return "#0369A1";
  return "#067A46";
}

function urgencyBorder(c: ContractEntry): string {
  if (c.status === "Critical") return "2px solid #DC2626";
  if (c.status === "At Risk") return "2px solid #D97706";
  return "1px solid #E4E4E4";
}

type FilterKey = "All" | "Critical" | "At Risk" | "On Track" | "Under-delivering";

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E4E4E4",
        borderRadius: 10,
        padding: "20px 24px",
        flex: 1,
        minWidth: 180,
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "#676767",
          fontFamily: "var(--font-body)",
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          fontFamily: "var(--font-display)",
          color: accent ?? "#242424",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 12,
            color: "#676767",
            marginTop: 6,
            fontFamily: "var(--font-body)",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontFamily: "var(--font-body)",
        color,
        background: `${color}18`,
        border: `1px solid ${color}40`,
        borderRadius: 4,
        padding: "2px 7px",
        lineHeight: "18px",
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

function UtilBar({ pct }: { pct: number }) {
  const color = utilBarColor(pct);
  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "#676767",
            fontFamily: "var(--font-body)",
          }}
        >
          Budget utilisation
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            color,
          }}
        >
          {pct.toFixed(1)}%
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: "#F0F0F0",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(pct, 100)}%`,
            background: color,
            borderRadius: 3,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ContractEntry["status"] }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "var(--font-body)",
        color: statusColor(status),
        background: statusBg(status),
        border: `1px solid ${statusColor(status)}30`,
        borderRadius: 4,
        padding: "3px 8px",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {status}
    </span>
  );
}

function RenewalFlag() {
  return (
    <span
      title="Renewal action required"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: "#FEF2F2",
        border: "1px solid #DC262630",
        fontSize: 12,
        cursor: "default",
        flexShrink: 0,
      }}
    >
      ⚑
    </span>
  );
}

function ContractCard({ c }: { c: ContractEntry }) {
  const dotColor = SUPPLIER_COLOR[c.supplier] ?? "#067A46";
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: urgencyBorder(c),
        borderRadius: 10,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Row 1: dot + supplier + status + renewal flag */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: dotColor,
            flexShrink: 0,
            marginTop: 4,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "var(--font-display)",
              color: "#242424",
              marginBottom: 6,
              lineHeight: 1.3,
            }}
          >
            {c.supplier}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            <Chip label={c.category} color="#8B5CF6" />
            <Chip label={c.market} color="#0369A1" />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StatusBadge status={c.status} />
          {c.needsRenewal && <RenewalFlag />}
        </div>
      </div>

      {/* Row 2: utilisation bar */}
      <UtilBar pct={c.utilPct} />

      {/* Row 3: spend amounts */}
      <div
        style={{
          display: "flex",
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: "#676767",
              fontFamily: "var(--font-body)",
              marginBottom: 2,
            }}
          >
            Actual spend
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: "#242424",
            }}
          >
            {fmtEur(c.actualSpend)}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              color: "#676767",
              fontFamily: "var(--font-body)",
              marginBottom: 2,
            }}
          >
            Awarded budget
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: "#242424",
            }}
          >
            {fmtEur(c.awardedSpend)}
          </div>
        </div>
      </div>

      {/* Row 4: contract period + expiry + manager */}
      <div
        style={{
          borderTop: "1px solid #F0F0F0",
          paddingTop: 10,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              color: "#676767",
              fontFamily: "var(--font-body)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 3,
            }}
          >
            Contract period
          </div>
          <div
            style={{
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: "#242424",
            }}
          >
            {c.contractStart} → {c.contractEnd}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 10,
              color: "#676767",
              fontFamily: "var(--font-body)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 3,
            }}
          >
            Expires in
          </div>
          <div
            style={{
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              color: c.daysUntilExpiry < 30 ? "#D97706" : "#242424",
            }}
          >
            {c.daysUntilExpiry} days
          </div>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <div
            style={{
              fontSize: 10,
              color: "#676767",
              fontFamily: "var(--font-body)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 3,
            }}
          >
            Category manager
          </div>
          <div
            style={{
              fontSize: 12,
              fontFamily: "var(--font-body)",
              color: "#242424",
              fontWeight: 500,
            }}
          >
            {c.categoryManager}
          </div>
        </div>
      </div>
    </div>
  );
}

function RenewalActionRow({ c, rank }: { c: ContractEntry; rank: number }) {
  const urgencyColor = c.status === "Critical" ? "#DC2626" : "#D97706";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 20px",
        borderBottom: "1px solid #F0F0F0",
        background: rank % 2 === 0 ? "#FAFAFA" : "#FFFFFF",
      }}
    >
      {/* Rank badge */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: urgencyColor,
          color: "#FFFFFF",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {rank}
      </div>

      {/* Supplier + chips */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-display)",
            color: "#242424",
            marginBottom: 4,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {c.supplier}
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          <Chip label={c.category} color="#8B5CF6" />
          <Chip label={c.market} color="#0369A1" />
        </div>
      </div>

      {/* Status */}
      <div style={{ flexShrink: 0 }}>
        <StatusBadge status={c.status} />
      </div>

      {/* Util */}
      <div
        style={{
          flexShrink: 0,
          textAlign: "right",
          minWidth: 70,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            fontFamily: "var(--font-mono)",
            color: utilBarColor(c.utilPct),
            lineHeight: 1,
          }}
        >
          {c.utilPct.toFixed(1)}%
        </div>
        <div
          style={{
            fontSize: 10,
            color: "#676767",
            fontFamily: "var(--font-body)",
            marginTop: 2,
          }}
        >
          utilised
        </div>
      </div>

      {/* Manager */}
      <div
        style={{
          flexShrink: 0,
          minWidth: 160,
          paddingLeft: 12,
          borderLeft: "1px solid #E4E4E4",
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "#676767",
            fontFamily: "var(--font-body)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 3,
          }}
        >
          Owner
        </div>
        <div
          style={{
            fontSize: 12,
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            color: "#242424",
          }}
        >
          {c.categoryManager}
        </div>
      </div>

      {/* Expiry */}
      <div style={{ flexShrink: 0, textAlign: "right", minWidth: 80 }}>
        <div
          style={{
            fontSize: 10,
            color: "#676767",
            fontFamily: "var(--font-body)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 3,
          }}
        >
          Expires
        </div>
        <div
          style={{
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            color: "#D97706",
          }}
        >
          {c.daysUntilExpiry}d
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Page() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("All");

  const allContracts = useMemo(() => buildContracts(ROWS), []);

  const kpi = useMemo(() => {
    const total = allContracts.length;
    const expiringSoon = allContracts.filter((c) => c.daysUntilExpiry < 30).length;
    const atRisk = allContracts.filter(
      (c) => c.status === "At Risk" || c.status === "Critical"
    ).length;
    return { total, expiringSoon, atRisk };
  }, [allContracts]);

  const filtered = useMemo(() => {
    if (activeFilter === "All") return allContracts;
    return allContracts.filter((c) => c.status === activeFilter);
  }, [allContracts, activeFilter]);

  const renewalList = useMemo(
    () =>
      allContracts
        .filter((c) => c.needsRenewal)
        .sort((a, b) => b.utilPct - a.utilPct),
    [allContracts]
  );

  const FILTERS: FilterKey[] = [
    "All",
    "Critical",
    "At Risk",
    "On Track",
    "Under-delivering",
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8F8F8",
        fontFamily: "var(--font-body)",
        padding: "32px 32px 64px",
      }}
    >
      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 12,
            color: "#676767",
            fontFamily: "var(--font-body)",
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>Strategic Procurement</span>
          <span style={{ color: "#C4C4C4" }}>/</span>
          <span style={{ color: "#242424", fontWeight: 500 }}>Contract Monitor</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              color: "#242424",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Contract Monitor
          </h1>
          <div
            style={{
              fontSize: 12,
              color: "#676767",
              fontFamily: "var(--font-mono)",
              background: "#FFFFFF",
              border: "1px solid #E4E4E4",
              borderRadius: 6,
              padding: "5px 10px",
            }}
          >
            As of 2026-05-14 · Contract end 2026-06-07
          </div>
        </div>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 14,
            color: "#676767",
            fontFamily: "var(--font-body)",
          }}
        >
          Monitor active supplier contracts, budget utilisation, and renewal
          actions across all categories and markets.
        </p>
      </div>

      {/* ── KPI Strip ── */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 28,
          flexWrap: "wrap",
        }}
      >
        <KpiCard
          label="Total Active Contracts"
          value={kpi.total}
          sub={`${[...new Set(ROWS.map((r) => r.supplier))].length} unique suppliers`}
        />
        <KpiCard
          label="Expiring < 30 days"
          value={kpi.expiringSoon}
          sub={`${DAYS_REMAINING} days to contract end`}
          accent={kpi.expiringSoon > 0 ? "#D97706" : "#067A46"}
        />
        <KpiCard
          label="At-Risk Contracts"
          value={kpi.atRisk}
          sub="Utilisation ≥ 80% of awarded budget"
          accent={kpi.atRisk > 0 ? "#DC2626" : "#067A46"}
        />
      </div>

      {/* ── Section: Contract Timeline ── */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              fontSize: 17,
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              color: "#242424",
              margin: 0,
            }}
          >
            Contract Timeline
          </h2>

          {/* Filter pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTERS.map((f) => {
              const isActive = activeFilter === f;
              const fgColor =
                f === "Critical"
                  ? "#DC2626"
                  : f === "At Risk"
                  ? "#D97706"
                  : f === "On Track"
                  ? "#067A46"
                  : f === "Under-delivering"
                  ? "#0369A1"
                  : "#242424";
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-body)",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "#FFFFFF" : fgColor,
                    background: isActive ? fgColor : "#FFFFFF",
                    border: `1px solid ${fgColor}60`,
                    borderRadius: 6,
                    padding: "5px 12px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    outline: "none",
                  }}
                >
                  {f}
                  {f !== "All" && (
                    <span
                      style={{
                        marginLeft: 5,
                        fontSize: 11,
                        opacity: 0.8,
                      }}
                    >
                      ({allContracts.filter((c) => c.status === f).length})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress legend */}
        <div
          style={{
            display: "flex",
            gap: 20,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {[
            { color: "#DC2626", label: "Critical ≥ 90%" },
            { color: "#D97706", label: "At Risk ≥ 80%" },
            { color: "#067A46", label: "On Track 40–79%" },
            { color: "#0369A1", label: "Under-delivering < 40%" },
          ].map(({ color, label }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: "#676767",
                fontFamily: "var(--font-body)",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: color,
                  flexShrink: 0,
                }}
              />
              {label}
            </div>
          ))}
        </div>

        {/* Cards grid */}
        {filtered.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "#676767",
              fontSize: 14,
              fontFamily: "var(--font-body)",
              background: "#FFFFFF",
              border: "1px solid #E4E4E4",
              borderRadius: 10,
            }}
          >
            No contracts match this filter.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 16,
            }}
          >
            {filtered
              .sort((a, b) => b.utilPct - a.utilPct)
              .map((c) => (
                <ContractCard key={c.supplier} c={c} />
              ))}
          </div>
        )}
      </div>

      {/* ── Section: Renewal Action List ── */}
      {renewalList.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <div style={{ marginBottom: 16 }}>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                fontFamily: "var(--font-display)",
                color: "#242424",
                margin: "0 0 4px",
              }}
            >
              Renewal Action List
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "#676767",
                fontFamily: "var(--font-body)",
              }}
            >
              Suppliers requiring immediate attention — action with the listed
              category manager before contract expiry on{" "}
              <strong style={{ color: "#D97706" }}>2026-06-07</strong> (
              {DAYS_REMAINING} days remaining).
            </p>
          </div>

          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E4E4E4",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "44px 1fr 100px 80px 160px 80px",
                gap: 0,
                padding: "10px 20px",
                background: "#F8F8F8",
                borderBottom: "1px solid #E4E4E4",
              }}
            >
              {["#", "Supplier", "Status", "Utilised", "Owner", "Expires"].map(
                (h) => (
                  <div
                    key={h}
                    style={{
                      fontSize: 10,
                      fontFamily: "var(--font-body)",
                      fontWeight: 700,
                      color: "#676767",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                    }}
                  >
                    {h}
                  </div>
                )
              )}
            </div>

            {/* Rows */}
            {renewalList.map((c, i) => (
              <RenewalActionRow key={c.supplier} c={c} rank={i + 1} />
            ))}

            {/* Footer */}
            <div
              style={{
                padding: "12px 20px",
                background: "#FAFAFA",
                borderTop: "1px solid #F0F0F0",
                fontSize: 11,
                color: "#676767",
                fontFamily: "var(--font-body)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                {renewalList.length} contract
                {renewalList.length !== 1 ? "s" : ""} need action
              </span>
              <span style={{ fontFamily: "var(--font-mono)" }}>
                Sorted by utilisation (highest risk first)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer note ── */}
      <div
        style={{
          marginTop: 40,
          padding: "14px 20px",
          background: "#FFFFFF",
          border: "1px solid #E4E4E4",
          borderRadius: 10,
          fontSize: 12,
          color: "#676767",
          fontFamily: "var(--font-body)",
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
        }}
      >
        <span style={{ fontSize: 14 }}>ℹ️</span>
        <span>
          Contract period 2025-W24 → 2026-W23. Forecast suppliers (with rows
          through 2026-W21) reflect projected utilisation. Budget utilisation is
          computed as cumulative actual spend ÷ cumulative awarded budget at the
          latest data point per supplier. Days remaining computed from today
          (2026-05-14) to contract end (2026-06-07).
        </span>
      </div>
    </div>
  );
}
