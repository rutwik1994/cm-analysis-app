"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { ROWS, computeMetrics, computeSupplierSplit, SUPPLIER_COLOR, type SpendRow } from "@/lib/data";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt     = (n: number) => n >= 1_000_000 ? `€${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `€${(n / 1000).toFixed(1)}k` : `€${n.toLocaleString()}`;
const fmtFull = (n: number) => `€${n.toLocaleString("de-DE")}`;
const utilPct = (actual: number, awarded: number) => awarded > 0 ? Math.round(actual / awarded * 100) : 0;

const CATEGORY_CHIP: Record<string, { bg: string; color: string }> = {
  Bakery:  { bg: "#FEF3C7", color: "#92400E" },
  Grocery: { bg: "#EFF6FF", color: "#1E40AF" },
  Protein: { bg: "#F0FDF4", color: "#166534" },
};

function riskBadge(pct: number): { label: string; bg: string; color: string } {
  if (pct >= 95) return { label: "Critical",        bg: "#FEE2E2", color: "#B91C1C" };
  if (pct >= 80) return { label: "At Risk",          bg: "#FEF3C7", color: "#92400E" };
  if (pct <= 60) return { label: "Under-Delivering", bg: "#EFF6FF", color: "#1E40AF" };
  return              { label: "On Track",           bg: "#F0FDF4", color: "#166534" };
}

function KpiCard({ label, value, sub, tone }: {
  label: string; value: string; sub?: string;
  tone?: "positive" | "warning" | "danger" | "neutral";
}) {
  const subColor = tone === "positive" ? "#067A46" : tone === "warning" ? "#A43700" : tone === "danger" ? "#B30000" : "#676767";
  return (
    <div style={{
      flex: 1, minWidth: 150, background: "#fff", borderRadius: 10, padding: "18px 20px",
      border: `1px solid ${tone === "danger" ? "#FCA5A5" : tone === "warning" ? "#FCD34D" : "#E4E4E4"}`,
      boxShadow: "0 1px 3px rgba(36,36,36,.06)",
    }}>
      <div style={{ font: "400 11px/16px var(--font-body)", color: "#676767", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
      <div style={{ font: "700 26px/32px var(--font-display)", color: "#242424" }}>{value}</div>
      {sub && <div style={{ font: "400 12px/16px var(--font-body)", color: subColor, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function UtilBar({ actual, awarded, color }: { actual: number; awarded: number; color: string }) {
  const pct = utilPct(actual, awarded);
  const isRisk = pct >= 80;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ font: "400 11px/14px var(--font-body)", color: "#676767" }}>{fmtFull(actual)} actual</span>
        <span style={{ font: "600 11px/14px var(--font-body)", color: isRisk ? "#B91C1C" : "#242424" }}>{pct}%</span>
      </div>
      <div style={{ height: 7, background: "#EEEEEE", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: isRisk ? "#DC2626" : color, borderRadius: 4, transition: "width 600ms cubic-bezier(0,0,0.2,1)" }} />
      </div>
      <div style={{ font: "400 10px/14px var(--font-body)", color: "#9CA3AF", marginTop: 3 }}>of {fmtFull(awarded)} awarded</div>
    </div>
  );
}

function SupplierCard({
  supplier, category, actual, awarded, cm, lastWeek, onGenerateBrief, brief, loadingBrief,
}: {
  supplier: string; category: string; actual: number; awarded: number;
  cm: string; lastWeek: string;
  onGenerateBrief: () => void; brief?: string; loadingBrief: boolean;
}) {
  const color = SUPPLIER_COLOR[supplier] ?? "#067A46";
  const pct   = utilPct(actual, awarded);
  const badge = riskBadge(pct);
  const catStyle = CATEGORY_CHIP[category] ?? { bg: "#F5F5F5", color: "#374151" };
  return (
    <div style={{ background: "#fff", border: `1px solid ${pct >= 95 ? "#FCA5A5" : pct >= 80 ? "#FCD34D" : "#E4E4E4"}`, borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 4px rgba(36,36,36,.06)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block", marginTop: 2 }} />
          <div>
            <div style={{ font: "700 15px/20px var(--font-display)", color: "#242424" }}>{supplier}</div>
            <div style={{ font: "400 11px/16px var(--font-body)", color: "#676767", marginTop: 2 }}>CM: {cm}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <span style={{ font: "600 11px/14px var(--font-body)", padding: "3px 8px", borderRadius: 99, background: badge.bg, color: badge.color }}>{badge.label}</span>
          <span style={{ font: "500 10px/14px var(--font-body)", padding: "2px 7px", borderRadius: 99, background: catStyle.bg, color: catStyle.color }}>{category}</span>
        </div>
      </div>
      <UtilBar actual={actual} awarded={awarded} color={color} />
      <div style={{ font: "400 10px/14px var(--font-body)", color: "#9CA3AF", marginTop: 10 }}>Last update: {lastWeek}</div>
      <div style={{ marginTop: 16 }}>
        <button
          onClick={onGenerateBrief} disabled={loadingBrief}
          style={{ font: "600 12px/18px var(--font-body)", padding: "8px 14px", borderRadius: 8, border: "1px solid #067A46", background: loadingBrief ? "#F0FDF4" : "#fff", color: "#067A46", cursor: loadingBrief ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
          onMouseEnter={e => { if (!loadingBrief) (e.currentTarget as HTMLButtonElement).style.background = "#F0FDF4"; }}
          onMouseLeave={e => { if (!loadingBrief) (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
        >
          {loadingBrief ? (<><span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid #067A46", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Generating…</>) : "🤝 Generate Negotiation Brief"}
        </button>
      </div>
      {brief && (
        <div style={{ marginTop: 16, padding: "16px 18px", background: "#F8FFF8", border: "1px solid #BBF7D0", borderRadius: 10, font: "400 13px/20px var(--font-body)", color: "#242424", whiteSpace: "pre-wrap" }}>
          {brief}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function CmSection({ name, suppliers, rows, marketLabel }: { name: string; suppliers: string[]; rows: SpendRow[]; marketLabel: string }) {
  const cmRows  = rows.filter(r => suppliers.includes(r.supplier));
  const metrics = computeMetrics(cmRows);
  const split   = computeSupplierSplit(cmRows);
  return (
    <div style={{ background: "#fff", border: "1px solid #E4E4E4", borderRadius: 12, padding: "22px 24px", boxShadow: "0 1px 4px rgba(36,36,36,.06)", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#FEF9C3", display: "flex", alignItems: "center", justifyContent: "center", font: "700 16px/1 var(--font-display)", color: "#92400E" }}>
            {name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ font: "700 16px/22px var(--font-display)", color: "#242424" }}>{name}</div>
            <div style={{ font: "400 12px/16px var(--font-body)", color: "#676767", marginTop: 2 }}>Category Manager · {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""} in {marketLabel}</div>
          </div>
        </div>
        <span style={{ font: "600 12px/16px var(--font-body)", padding: "5px 12px", borderRadius: 99, background: "#EFF6FF", color: "#1E40AF", border: "1px solid #BFDBFE" }}>Contact</span>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[{ label: "Portfolio Spend", value: fmt(metrics.totalActualSpendEur) }, { label: "Budget Util", value: `${metrics.budgetUtilizationPct}%` }, { label: "At-Risk", value: String(metrics.atRiskSuppliers) }].map(k => (
          <div key={k.label} style={{ background: "#F8F8F8", borderRadius: 8, padding: "10px 16px", minWidth: 120 }}>
            <div style={{ font: "400 10px/14px var(--font-body)", color: "#676767", textTransform: "uppercase", letterSpacing: ".04em" }}>{k.label}</div>
            <div style={{ font: "700 18px/24px var(--font-display)", color: "#242424", marginTop: 2 }}>{k.value}</div>
          </div>
        ))}
      </div>
      {split.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ font: "500 11px/16px var(--font-body)", color: "#676767", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".04em" }}>Supplier Split</div>
          {split.map(s => (
            <div key={s.supplier} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: SUPPLIER_COLOR[s.supplier] ?? "#067A46", flexShrink: 0, display: "inline-block" }} />
              <span style={{ font: "400 12px/16px var(--font-body)", color: "#242424", flex: 1 }}>{s.supplier}</span>
              <span style={{ font: "600 12px/16px var(--font-body)", color: "#242424" }}>{s.pct}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Page() {
  const MARKET = "DKSE";
  const marketRows = useMemo(() => ROWS.filter(r => r.market === MARKET), []);
  const metrics    = useMemo(() => computeMetrics(marketRows), [marketRows]);
  const split      = useMemo(() => computeSupplierSplit(marketRows), [marketRows]);

  const [briefs,       setBriefs]       = useState<Record<string, string>>({});
  const [loadingBrief, setLoadingBrief] = useState<Record<string, boolean>>({});

  async function generateBrief(supplier: string, category: string, cm: string) {
    const entry = split.find(s => s.supplier === supplier);
    if (!entry) return;
    const pct = utilPct(entry.actualEur, entry.awardedEur);
    const question = `Generate negotiation preparation talking points for our upcoming renewal discussion with ${supplier} in ${MARKET}. They supply ${category}. Current spend: ${fmtFull(entry.actualEur)}, Budget utilisation: ${pct}%, Category Manager: ${cm}. Include: (1) Our leverage points, (2) Their leverage points, (3) Recommended opening position, (4) Key risks to flag, (5) Walk-away criteria. Be specific and actionable.`;
    const context  = `Supplier: ${supplier}\nMarket: ${MARKET}\nCategory: ${category}\nCumulative Actual Spend: ${fmtFull(entry.actualEur)}\nCumulative Awarded Spend: ${fmtFull(entry.awardedEur)}\nBudget Utilisation: ${pct}%\nCategory Manager: ${cm}`;
    setLoadingBrief(p => ({ ...p, [supplier]: true }));
    try {
      const res  = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, context }) });
      const data = await res.json();
      setBriefs(p => ({ ...p, [supplier]: data.answer ?? data.error ?? "No response." }));
    } catch {
      setBriefs(p => ({ ...p, [supplier]: "Failed to generate brief. Please try again." }));
    } finally {
      setLoadingBrief(p => ({ ...p, [supplier]: false }));
    }
  }

  type SupplierMeta = { supplier: string; category: string; cm: string };
  const supplierMeta: SupplierMeta[] = [
    { supplier: "NordicGrain AB",       category: "Grocery", cm: "Gianna Tyrpin" },
    { supplier: "Scandinavian Mills",   category: "Grocery", cm: "Gianna Tyrpin" },
    { supplier: "Scandinavian Meats AB", category: "Protein", cm: "Nicolò Godi + Mathilde Vannier" },
    { supplier: "Nordic Beef AS",        category: "Protein", cm: "Nicolò Godi + Mathilde Vannier" },
  ];

  const lastWeekMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of marketRows) {
      if (!m[r.supplier] || r.contractWeek > m[r.supplier]) m[r.supplier] = r.contractWeek;
    }
    return m;
  }, [marketRows]);

  return (
    <div style={{ background: "#F8F8F8", minHeight: "100vh", padding: "32px 24px", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, font: "400 13px/18px var(--font-body)", color: "#676767" }}>
          <Link href="/" style={{ color: "#676767", textDecoration: "none" }}>Dashboard</Link>
          <span>/</span>
          <Link href="/category" style={{ color: "#676767", textDecoration: "none" }}>Category</Link>
          <span>/</span>
          <span style={{ color: "#242424", fontWeight: 600 }}>DKSE</span>
        </div>

        {/* HIGH RISK banner */}
        <div style={{
          background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10,
          padding: "14px 18px", marginBottom: 24,
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>🔴</span>
          <div>
            <div style={{ font: "700 14px/20px var(--font-display)", color: "#B91C1C", marginBottom: 4 }}>
              HIGH RISK MARKET — Immediate Attention Required
            </div>
            <div style={{ font: "400 13px/18px var(--font-body)", color: "#991B1B" }}>
              DKSE has at-risk suppliers approaching or exceeding budget thresholds.
              <strong> Beef Mince 500g</strong> (Scandinavian Meats AB &amp; Nordic Beef AS) is at ≥95% utilisation.
              <strong> Jasmine Rice 1kg</strong> (NordicGrain AB &amp; Scandinavian Mills) is at ≥92% utilisation.
              Engage category managers immediately to assess reforecast and contingency options.
            </div>
          </div>
        </div>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ font: "700 28px/36px var(--font-display)", color: "#242424", margin: 0 }}>DKSE Category Management</h1>
            <p style={{ font: "400 14px/20px var(--font-body)", color: "#676767", margin: "6px 0 0" }}>
              Grocery · Protein — contract spend overview &amp; negotiation prep
            </p>
          </div>
          <Link href="/category" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            font: "600 13px/18px var(--font-body)", color: "#242424",
            background: "#fff", border: "1px solid #E4E4E4", borderRadius: 8,
            padding: "8px 14px", textDecoration: "none",
          }}>← Back to Category</Link>
        </div>

        {/* KPIs */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
          <KpiCard label="Total Spend" value={fmt(metrics.totalActualSpendEur)} sub={`of ${fmt(metrics.totalAwardedSpendEur)} awarded`} tone="neutral" />
          <KpiCard label="Budget Utilisation" value={`${metrics.budgetUtilizationPct}%`} sub={metrics.budgetUtilizationPct >= 90 ? "⚠ Critical — near budget ceiling" : "Monitor closely"} tone={metrics.budgetUtilizationPct >= 90 ? "danger" : "warning"} />
          <KpiCard label="Suppliers" value={String(metrics.supplierCount)} sub="Active contracts" tone="neutral" />
          <KpiCard label="At-Risk Suppliers" value={String(metrics.atRiskSuppliers)} sub={metrics.atRiskSuppliers > 0 ? "≥80% budget used" : "All within budget"} tone={metrics.atRiskSuppliers > 0 ? "danger" : "positive"} />
        </div>

        {/* No Bakery notice */}
        <div style={{ background: "#FAFAFA", border: "1px solid #E4E4E4", borderRadius: 10, padding: "12px 16px", marginBottom: 24, font: "400 13px/18px var(--font-body)", color: "#676767", display: "flex", alignItems: "center", gap: 8 }}>
          <span>ℹ️</span>
          No Bakery contracts active in the DKSE market for this contract period.
        </div>

        {/* Category Managers */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ font: "700 18px/24px var(--font-display)", color: "#242424", margin: "0 0 16px" }}>Category Managers</h2>
          <CmSection name="Gianna Tyrpin"    suppliers={["NordicGrain AB", "Scandinavian Mills"]}                  rows={marketRows} marketLabel={MARKET} />
          <CmSection name="Nicolò Godi"      suppliers={["Scandinavian Meats AB", "Nordic Beef AS"]}               rows={marketRows} marketLabel={MARKET} />
          <CmSection name="Mathilde Vannier" suppliers={["Scandinavian Meats AB", "Nordic Beef AS"]}               rows={marketRows} marketLabel={MARKET} />
        </div>

        {/* Supplier Performance + Negotiation Prep */}
        <div>
          <h2 style={{ font: "700 18px/24px var(--font-display)", color: "#242424", margin: "0 0 8px" }}>Supplier Performance &amp; Negotiation Prep</h2>
          <p style={{ font: "400 13px/18px var(--font-body)", color: "#B91C1C", margin: "0 0 20px", display: "flex", alignItems: "center", gap: 6 }}>
            <span>⚠</span> Priority market — generate briefs for high-utilisation suppliers first.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 16 }}>
            {supplierMeta.map(({ supplier, category, cm }) => {
              const entry = split.find(s => s.supplier === supplier);
              if (!entry) return null;
              return (
                <SupplierCard
                  key={supplier}
                  supplier={supplier} category={category} actual={entry.actualEur} awarded={entry.awardedEur}
                  cm={cm} lastWeek={lastWeekMap[supplier] ?? "—"}
                  onGenerateBrief={() => generateBrief(supplier, category, cm)}
                  brief={briefs[supplier]} loadingBrief={loadingBrief[supplier] ?? false}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
