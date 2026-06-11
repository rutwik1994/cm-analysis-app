"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { CategorySupplierRow } from "@/app/api/category-suppliers/route";

// ── Constants ─────────────────────────────────────────────────────────────────
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

const fmt = (n: number) =>
  n >= 1_000_000 ? `€${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `€${(n / 1_000).toFixed(0)}k`
  : `€${n.toFixed(0)}`;

const fmtVol = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(0)}k`
  : `${n}`;

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 150, background: "#fff", borderRadius: 10, padding: "18px 20px",
      border: "1px solid #E4E4E4", boxShadow: "0 1px 3px rgba(36,36,36,.06)",
    }}>
      <div style={{ font: "400 11px/16px var(--font-body)", color: "#676767", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>
        {label}
      </div>
      <div style={{ font: "700 26px/32px var(--font-display)", color: "#242424" }}>{value}</div>
      {sub && <div style={{ font: "400 12px/16px var(--font-body)", color: "#676767", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Supplier Card ─────────────────────────────────────────────────────────────
function SupplierCard({
  rank, supplier, spendEur, units, skus,
  onGenerateBrief, brief, loadingBrief,
}: {
  rank: number;
  supplier: string;
  spendEur: number;
  units: number;
  skus: number;
  onGenerateBrief: () => void;
  brief: string;
  loadingBrief: boolean;
}) {
  const riskLabel = rank <= 2 ? "High Dependency" : rank <= 5 ? "Medium" : "Low";
  const riskColor = rank <= 2 ? "#DC2626" : rank <= 5 ? "#D97706" : "#067A46";
  const dotColor  = rank <= 2 ? "#FCA5A5" : rank <= 5 ? "#FCD34D" : "#86EFAC";

  return (
    <div style={{
      background: "#fff", border: "1px solid #E4E4E4", borderRadius: 12,
      padding: "20px 22px", boxShadow: "0 1px 4px rgba(36,36,36,.06)",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0, display: "inline-block", marginTop: 2 }} />
          <div>
            <div style={{ font: "600 14px/20px var(--font-display)", color: "#111827" }}>{supplier}</div>
            <div style={{ font: "400 11px/14px var(--font-body)", color: "#9CA3AF", marginTop: 2 }}>Rank #{rank}</div>
          </div>
        </div>
        <span style={{
          background: riskColor + "18", color: riskColor, border: `1px solid ${riskColor}40`,
          borderRadius: 6, padding: "2px 8px", font: "600 10px/14px var(--font-body)",
          textTransform: "uppercase", letterSpacing: ".04em", flexShrink: 0,
        }}>
          {riskLabel}
        </span>
      </div>

      {/* Metrics */}
      <div style={{ display: "flex", gap: 16 }}>
        <div>
          <div style={{ font: "700 18px/24px var(--font-display)", color: "#1565C0" }}>{fmt(spendEur)}</div>
          <div style={{ font: "400 10px/14px var(--font-body)", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".04em" }}>Spend (EUR)</div>
        </div>
        <div style={{ width: 1, background: "#F3F4F6", alignSelf: "stretch" }} />
        <div>
          <div style={{ font: "600 14px/20px var(--font-display)", color: "#374151" }}>{fmtVol(units)}</div>
          <div style={{ font: "400 10px/14px var(--font-body)", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".04em" }}>Units</div>
        </div>
        <div style={{ width: 1, background: "#F3F4F6", alignSelf: "stretch" }} />
        <div>
          <div style={{ font: "600 14px/20px var(--font-display)", color: "#374151" }}>{skus}</div>
          <div style={{ font: "400 10px/14px var(--font-body)", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".04em" }}>SKUs</div>
        </div>
      </div>

      {/* Brief button */}
      <button
        onClick={onGenerateBrief}
        disabled={loadingBrief}
        style={{
          alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6,
          padding: "7px 14px", border: "1px solid #067A46", borderRadius: 8,
          background: loadingBrief ? "#F0FDF4" : "#fff", color: "#067A46",
          font: "500 12px/16px var(--font-body)", cursor: loadingBrief ? "not-allowed" : "pointer",
        }}
      >
        {loadingBrief ? (
          <>
            <span style={{ width: 12, height: 12, border: "2px solid #067A46", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
            Generating…
          </>
        ) : "🤝 Generate Negotiation Brief"}
      </button>

      {brief && (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "12px 14px" }}>
          <ReactMarkdown components={{
            p:      ({ children }) => <p style={{ margin: "0 0 8px", font: "400 12px/18px var(--font-body)", color: "#14532D" }}>{children}</p>,
            ul:     ({ children }) => <ul style={{ margin: "4px 0 8px", paddingLeft: 18 }}>{children}</ul>,
            li:     ({ children }) => <li style={{ font: "400 12px/18px var(--font-body)", color: "#14532D", marginBottom: 3 }}>{children}</li>,
            strong: ({ children }) => <strong style={{ fontWeight: 600, color: "#166534" }}>{children}</strong>,
          }}>
            {brief}
          </ReactMarkdown>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Main shared page ──────────────────────────────────────────────────────────
export default function MarketCategoryPage({
  market, label, flag,
}: {
  market: string;
  label: string;
  flag: string;
}) {
  const [selectedCat, setSelectedCat] = useState("PTN");
  const [year,        setYear]        = useState(2026);
  const [suppliers,   setSuppliers]   = useState<CategorySupplierRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [briefs,      setBriefs]      = useState<Record<string, string>>({});
  const [briefLoad,   setBriefLoad]   = useState<Record<string, boolean>>({});

  const catLabel = CATEGORIES.find(c => c.code === selectedCat)?.label ?? selectedCat;

  const fetchSuppliers = useCallback((cat: string, yr: number) => {
    setLoading(true);
    fetch(`/api/category-suppliers?year=${yr}&category=${cat}&market=${market}`)
      .then(r => r.json() as Promise<CategorySupplierRow[]>)
      .then(setSuppliers)
      .catch(() => setSuppliers([]))
      .finally(() => setLoading(false));
  }, [market]);

  useEffect(() => { fetchSuppliers(selectedCat, year); }, [selectedCat, year, fetchSuppliers]);

  const ranked = useMemo(() =>
    [...suppliers].sort((a, b) => b.spendEur - a.spendEur),
  [suppliers]);

  const totalSpend = useMemo(() => suppliers.reduce((s, r) => s + r.spendEur, 0), [suppliers]);
  const totalUnits = useMemo(() => suppliers.reduce((s, r) => s + r.units, 0), [suppliers]);
  const totalSkus  = useMemo(() => suppliers.reduce((s, r) => s + r.skus, 0), [suppliers]);

  async function generateBrief(supplier: string, spendEur: number) {
    setBriefLoad(p => ({ ...p, [supplier]: true }));
    setBriefs(p => ({ ...p, [supplier]: '' }));
    const question = `Generate negotiation preparation talking points for our upcoming renewal discussion with ${supplier}. They supply ${catLabel} in ${label}. Current spend: €${Math.round(spendEur).toLocaleString()}. Include: (1) Our leverage points, (2) Their leverage points, (3) Recommended opening position, (4) Key risks to flag, (5) Walk-away criteria. Be specific and actionable.`;
    const context  = `Supplier: ${supplier}\nMarket: ${label}\nCategory: ${catLabel}\nSpend: €${Math.round(spendEur).toLocaleString()}\nYear: ${year}`;
    try {
      const res  = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, context }) });
      const data = await res.json();
      setBriefs(p => ({ ...p, [supplier]: data.answer ?? data.error ?? 'No response.' }));
    } catch (err) {
      setBriefs(p => ({ ...p, [supplier]: `⚠️ Network error — ${err instanceof Error ? err.message : 'please try again.'}` }));
    } finally {
      setBriefLoad(p => ({ ...p, [supplier]: false }));
    }
  }

  return (
    <div style={{ background: "#F8F8F8", minHeight: "100vh", padding: "32px 24px", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, font: "400 13px/18px var(--font-body)", color: "#676767" }}>
          <Link href="/" style={{ color: "#676767", textDecoration: "none" }}>Dashboard</Link>
          <span>/</span>
          <Link href="/category" style={{ color: "#676767", textDecoration: "none" }}>Category</Link>
          <span>/</span>
          <span style={{ color: "#242424", fontWeight: 600 }}>{label}</span>
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ font: "700 28px/36px var(--font-display)", color: "#242424", margin: 0 }}>
              {flag} {label} Category Management
            </h1>
            <p style={{ font: "400 14px/20px var(--font-body)", color: "#676767", margin: "6px 0 0" }}>
              Supplier spend overview &amp; negotiation prep
            </p>
          </div>
          <Link href="/category" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            font: "600 13px/18px var(--font-body)", color: "#242424",
            background: "#fff", border: "1px solid #E4E4E4", borderRadius: 8,
            padding: "8px 14px", textDecoration: "none",
          }}>← Back to Category</Link>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ font: "400 11px/14px var(--font-body)", color: "#9CA3AF", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em" }}>Category</div>
            <select
              value={selectedCat}
              onChange={e => setSelectedCat(e.target.value)}
              style={{
                padding: "8px 12px", border: "1.5px solid #067A46", borderRadius: 8, background: "#fff",
                font: "500 13px/18px var(--font-body)", color: "#242424", cursor: "pointer",
              }}
            >
              {CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.label} ({c.code})</option>)}
            </select>
          </div>
          <div>
            <div style={{ font: "400 11px/14px var(--font-body)", color: "#9CA3AF", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em" }}>Year</div>
            <div style={{ display: "flex", border: "1px solid #E4E4E4", borderRadius: 8, overflow: "hidden" }}>
              {YEARS.map(y => (
                <button key={y} onClick={() => setYear(y)} style={{
                  padding: "8px 16px", border: "none", cursor: "pointer",
                  font: "500 13px/18px var(--font-body)",
                  background: year === y ? "#1E3A5F" : "#fff",
                  color:      year === y ? "#fff"    : "#676767",
                  borderRight: y !== YEARS[YEARS.length - 1] ? "1px solid #E4E4E4" : "none",
                }}>
                  {y}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
          <KpiCard label="Total Spend" value={fmt(totalSpend)} sub={`${year} · ${catLabel}`} />
          <KpiCard label="Total Units" value={fmtVol(totalUnits)} />
          <KpiCard label="Active SKUs" value={totalSkus.toLocaleString()} />
          <KpiCard label="Suppliers" value={suppliers.length.toLocaleString()} />
        </div>

        {/* Supplier Performance & Negotiation Prep */}
        <div style={{ background: "#fff", border: "1px solid #E4E4E4", borderRadius: 12, padding: "24px 24px 20px" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ font: "600 16px/22px var(--font-display)", color: "#111827" }}>
              Supplier Performance &amp; Negotiation Prep
            </div>
            <div style={{ font: "400 12px/18px var(--font-body)", color: "#6B7280", marginTop: 4 }}>
              Generate AI-powered negotiation briefs for each supplier using live spend data.
            </div>
          </div>

          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ border: "1px solid #E5E7EB", borderRadius: 12, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ height: 16, width: "60%", background: "#F3F4F6", borderRadius: 4 }} />
                  <div style={{ height: 28, width: "40%", background: "#F3F4F6", borderRadius: 4 }} />
                  <div style={{ height: 30, width: 160, background: "#F3F4F6", borderRadius: 8 }} />
                </div>
              ))}
            </div>
          ) : ranked.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: "#9CA3AF", font: "400 13px/18px var(--font-body)" }}>
              No supplier data for {catLabel} · {label} · {year}.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {ranked.map((s, i) => (
                <SupplierCard
                  key={s.supplier}
                  rank={i + 1}
                  supplier={s.supplier}
                  spendEur={s.spendEur}
                  units={s.units}
                  skus={s.skus}
                  onGenerateBrief={() => generateBrief(s.supplier, s.spendEur)}
                  brief={briefs[s.supplier] ?? ''}
                  loadingBrief={briefLoad[s.supplier] ?? false}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
